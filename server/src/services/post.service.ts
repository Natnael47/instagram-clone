import { Post, type IComment, type PostDocument } from "@models/Post";
import { User } from "@models/User";
import { getIO } from "@socket/index";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose from "mongoose";

export class PostService {
  static async createPost(
    authorId: string,
    imageUrl: string,
    caption?: string,
  ): Promise<PostDocument> {
    if (!imageUrl) {
      throw ApiError.badRequest("Image is required");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = new Post({
        author: new mongoose.Types.ObjectId(authorId),
        imageUrl,
        caption: caption || "",
        likes: [],
        comments: [],
      });

      await post.save({ session });

      await User.findByIdAndUpdate(
        authorId,
        { $push: { posts: post._id } },
        { session },
      );

      await session.commitTransaction();

      await post.populate("author", "username fullName profilePicture");

      // Socket: Notify followers about new post
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

      return post;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  static async getPostById(postId: string, userId?: string): Promise<any> {
    const post = await Post.findById(postId)
      .populate("author", "username fullName profilePicture")
      .populate("likes", "username fullName profilePicture");

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const postObject = post.toObject();

    if (userId) {
      (postObject as any).isLikedByCurrentUser = post.likes.some(
        (like: any) => like._id.toString() === userId,
      );
    }

    return postObject;
  }

  static async deletePost(postId: string, userId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw ApiError.notFound("Post not found");
      }

      if (post.author.toString() !== userId) {
        throw ApiError.forbidden("You can only delete your own posts");
      }

      await User.findByIdAndUpdate(
        userId,
        { $pull: { posts: new mongoose.Types.ObjectId(postId) } },
        { session },
      );

      await Post.findByIdAndDelete(postId, { session });

      await session.commitTransaction();

      logger.info({ postId, userId }, "Post deleted");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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

    // Socket: Notify post author about like
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
  }

  static async unlikePost(postId: string, userId: string): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    await Post.findByIdAndUpdate(postId, {
      $pull: { likes: new mongoose.Types.ObjectId(userId) },
    });

    logger.info({ postId, userId }, "Post unliked");
  }

  static async addComment(
    postId: string,
    userId: string,
    text: string,
  ): Promise<IComment> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const comment: IComment = {
      user: new mongoose.Types.ObjectId(userId) as any,
      text,
      createdAt: new Date(),
    };

    post.comments.push(comment);
    await post.save();

    await post.populate("comments.user", "username fullName profilePicture");

    const addedComment = post.comments[post.comments.length - 1];
    if (!addedComment) {
      throw new Error("Failed to add comment");
    }

    // Socket: Notify post author about comment
    try {
      const io = getIO();
      const postAuthorId = post.author.toString();
      if (postAuthorId !== userId) {
        io.to(`user:${postAuthorId}`).emit("post-commented", {
          commenterId: userId,
          postId,
          commentId: (addedComment as any)._id?.toString(),
        });
      }
    } catch (socketError) {
      logger.error(socketError, "Failed to emit post-commented socket event");
    }

    logger.info({ postId, userId }, "Comment added to post");

    return addedComment;
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

    const comment = (post.comments as any).id(commentId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    if (
      comment.user.toString() !== userId &&
      post.author.toString() !== userId
    ) {
      throw ApiError.forbidden("You can only delete your own comments");
    }

    comment.deleteOne();
    await post.save();

    logger.info({ postId, commentId, userId }, "Comment deleted from post");
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
      throw ApiError.forbidden("You can only edit your own posts");
    }

    post.caption = caption;
    await post.save();

    await post.populate("author", "username fullName profilePicture");

    logger.info({ postId, userId }, "Post caption updated");

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
