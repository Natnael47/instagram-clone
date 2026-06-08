import { isRedisAvailable } from "@config/redis";
import { Comment } from "@models/Comment";
import { Post, type PostDocument } from "@models/Post";
import { User } from "@models/User";
import { NotificationService } from "@services/notification.service";
import { getIO } from "@socket/index";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose, { Types } from "mongoose";
import { ActivityService } from "./activity.service";
import { RedisService } from "./redis.service";

export class PostService {
  static async createPost(
    authorId: string,
    imageUrl: string,
    caption?: string,
  ): Promise<PostDocument> {
    if (!imageUrl) {
      throw ApiError.badRequest("Image is required");
    }

    const post = new Post({
      author: new mongoose.Types.ObjectId(authorId),
      imageUrl,
      caption: caption || "",
      likes: [],
      comments: [],
    });

    await post.save();

    await User.findByIdAndUpdate(authorId, {
      $push: { posts: post._id },
    });

    await post.populate("author", "username fullName profilePicture");

    try {
      const io = getIO();
      const user = await User.findById(authorId).select("followers");
      if (user && user.followers.length > 0) {
        const postObject = post.toObject();
        for (const followerId of user.followers) {
          io.to(`user:${followerId.toString()}`).emit("new-post", {
            authorId,
            post: postObject,
          });
        }
      }
    } catch (socketError) {
      logger.error(socketError, "Failed to emit new-post socket event");
    }

    logger.info({ postId: post._id, authorId }, "New post created");

    // Invalidate feed caches and clear popular posts cache
    if (isRedisAvailable()) {
      Promise.all([
        RedisService.del(`feed:personalized:${authorId}`),
        RedisService.clearByPrefix("feed:global:1"),
        RedisService.clearByPrefix("feed:trending:1"),
        RedisService.del("post:popular"),
      ]).catch((err) =>
        logger.error(
          { err },
          "Failed to invalidate caches after post creation",
        ),
      );
    }

    // Log post creation
    ActivityService.log({
      user: authorId,
      action: "create_post",
      resource: "post",
      resourceId: post._id.toString(),
      details: {
        hasImage: true,
        captionLength: caption?.length || 0,
        hasCaption: !!caption,
      },
    }).catch((err) => logger.error({ err }, "Failed to log post activity"));

    return post;
  }

  static async getPostById(postId: string, userId?: string): Promise<any> {
    // Try to get from Redis cache first
    if (isRedisAvailable()) {
      try {
        const cachedPost = await RedisService.get(`post:${postId}`);
        if (cachedPost) {
          logger.info({ postId }, "Post served from Redis cache");
          const post = JSON.parse(cachedPost);

          // Still need to check like status for current user
          if (userId) {
            (post as any).isLikedByCurrentUser = post.likes?.some(
              (like: any) =>
                like._id?.toString() === userId || like.toString?.() === userId,
            );
          }

          return post;
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to get cached post from Redis");
      }
    }

    const post = await Post.findById(postId)
      .populate("author", "username fullName profilePicture")
      .populate("likes", "username fullName profilePicture");

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const postObject = post.toObject();

    // Get comment count from standalone Comment collection
    const commentCount = await Comment.countDocuments({
      post: new Types.ObjectId(postId),
      parentComment: null,
    });

    (postObject as any).commentCount = commentCount;
    (postObject as any).comments = [];

    if (userId) {
      (postObject as any).isLikedByCurrentUser = post.likes.some(
        (like: any) => like._id.toString() === userId,
      );
    }

    // Cache post in Redis for 15 minutes
    if (isRedisAvailable()) {
      RedisService.set(
        `post:${postId}`,
        JSON.stringify(postObject),
        { ttl: 900 }, // 15 minutes
      ).catch((err) => logger.error({ err }, "Failed to cache post in Redis"));
    }

    // Log post view (only if viewer is not the author)
    if (userId && post.author._id.toString() !== userId) {
      ActivityService.log({
        user: userId,
        action: "view_post",
        resource: "post",
        resourceId: postId,
        details: {
          authorId: post.author._id.toString(),
        },
      }).catch((err) =>
        logger.error({ err }, "Failed to log post view activity"),
      );
    }

    return postObject;
  }

  static async deletePost(postId: string, userId: string): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    if (post.author.toString() !== userId) {
      // Log unauthorized delete attempt
      ActivityService.log({
        user: userId,
        action: "delete_post",
        resource: "post",
        resourceId: postId,
        status: "failure",
        details: {
          reason: "unauthorized",
          postAuthorId: post.author.toString(),
        },
      }).catch((err) => logger.error({ err }, "Failed to log post activity"));

      throw ApiError.forbidden("You can only delete your own posts");
    }

    // Delete all standalone comments for this post
    await Comment.deleteMany({ post: new Types.ObjectId(postId) });

    await User.findByIdAndUpdate(userId, {
      $pull: { posts: new mongoose.Types.ObjectId(postId) },
    });

    await Post.findByIdAndDelete(postId);

    // Invalidate caches
    if (isRedisAvailable()) {
      Promise.all([
        RedisService.del(`post:${postId}`),
        RedisService.del(`feed:personalized:${userId}`),
        RedisService.clearByPrefix("feed:global:1"),
        RedisService.clearByPrefix("feed:trending:1"),
        RedisService.del("post:popular"),
      ]).catch((err) =>
        logger.error(
          { err },
          "Failed to invalidate caches after post deletion",
        ),
      );
    }

    logger.info({ postId, userId }, "Post deleted");

    // Log successful post deletion
    ActivityService.log({
      user: userId,
      action: "delete_post",
      resource: "post",
      resourceId: postId,
      status: "success",
    }).catch((err) => logger.error({ err }, "Failed to log post activity"));
  }

