import { User } from "@models/User";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose from "mongoose";

/**
 * User Service
 * Handles user profile operations, follow/unfollow, and search
 */
export class UserService {
  /**
   * Get user profile by ID
   * @param userId - User ID to fetch
   * @param currentUserId - ID of requesting user (for follow status)
   * @returns User profile with follow status
   */
  static async getUserProfile(
    userId: string,
    currentUserId?: string,
  ): Promise<any> {
    const user = await User.findById(userId)
      .select("-password")
      .populate("followers", "username fullName profilePicture")
      .populate("following", "username fullName profilePicture");

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const userObject = user.toObject();

    // Add follow status
    if (currentUserId && currentUserId !== userId) {
      const currentUser = await User.findById(currentUserId);
      if (currentUser) {
        const isFollowed = currentUser.following.some(
          (followingId) => followingId.toString() === userId,
        );
        (userObject as any).isFollowedByCurrentUser = isFollowed;
      }
    }

    return userObject;
  }

  /**
   * Follow a user
   * @param followerId - ID of user who is following
   * @param targetUserId - ID of user to follow
   */
  static async followUser(
    followerId: string,
    targetUserId: string,
  ): Promise<void> {
    if (followerId === targetUserId) {
      throw ApiError.badRequest("You cannot follow yourself");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw ApiError.notFound("User to follow not found");
      }

      const follower = await User.findById(followerId);
      if (!follower) {
        throw ApiError.notFound("Follower not found");
      }

      // Check if already following
      if (follower.following.some((id) => id.toString() === targetUserId)) {
        throw ApiError.badRequest("Already following this user");
      }

      // Add to following and followers
      await User.findByIdAndUpdate(
        followerId,
        { $addToSet: { following: new mongoose.Types.ObjectId(targetUserId) } },
        { session },
      );

      await User.findByIdAndUpdate(
        targetUserId,
        { $addToSet: { followers: new mongoose.Types.ObjectId(followerId) } },
        { session },
      );

      await session.commitTransaction();

      logger.info(
        { followerId, targetUserId },
        "User started following another user",
      );
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Unfollow a user
   * @param followerId - ID of user who is unfollowing
   * @param targetUserId - ID of user to unfollow
   */
  static async unfollowUser(
    followerId: string,
    targetUserId: string,
  ): Promise<void> {
    if (followerId === targetUserId) {
      throw ApiError.badRequest("You cannot unfollow yourself");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser) {
        throw ApiError.notFound("User to unfollow not found");
      }

      // Remove from following and followers
      await User.findByIdAndUpdate(
        followerId,
        { $pull: { following: new mongoose.Types.ObjectId(targetUserId) } },
        { session },
      );

      await User.findByIdAndUpdate(
        targetUserId,
        { $pull: { followers: new mongoose.Types.ObjectId(followerId) } },
        { session },
      );

      await session.commitTransaction();

      logger.info({ followerId, targetUserId }, "User unfollowed another user");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Search users by username or full name
   * @param query - Search query
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated search results
   */
  static async searchUsers(
    query: string,
    page?: string | number,
    limit?: string | number,
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

    return formatPaginatedResult(users, pageNum, limitNum, total);
  }

  /**
   * Get user's followers
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated followers list
   */
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

  /**
   * Get users that a user is following
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   * @returns Paginated following list
   */
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

  /**
   * Get suggested users to follow
   * @param userId - Current user ID
   * @param limit - Number of suggestions
   * @returns Array of suggested users
   */
  static async getSuggestedUsers(userId: string, limit: number = 10) {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const followingIds = user.following.map((id) => id.toString());

    // Get users that current user is not following
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
