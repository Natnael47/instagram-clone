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

    // Log post creation
    ActivityService.log({
      user: authorId,
      action: 'create_post',
      resource: 'post',
      resourceId: post._id.toString(),
      details: {
        hasImage: true,
        captionLength: caption?.length || 0,
        hasCaption: !!caption
      }
    }).catch(err => logger.error({ err }, 'Failed to log post activity'));

    return post;
  }

  static async getPostById(postId: string, userId?: string): Promise<any> {
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

    // Log post view (only if viewer is not the author)
    if (userId && post.author._id.toString() !== userId) {
      ActivityService.log({
        user: userId,
        action: 'view_post',
        resource: 'post',
        resourceId: postId,
        details: {
          authorId: post.author._id.toString()
        }
      }).catch(err => logger.error({ err }, 'Failed to log post view activity'));
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
        action: 'delete_post',
        resource: 'post',
        resourceId: postId,
        status: 'failure',
        details: {
          reason: 'unauthorized',
          postAuthorId: post.author.toString()
        }
      }).catch(err => logger.error({ err }, 'Failed to log post activity'));
      
      throw ApiError.forbidden("You can only delete your own posts");
    }

    // Delete all standalone comments for this post
    await Comment.deleteMany({ post: new Types.ObjectId(postId) });

    await User.findByIdAndUpdate(userId, {
      $pull: { posts: new mongoose.Types.ObjectId(postId) },
    });

    await Post.findByIdAndDelete(postId);

    logger.info({ postId, userId }, "Post deleted");

    // Log successful post deletion
    ActivityService.log({
      user: userId,
      action: 'delete_post',
      resource: 'post',
      resourceId: postId,
      status: 'success'
    }).catch(err => logger.error({ err }, 'Failed to log post activity'));
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

    logger.info({ postId, userId }, "Post liked");

    // Log post like
    ActivityService.log({
      user: userId,
      action: 'like_post',
      resource: 'post',
      resourceId: postId,
      details: {
        postAuthorId: post.author.toString()
      }
    }).catch(err => logger.error({ err }, 'Failed to log post activity'));
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

    logger.info({ postId, userId }, "Post unliked");

    // Log post unlike (only if it was actually liked)
    if (wasLiked) {
      ActivityService.log({
        user: userId,
        action: 'unlike_post',
        resource: 'post',
        resourceId: postId,
        details: {
          postAuthorId: post.author.toString()
        }
      }).catch(err => logger.error({ err }, 'Failed to log post activity'));
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
      action: 'create_comment',
      resource: 'post',
      resourceId: postId,
      details: {
        commentId: comment._id.toString(),
        textLength: text.length,
        postAuthorId: post.author.toString()
      }
    }).catch(err => logger.error({ err }, 'Failed to log post activity'));

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
        action: 'delete_comment',
        resource: 'post',
        resourceId: postId,
        status: 'failure',
        details: {
          reason: 'unauthorized',
          commentId
        }
      }).catch(err => logger.error({ err }, 'Failed to log post activity'));
      
      throw ApiError.forbidden("You can only delete your own comments");
    }

    await Comment.deleteMany({ parentComment: comment._id });
    await comment.deleteOne();

    logger.info({ postId, commentId, userId }, "Comment deleted from post");

    // Log comment deletion
    ActivityService.log({
      user: userId,
      action: 'delete_comment',
      resource: 'post',
      resourceId: postId,
      status: 'success',
      details: {
        commentId
      }
    }).catch(err => logger.error({ err }, 'Failed to log post activity'));
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
        action: 'update_post',
        resource: 'post',
        resourceId: postId,
        status: 'failure',
        details: {
          reason: 'unauthorized',
          postAuthorId: post.author.toString()
        }
      }).catch(err => logger.error({ err }, 'Failed to log post activity'));
      
      throw ApiError.forbidden("You can only edit your own posts");
    }

    const oldCaption = post.caption;
    post.caption = caption;
    await post.save();

    await post.populate("author", "username fullName profilePicture");

    logger.info({ postId, userId }, "Post caption updated");

    // Log caption update
    ActivityService.log({
      user: userId,
      action: 'update_post',
      resource: 'post',
      resourceId: postId,
      status: 'success',
      details: {
        updatedField: 'caption',
        oldCaptionLength: oldCaption?.length || 0,
        newCaptionLength: caption.length
      }
    }).catch(err => logger.error({ err }, 'Failed to log post activity'));

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
}