  static async likePost(postId: string, userId: string): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    if (post.likes.some((like) => like.toString() === userId)) {
      throw ApiError.badRequest("Post already liked");
    }

    await Post.findByIdAndUpdate(postId, {
      $addToSet: { likes: new mongoose.Types.ObjectId(userId) },
    });

    await NotificationService.createLikeNotification(
      post.author._id.toString(),
      userId,
      postId,
    );

    try {
      const io = getIO();
      const postAuthorId = post.author.toString();
      if (postAuthorId !== userId) {
        io.to(`user:${postAuthorId}`).emit("post-liked", {
          likerId: userId,
          postId,
        });
      }
    } catch (socketError) {
      logger.error(socketError, "Failed to emit post-liked socket event");
    }

    // Invalidate post cache (like count changed)
    if (isRedisAvailable()) {
      RedisService.del(`post:${postId}`).catch((err) =>
        logger.error({ err }, "Failed to invalidate post cache after like"),
      );
    }

    logger.info({ postId, userId }, "Post liked");

    // Log post like
    ActivityService.log({
      user: userId,
      action: "like_post",
      resource: "post",
      resourceId: postId,
      details: {
        postAuthorId: post.author.toString(),
      },
    }).catch((err) => logger.error({ err }, "Failed to log post activity"));
  }

  static async unlikePost(postId: string, userId: string): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const wasLiked = post.likes.some((like) => like.toString() === userId);

    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: new mongoose.Types.ObjectId(userId) },
    });

    // Invalidate post cache (like count changed)
    if (isRedisAvailable() && wasLiked) {
      RedisService.del(`post:${postId}`).catch((err) =>
        logger.error({ err }, "Failed to invalidate post cache after unlike"),
      );
    }

    logger.info({ postId, userId }, "Post unliked");

    // Log post unlike (only if it was actually liked)
    if (wasLiked) {
      ActivityService.log({
        user: userId,
        action: "unlike_post",
        resource: "post",
        resourceId: postId,
        details: {
          postAuthorId: post.author.toString(),
        },
      }).catch((err) => logger.error({ err }, "Failed to log post activity"));
    }
  }

  static async addComment(
    postId: string,
    userId: string,
    text: string,
  ): Promise<any> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const comment = await Comment.create({
      text,
      author: new Types.ObjectId(userId),
      post: new Types.ObjectId(postId),
      likes: [],
      isEdited: false,
    });

    await comment.populate("author", "username fullName profilePicture");

    await NotificationService.createCommentNotification(
      post.author._id.toString(),
      userId,
      postId,
      comment._id.toString(),
    );

    try {
      const io = getIO();
      const postAuthorId = post.author.toString();
      if (postAuthorId !== userId) {
        io.to(`user:${postAuthorId}`).emit("post-commented", {
          commenterId: userId,
          postId,
          commentId: comment._id.toString(),
        });
      }
    } catch (socketError) {
      logger.error(socketError, "Failed to emit post-commented socket event");
    }

    logger.info(
      { commentId: comment._id, postId, userId },
      "Comment added to post",
    );

    // Log comment on post
    ActivityService.log({
      user: userId,
      action: "create_comment",
      resource: "post",
      resourceId: postId,
      details: {
        commentId: comment._id.toString(),
        textLength: text.length,
        postAuthorId: post.author.toString(),
      },
    }).catch((err) => logger.error({ err }, "Failed to log post activity"));

    return comment;
  }

  static async deleteComment(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    if (
      comment.author.toString() !== userId &&
      post.author.toString() !== userId
    ) {
      // Log unauthorized comment deletion
      ActivityService.log({
        user: userId,
        action: "delete_comment",
        resource: "post",
        resourceId: postId,
        status: "failure",
        details: {
          reason: "unauthorized",
          commentId,
        },
      }).catch((err) => logger.error({ err }, "Failed to log post activity"));

      throw ApiError.forbidden("You can only delete your own comments");
    }

    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();

    logger.info({ postId, commentId, userId }, "Comment deleted from post");

    // Log comment deletion
    ActivityService.log({
      user: userId,
      action: "delete_comment",
      resource: "post",
      resourceId: postId,
      status: "success",
      details: {
        commentId,
      },
    }).catch((err) => logger.error({ err }, "Failed to log post activity"));
  }

  static async getUserPosts(
    userId: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const [posts, total] = await Promise.all([
      Post.find({ author: new mongoose.Types.ObjectId(userId) })
        .populate("author", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Post.countDocuments({ author: new mongoose.Types.ObjectId(userId) }),
    ]);

    return formatPaginatedResult(posts, pageNum, limitNum, total);
  }

  static async updatePostCaption(
    postId: string,
    userId: string,
    caption: string,
  ): Promise<PostDocument> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    if (post.author.toString() !== userId) {
      // Log unauthorized update attempt
      ActivityService.log({
        user: userId,
        action: "update_post",
        resource: "post",
        resourceId: postId,
        status: "failure",
        details: {
          reason: "unauthorized",
          postAuthorId: post.author.toString(),
        },
      }).catch((err) => logger.error({ err }, "Failed to log post activity"));

      throw ApiError.forbidden("You can only edit your own posts");
    }

    const oldCaption = post.caption;
    post.caption = caption;
    await post.save();

    await post.populate("author", "username fullName profilePicture");

    // Invalidate post cache
    if (isRedisAvailable()) {
      RedisService.del(`post:${postId}`).catch((err) =>
        logger.error({ err }, "Failed to invalidate post cache after update"),
      );
    }

    logger.info({ postId, userId }, "Post caption updated");

    // Log caption update
    ActivityService.log({
      user: userId,
      action: "update_post",
      resource: "post",
      resourceId: postId,
      status: "success",
      details: {
        updatedField: "caption",
        oldCaptionLength: oldCaption?.length || 0,
        newCaptionLength: caption.length,
      },
    }).catch((err) => logger.error({ err }, "Failed to log post activity"));

    return post;
  }

  static async getPersonalizedFeed(
    userId: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const followingIds = user.following.map((id) => id.toString());

    if (followingIds.length === 0) {
      return formatPaginatedResult([], pageNum, limitNum, 0);
    }

    const filter = {
      author: {
        $in: followingIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    };

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate("author", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Post.countDocuments(filter),
    ]);

    logger.info({ userId, total }, "Personalized feed retrieved");

    return formatPaginatedResult(posts, pageNum, limitNum, total);
  }
  /**
   * Get popular posts (cached in Redis for 15 minutes)
   * Popular posts are determined by likes count
   */
  static async getPopularPosts(limit: number = 10): Promise<any[]> {
    // Try to get from Redis cache first
    if (isRedisAvailable()) {
      try {
        const cached = await RedisService.get("post:popular");
        if (cached) {
          logger.info("Popular posts served from Redis cache");
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to get cached popular posts from Redis",
        );
      }
    }

    // Get posts sorted by likes count
    const posts = await Post.find({})
      .populate("author", "username fullName profilePicture")
      .populate("likes", "username fullName profilePicture")
      .sort({ likes: -1 })
      .limit(limit)
      .lean();

    // Cache in Redis for 15 minutes
    if (isRedisAvailable()) {
      RedisService.set(
        "post:popular",
        JSON.stringify(posts),
        { ttl: 900 }, // 15 minutes
      ).catch((err) =>
        logger.error({ err }, "Failed to cache popular posts in Redis"),
      );
    }

    return posts;
  }
}
