import { Post, type IComment, type PostDocument } from "@models/Post";
import { User } from "@models/User";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose from "mongoose";

/**
 * Post Service
 * Handles post creation, retrieval, deletion, and likes
 */
export class PostService {
  /**
   * Create a new post
   * @param authorId - ID of post author
   * @param imageUrl - URL of uploaded image
   * @param caption - Post caption
   * @returns Created post
   */
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
      // Create post using new Post() instead of Post.create()
      const post = new Post({
        author: new mongoose.Types.ObjectId(authorId),
        imageUrl,
        caption: caption || "",
        likes: [],
        comments: [],
      });

      await post.save({ session });

      // Add post to user's posts array
      await User.findByIdAndUpdate(
        authorId,
        { $push: { posts: post._id } },
        { session },
      );

      await session.commitTransaction();

      // Populate author details
      await post.populate("author", "username fullName profilePicture");

      logger.info({ postId: post._id, authorId }, "New post created");

      return post;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Get a single post by ID
   * @param postId - Post ID
   * @returns Post with populated author and like status
   */
  static async getPostById(postId: string, userId?: string): Promise<any> {
    const post = await Post.findById(postId)
      .populate("author", "username fullName profilePicture")
      .populate("likes", "username fullName profilePicture");

    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    const postObject = post.toObject();

    // Add like status for current user
    if (userId) {
      (postObject as any).isLikedByCurrentUser = post.likes.some(
        (like: any) => like._id.toString() === userId,
      );
    }

    return postObject;
  }

  /**
   * Delete a post
   * @param postId - Post ID
   * @param userId - ID of user attempting to delete
   */
  static async deletePost(postId: string, userId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const post = await Post.findById(postId);
      if (!post) {
        throw ApiError.notFound("Post not found");
      }

      // Check ownership
      if (post.author.toString() !== userId) {
        throw ApiError.forbidden("You can only delete your own posts");
      }

      // Remove post from user's posts array
      await User.findByIdAndUpdate(
        userId,
        { $pull: { posts: new mongoose.Types.ObjectId(postId) } },
        { session },
      );

      // Delete post
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

  /**
   * Like a post
   * @param postId - Post ID
   * @param userId - ID of user liking the post
   */
  static async likePost(postId: string, userId: string): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    // Check if already liked
    if (post.likes.some((like) => like.toString() === userId)) {
      throw ApiError.badRequest("Post already liked");
    }

    await Post.findByIdAndUpdate(postId, {
      $addToSet: { likes: new mongoose.Types.ObjectId(userId) },
    });

    logger.info({ postId, userId }, "Post liked");
  }

  /**
   * Unlike a post
   * @param postId - Post ID
   * @param userId - ID of user unliking the post
   */
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

  /**
   * Add a comment to a post
   * @param postId - Post ID
   * @param userId - ID of user commenting
   * @param text - Comment text
   * @returns Created comment
   */
  static async addComment(
    postId: string,
    userId: string,
    text: string,
  ): Promise<IComment> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    // Create comment object with proper ObjectId
    const comment: IComment = {
      user: new mongoose.Types.ObjectId(userId) as any,
      text,
      createdAt: new Date(),
    };

    post.comments.push(comment);
    await post.save();

    await post.populate("comments.user", "username fullName profilePicture");

    logger.info({ postId, userId }, "Comment added to post");

    // Return the newly added comment
    const addedComment = post.comments[post.comments.length - 1];
    if (!addedComment) {
      throw new Error("Failed to add comment");
    }
    return addedComment;
  }

  /**
   * Delete a comment from a post
   * @param postId - Post ID
   * @param commentId - Comment ID
   * @param userId - ID of user attempting to delete
   */
  static async deleteComment(
    postId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    // Find the comment using mongoose subdocument id method with type assertion
    const comment = (post.comments as any).id(commentId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    // Check if user is comment author or post owner
    if (
      comment.user.toString() !== userId &&
      post.author.toString() !== userId
    ) {
      throw ApiError.forbidden("You can only delete your own comments");
    }

    // Remove comment using deleteOne method
    comment.deleteOne();
    await post.save();

    logger.info({ postId, commentId, userId }, "Comment deleted from post");
  }

  /**
   * Get user's posts
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated user posts
   */
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

  /**
   * Update post caption
   * @param postId - Post ID
   * @param userId - ID of user attempting to update
   * @param caption - New caption
   * @returns Updated post
   */
  static async updatePostCaption(
    postId: string,
    userId: string,
    caption: string,
  ): Promise<PostDocument> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    // Check ownership
    if (post.author.toString() !== userId) {
      throw ApiError.forbidden("You can only edit your own posts");
    }

    post.caption = caption;
    await post.save();

    await post.populate("author", "username fullName profilePicture");

    logger.info({ postId, userId }, "Post caption updated");

    return post;
  }

  /**
   * Get personalized feed for a user (posts from followed users)
   * @param userId - Current user ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated feed posts
   */
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
