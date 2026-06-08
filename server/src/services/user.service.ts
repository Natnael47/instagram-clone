import { User } from "@models/User";
import { NotificationService } from "@services/notification.service";
import { getIO } from "@socket/index";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose from "mongoose";
import { ActivityService } from "./activity.service";
import { RedisService } from "./redis.service";
import { isRedisAvailable } from "@config/redis";

export class UserService {
  static async getUserProfile(
  userId: string,
  currentUserId?: string,
): Promise<any> {
  // Try to get from Redis cache first
  if (isRedisAvailable()) {
    try {
      const cachedProfile = await RedisService.get(`user:profile:${userId}`);
      if (cachedProfile) {
        logger.info({ userId }, "User profile served from Redis cache");
        const profile = JSON.parse(cachedProfile);
        
        // Still need to check follow status if current user is different
        if (currentUserId && currentUserId !== userId) {
          const currentUser = await User.findById(currentUserId);
          if (currentUser) {
            const isFollowed = currentUser.following.some(
              (followingId) => followingId.toString() === userId,
            );
            (profile as any).isFollowedByCurrentUser = isFollowed;
          }
        }
        
        return profile;
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to get cached user profile from Redis");
    }
  }

  const user = await User.findById(userId)
    .select("-password")
    .populate("followers", "username fullName profilePicture")
    .populate("following", "username fullName profilePicture");

  if (!user) {
    throw ApiError.notFound("User not found");
  }

  const userObject = user.toObject();

  if (currentUserId && currentUserId !== userId) {
    const currentUser = await User.findById(currentUserId);
    if (currentUser) {
      const isFollowed = currentUser.following.some(
        (followingId) => followingId.toString() === userId,
      );
      (userObject as any).isFollowedByCurrentUser = isFollowed;
    }

    // Log profile view (only when viewing other users' profiles)
    ActivityService.log({
      user: currentUserId,
      action: 'view_profile',
      resource: 'user',
      resourceId: userId,
      details: {
        viewedUser: userId
      }
    }).catch(err => logger.error({ err }, 'Failed to log profile view activity'));
  }

  // Cache user profile in Redis for 10 minutes
  if (isRedisAvailable()) {
    // Don't cache the isFollowedByCurrentUser field (it's user-specific)
    const profileToCache = { ...userObject };
    delete (profileToCache as any).isFollowedByCurrentUser;
    
    RedisService.set(
      `user:profile:${userId}`,
      JSON.stringify(profileToCache),
      { ttl: 600 } // 10 minutes
    ).catch(err => logger.error({ err }, "Failed to cache user profile in Redis"));
  }

  return userObject;
}

  static async followUser(
  followerId: string,
  targetUserId: string,
): Promise<void> {
  if (followerId === targetUserId) {
    throw ApiError.badRequest("You cannot follow yourself");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw ApiError.notFound("User to follow not found");
  }

  const follower = await User.findById(followerId);
  if (!follower) {
    throw ApiError.notFound("Follower not found");
  }

  if (follower.following.some((id) => id.toString() === targetUserId)) {
    throw ApiError.badRequest("Already following this user");
  }

  await User.findByIdAndUpdate(followerId, {
    $addToSet: { following: new mongoose.Types.ObjectId(targetUserId) },
  });

  await User.findByIdAndUpdate(targetUserId, {
    $addToSet: { followers: new mongoose.Types.ObjectId(followerId) },
  });

  // Invalidate cached user profiles
  if (isRedisAvailable()) {
    await Promise.all([
      RedisService.del(`user:profile:${followerId}`),
      RedisService.del(`user:profile:${targetUserId}`),
    ]).catch(err => logger.error({ err }, "Failed to invalidate user profile cache"));
  }

  // Create notification
  await NotificationService.createFollowNotification(
    targetUserId,
    followerId,
  );

  // Socket notification
  try {
    const io = getIO();
    io.to(`user:${targetUserId}`).emit("new-follower", { followerId });
  } catch (socketError) {
    logger.error(socketError, "Failed to emit new-follower socket event");
  }

  logger.info(
    { followerId, targetUserId },
    "User started following another user",
  );

  // Log follow action
  ActivityService.log({
    user: followerId,
    action: 'follow',
    resource: 'user',
    resourceId: targetUserId,
    details: {
      followedUser: targetUserId
    }
  }).catch(err => logger.error({ err }, 'Failed to log follow activity'));
}

  static async unfollowUser(
  followerId: string,
  targetUserId: string,
): Promise<void> {
  if (followerId === targetUserId) {
    throw ApiError.badRequest("You cannot unfollow yourself");
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw ApiError.notFound("User to unfollow not found");
  }

  const follower = await User.findById(followerId);
  if (!follower) {
    throw ApiError.notFound("Follower not found");
  }

  // Check if actually following before unfollowing
  const wasFollowing = follower.following.some(
    (id) => id.toString() === targetUserId
  );

  await User.findByIdAndUpdate(followerId, {
    $pull: { following: new mongoose.Types.ObjectId(targetUserId) },
  });

  await User.findByIdAndUpdate(targetUserId, {
    $pull: { followers: new mongoose.Types.ObjectId(followerId) },
  });

  // Invalidate cached user profiles
  if (isRedisAvailable()) {
    await Promise.all([
      RedisService.del(`user:profile:${followerId}`),
      RedisService.del(`user:profile:${targetUserId}`),
    ]).catch(err => logger.error({ err }, "Failed to invalidate user profile cache"));
  }

  logger.info({ followerId, targetUserId }, "User unfollowed another user");

  // Log unfollow action (only if they were actually following)
  if (wasFollowing) {
    ActivityService.log({
      user: followerId,
      action: 'unfollow',
      resource: 'user',
      resourceId: targetUserId,
      details: {
        unfollowedUser: targetUserId
      }
    }).catch(err => logger.error({ err }, 'Failed to log unfollow activity'));
  }
}

  static async searchUsers(
    query: string,
    page?: string | number,
    limit?: string | number,
    currentUserId?: string,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const searchRegex = new RegExp(query, "i");

    const filter = {
      $or: [{ username: searchRegex }, { fullName: searchRegex }],
    };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("username fullName profilePicture bio")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      User.countDocuments(filter),
    ]);

