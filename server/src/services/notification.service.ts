import { Notification } from "@models/Notification";
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
 * Notification Service
 * Handles notification creation, retrieval, and management
 */
export class NotificationService {
  /**
   * Create a like notification
   * @param recipientId - User who receives the notification
   * @param senderId - User who liked
   * @param postId - ID of the liked post
   */
  static async createLikeNotification(
    recipientId: string,
    senderId: string,
    postId: string,
  ): Promise<void> {
    if (recipientId === senderId) return; // Don't notify self

    const sender = await User.findById(senderId);
    const post = await Post.findById(postId);

    if (!sender || !post) return;

    const message = `${sender.username} liked your post`;

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "like",
      entityId: new mongoose.Types.ObjectId(postId),
      message,
      isRead: false,
    });

    logger.info({ recipientId, senderId, postId }, "Like notification created");
  }

  /**
   * Create a comment notification
   * @param recipientId - User who receives the notification
   * @param senderId - User who commented
   * @param postId - ID of the commented post
   * @param commentId - ID of the comment
   */
  static async createCommentNotification(
    recipientId: string,
    senderId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    if (recipientId === senderId) return; // Don't notify self

    const sender = await User.findById(senderId);
    const post = await Post.findById(postId);

    if (!sender || !post) return;

    const message = `${sender.username} commented on your post`;

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "comment",
      entityId: new mongoose.Types.ObjectId(commentId),
      message,
      isRead: false,
    });

    logger.info(
      { recipientId, senderId, postId },
      "Comment notification created",
    );
  }

  /**
   * Create a follow notification
   * @param recipientId - User who receives the notification
   * @param senderId - User who followed
   */
  static async createFollowNotification(
    recipientId: string,
    senderId: string,
  ): Promise<void> {
    if (recipientId === senderId) return; // Don't notify self

    const sender = await User.findById(senderId);
    if (!sender) return;

    const message = `${sender.username} started following you`;

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "follow",
      entityId: new mongoose.Types.ObjectId(senderId),
      message,
      isRead: false,
    });

    logger.info({ recipientId, senderId }, "Follow notification created");
  }

  /**
   * Create a story view notification
   * @param recipientId - User who receives the notification (story owner)
   * @param senderId - User who viewed the story
   * @param storyId - ID of the story
   */
  static async createStoryViewNotification(
    recipientId: string,
    senderId: string,
    storyId: string,
  ): Promise<void> {
    if (recipientId === senderId) return; // Don't notify self

    const sender = await User.findById(senderId);
    if (!sender) return;

    const message = `${sender.username} viewed your story`;

    await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "story_view",
      entityId: new mongoose.Types.ObjectId(storyId),
      message,
      isRead: false,
    });

    logger.info(
      { recipientId, senderId, storyId },
      "Story view notification created",
    );
  }

  /**
   * Get user's notifications
   * @param userId - User ID
   * @param page - Page number
   * @param limit - Items per page
   * @param unreadOnly - Only return unread notifications
   * @returns Paginated notifications
   */
  static async getUserNotifications(
    userId: string,
    page?: string | number,
    limit?: string | number,
    unreadOnly: boolean = false,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const filter: any = { recipient: new mongoose.Types.ObjectId(userId) };
    if (unreadOnly) {
      filter.isRead = false;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .populate("sender", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(filter),
    ]);

    logger.info({ userId, total, unreadOnly }, "User notifications retrieved");

    return formatPaginatedResult(notifications, pageNum, limitNum, total);
  }

  /**
   * Mark a notification as read
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   */
  static async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw ApiError.notFound("Notification not found");
    }

    if (notification.recipient.toString() !== userId) {
      throw ApiError.forbidden(
        "Not authorized to mark this notification as read",
      );
    }

    notification.isRead = true;
    await notification.save();

    logger.info({ notificationId, userId }, "Notification marked as read");
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - User ID
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await Notification.updateMany(
      { recipient: new mongoose.Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );

    logger.info({ userId }, "All notifications marked as read");
  }

  /**
   * Get unread notification count for a user
   * @param userId - User ID
   * @returns Unread count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    const count = await Notification.countDocuments({
      recipient: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });

    return count;
  }

  /**
   * Delete a notification
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   */
  static async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw ApiError.notFound("Notification not found");
    }

    if (notification.recipient.toString() !== userId) {
      throw ApiError.forbidden("Not authorized to delete this notification");
    }

    await notification.deleteOne();

    logger.info({ notificationId, userId }, "Notification deleted");
  }

  /**
   * Delete all notifications for a user
   * @param userId - User ID
   */
  static async deleteAllNotifications(userId: string): Promise<void> {
    await Notification.deleteMany({
      recipient: new mongoose.Types.ObjectId(userId),
    });

    logger.info({ userId }, "All notifications deleted");
  }
}
