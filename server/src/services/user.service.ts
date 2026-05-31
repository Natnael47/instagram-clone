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

export class UserService {
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

    await User.findByIdAndUpdate(followerId, {
      $pull: { following: new mongoose.Types.ObjectId(targetUserId) },
    });

    await User.findByIdAndUpdate(targetUserId, {
      $pull: { followers: new mongoose.Types.ObjectId(followerId) },
    });

    logger.info({ followerId, targetUserId }, "User unfollowed another user");
  }

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
