import { Post } from "@models/Post";
import { User } from "@models/User";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose from "mongoose";

/**
 * Feed Service
 * Handles personalized and global feed generation
 */
export class FeedService {
  /**
   * Get personalized feed for a user
   * Shows posts from users that the current user follows
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
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    // Get current user to find who they follow
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw ApiError.notFound("User not found");
    }

    // Get IDs of users that current user follows
    const followingIds = currentUser.following.map((id) => id.toString());

    // If user doesn't follow anyone, return empty feed
    if (followingIds.length === 0) {
      return formatPaginatedResult([], pageNum, limitNum, 0);
    }

    // Convert following IDs to ObjectId array
    const followingObjectIds = followingIds.map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    // Query posts from followed users
    const [posts, total] = await Promise.all([
      Post.find({ author: { $in: followingObjectIds } })
        .populate("author", "username fullName profilePicture")
        .populate("likes", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Post.countDocuments({ author: { $in: followingObjectIds } }),
    ]);

    // Add like status for current user
    const postsWithLikeStatus = posts.map((post) => {
      const postObject = post.toObject();
      (postObject as any).isLikedByCurrentUser = post.likes.some(
        (like: any) => like._id.toString() === userId,
      );
      return postObject;
    });

    logger.info(
      { userId, followingCount: followingIds.length, total },
      "Personalized feed generated",
    );

    return formatPaginatedResult(postsWithLikeStatus, pageNum, limitNum, total);
  }

  /**
   * Get global feed (all posts)
   * Shows posts from all users, sorted by newest first
   * @param userId - Current user ID (for like status)
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated global feed posts
   */
  static async getGlobalFeed(
    userId?: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    // Query all posts
    const [posts, total] = await Promise.all([
      Post.find({})
        .populate("author", "username fullName profilePicture")
        .populate("likes", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Post.countDocuments({}),
    ]);

    // Add like status for current user if provided
    let postsWithStatus = posts.map((post) => post.toObject());

    if (userId) {
      postsWithStatus = posts.map((post) => {
        const postObject = post.toObject();
        (postObject as any).isLikedByCurrentUser = post.likes.some(
          (like: any) => like._id.toString() === userId,
        );
        return postObject;
      });
    }

    logger.info({ total, page: pageNum }, "Global feed generated");

    return formatPaginatedResult(postsWithStatus, pageNum, limitNum, total);
  }

  /**
   * Get feed by specific user IDs
   * @param userIds - Array of user IDs to get posts from
   * @param currentUserId - Current user ID (for like status)
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated feed posts
   */
  static async getFeedByUserIds(
    userIds: string[],
    currentUserId?: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    if (userIds.length === 0) {
      return formatPaginatedResult([], pageNum, limitNum, 0);
    }

    const userObjectIds = userIds.map((id) => new mongoose.Types.ObjectId(id));

    const [posts, total] = await Promise.all([
      Post.find({ author: { $in: userObjectIds } })
        .populate("author", "username fullName profilePicture")
        .populate("likes", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Post.countDocuments({ author: { $in: userObjectIds } }),
    ]);

    // Add like status for current user if provided
    let postsWithStatus = posts.map((post) => post.toObject());

    if (currentUserId) {
      postsWithStatus = posts.map((post) => {
        const postObject = post.toObject();
        (postObject as any).isLikedByCurrentUser = post.likes.some(
          (like: any) => like._id.toString() === currentUserId,
        );
        return postObject;
      });
    }

    return formatPaginatedResult(postsWithStatus, pageNum, limitNum, total);
  }
}
