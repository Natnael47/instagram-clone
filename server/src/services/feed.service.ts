import { isRedisAvailable } from "@config/redis";
import { Post } from "@models/Post";
import { User } from "@models/User";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose from "mongoose";
import { ActivityService } from "./activity.service";
import { RedisService } from "./redis.service";

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

    // Try to get from Redis cache first (only for first page)
    if (pageNum === 1 && isRedisAvailable()) {
      try {
        const cachedFeed = await RedisService.get(
          `feed:personalized:${userId}`,
        );
        if (cachedFeed) {
          logger.info({ userId }, "Personalized feed served from Redis cache");
          return JSON.parse(cachedFeed);
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to get cached feed from Redis");
      }
    }

    // Get current user to find who they follow
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw ApiError.notFound("User not found");
    }

    // Get IDs of users that current user follows
    const followingIds = currentUser.following.map((id) => id.toString());

    // If user doesn't follow anyone, return empty feed
    if (followingIds.length === 0) {
      ActivityService.log({
        user: userId,
        action: "refresh_feed",
        resource: "post",
        details: {
          feedType: "personalized",
          followingCount: 0,
          totalPosts: 0,
          page: pageNum,
        },
      }).catch((err) => logger.error({ err }, "Failed to log feed activity"));

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

    const result = formatPaginatedResult(
      postsWithLikeStatus,
      pageNum,
      limitNum,
      total,
    );

    logger.info(
      { userId, followingCount: followingIds.length, total },
      "Personalized feed generated",
    );

    // Cache first page in Redis for 5 minutes
    if (pageNum === 1 && isRedisAvailable()) {
      RedisService.set(
        `feed:personalized:${userId}`,
        JSON.stringify(result),
        { ttl: 300 }, // 5 minutes
      ).catch((err) => logger.error({ err }, "Failed to cache feed in Redis"));
    }

    // Log feed refresh
    ActivityService.log({
      user: userId,
      action: "refresh_feed",
      resource: "post",
      details: {
        feedType: "personalized",
        followingCount: followingIds.length,
        totalPosts: total,
        postsReturned: posts.length,
        page: pageNum,
      },
    }).catch((err) => logger.error({ err }, "Failed to log feed activity"));

    return result;
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

    // Try to get from Redis cache first (only for first page)
    const cacheKey = `feed:global:${pageNum}:${limitNum}`;
    if (pageNum === 1 && isRedisAvailable()) {
      try {
        const cachedFeed = await RedisService.get(cacheKey);
        if (cachedFeed) {
          logger.info("Global feed served from Redis cache");
          return JSON.parse(cachedFeed);
        }
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to get cached global feed from Redis",
        );
      }
    }

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

    const result = formatPaginatedResult(
      postsWithStatus,
      pageNum,
      limitNum,
      total,
    );

    logger.info({ total, page: pageNum }, "Global feed generated");

    // Cache first page in Redis for 5 minutes
    if (pageNum === 1 && isRedisAvailable()) {
      RedisService.set(cacheKey, JSON.stringify(result), { ttl: 300 }).catch(
        (err) => logger.error({ err }, "Failed to cache global feed in Redis"),
      );
    }

    // Log global feed refresh
    if (userId) {
      ActivityService.log({
        user: userId,
        action: "explore_content",
        resource: "post",
        details: {
          feedType: "global",
          totalPosts: total,
          postsReturned: posts.length,
          page: pageNum,
        },
      }).catch((err) => logger.error({ err }, "Failed to log feed activity"));
    }

    return result;
  }

  /**
   * Get trending feed
   * Shows popular posts based on engagement (likes, comments)
   * @param userId - Current user ID (for like status)
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated trending posts
   */
  static async getTrendingFeed(
    userId?: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    // Try to get from Redis cache first (only for first page)
    const cacheKey = `feed:trending:${pageNum}:${limitNum}`;
    if (pageNum === 1 && isRedisAvailable()) {
      try {
        const cachedFeed = await RedisService.get(cacheKey);
        if (cachedFeed) {
          logger.info("Trending feed served from Redis cache");
          return JSON.parse(cachedFeed);
        }
      } catch (error) {
        logger.error(
          { err: error },
          "Failed to get cached trending feed from Redis",
        );
      }
    }

    // Get posts sorted by engagement (likes + comments)
    const [posts, total] = await Promise.all([
      Post.find({})
        .populate("author", "username fullName profilePicture")
        .populate("likes", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Post.countDocuments({}),
    ]);

    // Sort by engagement (likes count) for trending
    const sortedPosts = posts.sort((a, b) => b.likes.length - a.likes.length);

    // Add like status for current user if provided
    let postsWithStatus = sortedPosts.map((post) => post.toObject());

    if (userId) {
      postsWithStatus = sortedPosts.map((post) => {
        const postObject = post.toObject();
        (postObject as any).isLikedByCurrentUser = post.likes.some(
          (like: any) => like._id.toString() === userId,
        );
        return postObject;
      });
    }

    const result = formatPaginatedResult(
      postsWithStatus,
      pageNum,
      limitNum,
      total,
    );

    logger.info({ total, page: pageNum }, "Trending feed generated");

    // Cache first page in Redis for 5 minutes
    if (pageNum === 1 && isRedisAvailable()) {
      RedisService.set(cacheKey, JSON.stringify(result), { ttl: 300 }).catch(
        (err) =>
          logger.error({ err }, "Failed to cache trending feed in Redis"),
      );
    }

    // Log trending feed refresh
    if (userId) {
      ActivityService.log({
        user: userId,
        action: "explore_content",
        resource: "post",
        details: {
          feedType: "trending",
          totalPosts: total,
          postsReturned: posts.length,
          page: pageNum,
        },
      }).catch((err) => logger.error({ err }, "Failed to log feed activity"));
    }

    return result;
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

    // Log custom feed by user IDs
    if (currentUserId) {
      ActivityService.log({
        user: currentUserId,
        action: "explore_content",
        resource: "user",
        details: {
          feedType: "by-users",
          requestedUserCount: userIds.length,
          totalPosts: total,
          postsReturned: posts.length,
          page: pageNum,
        },
      }).catch((err) => logger.error({ err }, "Failed to log feed activity"));
    }

    return formatPaginatedResult(postsWithStatus, pageNum, limitNum, total);
  }

  /**
   * Invalidate feed caches when new posts are created
   * Should be called after post creation, like, or comment
   */
  static async invalidateFeedCache(userId?: string): Promise<void> {
    if (!isRedisAvailable()) return;

    try {
      if (userId) {
        // Clear user's personalized feed cache
        await RedisService.del(`feed:personalized:${userId}`);
      }

      // Clear global feed caches (first page only)
      await RedisService.clearByPrefix("feed:global:1");
      await RedisService.clearByPrefix("feed:trending:1");

      logger.info({ userId }, "Feed caches invalidated");
    } catch (error) {
      logger.error({ err: error }, "Failed to invalidate feed caches");
    }
  }
}