    logger.info(
      { query, page: pageNum, limit: limitNum, total },
      "Users searched",
    );

    // Log search action
    if (currentUserId) {
      ActivityService.log({
        user: currentUserId,
        action: 'search',
        resource: 'user',
        details: {
          searchQuery: query,
          resultsCount: total,
          page: pageNum
        }
      }).catch(err => logger.error({ err }, 'Failed to log search activity'));
    }

    return formatPaginatedResult(users, pageNum, limitNum, total);
  }

  static async getFollowers(
    userId: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const followerIds = user.followers.map((id) => id.toString());

    const [followers, total] = await Promise.all([
      User.find({ _id: { $in: followerIds } })
        .select("username fullName profilePicture bio")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      followerIds.length,
    ]);

    return formatPaginatedResult(followers, pageNum, limitNum, total);
  }

  static async getFollowing(
    userId: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const followingIds = user.following.map((id) => id.toString());

    const [following, total] = await Promise.all([
      User.find({ _id: { $in: followingIds } })
        .select("username fullName profilePicture bio")
        .skip(skip)
        .limit(limitNum)
        .sort({ createdAt: -1 }),
      followingIds.length,
    ]);

    return formatPaginatedResult(following, pageNum, limitNum, total);
  }

  static async getSuggestedUsers(userId: string, limit: number = 10) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const followingIds = user.following.map((id) => id.toString());

    const suggestedUsers = await User.find({
      _id: {
        $ne: new mongoose.Types.ObjectId(userId),
        $nin: followingIds.map((id) => new mongoose.Types.ObjectId(id)),
      },
    })
      .select("username fullName profilePicture bio")
      .sort({ createdAt: -1 })
      .limit(limit);

    return suggestedUsers;
  }
}