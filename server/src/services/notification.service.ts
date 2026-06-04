import { Notification } from "@models/Notification";
import { Post } from "@models/Post";
import { User } from "@models/User";
import { getIO } from "@socket/index";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import mongoose from "mongoose";
import { ActivityService } from "./activity.service";

export class NotificationService {
  static async createLikeNotification(
    recipientId: string,
    senderId: string,
    postId: string,
  ): Promise<void> {
    if (recipientId === senderId) return;

    const sender = await User.findById(senderId);
    const post = await Post.findById(postId);

    if (!sender || !post) return;

    const message = `${sender.username} liked your post`;

    const notification = await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "like",
      entityId: new mongoose.Types.ObjectId(postId),
      message,
      isRead: false,
    });

    // Socket: Emit notification to recipient
    try {
      const io = getIO();
      const notificationObject = notification.toObject();
      await notification.populate("sender", "username fullName profilePicture");
      io.to(`user:${recipientId}`).emit("new-notification", {
        notification: notificationObject,
      });
    } catch (socketError) {
      logger.error(socketError, "Failed to emit new-notification socket event");
    }

    logger.info({ recipientId, senderId, postId }, "Like notification created");

    // Log notification creation
    ActivityService.log({
      user: senderId,
      action: 'like_post',
      resource: 'notification',
      resourceId: notification._id.toString(),
      details: {
        notificationType: 'like',
        recipientId,
        postId
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }

  static async createCommentNotification(
    recipientId: string,
    senderId: string,
    postId: string,
    commentId: string,
  ): Promise<void> {
    if (recipientId === senderId) return;

    const sender = await User.findById(senderId);
    const post = await Post.findById(postId);

    if (!sender || !post) return;

    const message = `${sender.username} commented on your post`;

    const notification = await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "comment",
      entityId: new mongoose.Types.ObjectId(commentId),
      message,
      isRead: false,
    });

    // Socket: Emit notification to recipient
    try {
      const io = getIO();
      const notificationObject = notification.toObject();
      await notification.populate("sender", "username fullName profilePicture");
      io.to(`user:${recipientId}`).emit("new-notification", {
        notification: notificationObject,
      });
    } catch (socketError) {
      logger.error(socketError, "Failed to emit new-notification socket event");
    }

    logger.info(
      { recipientId, senderId, postId },
      "Comment notification created",
    );

    // Log notification creation
    ActivityService.log({
      user: senderId,
      action: 'create_comment',
      resource: 'notification',
      resourceId: notification._id.toString(),
      details: {
        notificationType: 'comment',
        recipientId,
        postId,
        commentId
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }

  static async createFollowNotification(
    recipientId: string,
    senderId: string,
  ): Promise<void> {
    if (recipientId === senderId) return;

    const sender = await User.findById(senderId);
    if (!sender) return;

    const message = `${sender.username} started following you`;

    const notification = await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "follow",
      entityId: new mongoose.Types.ObjectId(senderId),
      message,
      isRead: false,
    });

    // Socket: Emit notification to recipient
    try {
      const io = getIO();
      const notificationObject = notification.toObject();
      await notification.populate("sender", "username fullName profilePicture");
      io.to(`user:${recipientId}`).emit("new-notification", {
        notification: notificationObject,
      });
    } catch (socketError) {
      logger.error(socketError, "Failed to emit new-notification socket event");
    }

    logger.info({ recipientId, senderId }, "Follow notification created");

    // Log notification creation
    ActivityService.log({
      user: senderId,
      action: 'follow',
      resource: 'notification',
      resourceId: notification._id.toString(),
      details: {
        notificationType: 'follow',
        recipientId
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }

  static async createStoryViewNotification(
    recipientId: string,
    senderId: string,
    storyId: string,
  ): Promise<void> {
    if (recipientId === senderId) return;

    const sender = await User.findById(senderId);
    if (!sender) return;

    const message = `${sender.username} viewed your story`;

    const notification = await Notification.create({
      recipient: new mongoose.Types.ObjectId(recipientId),
      sender: new mongoose.Types.ObjectId(senderId),
      type: "story_view",
      entityId: new mongoose.Types.ObjectId(storyId),
      message,
      isRead: false,
    });

    // Socket: Emit notification to recipient
    try {
      const io = getIO();
      const notificationObject = notification.toObject();
      await notification.populate("sender", "username fullName profilePicture");
      io.to(`user:${recipientId}`).emit("new-notification", {
        notification: notificationObject,
      });
    } catch (socketError) {
      logger.error(socketError, "Failed to emit new-notification socket event");
    }

    logger.info(
      { recipientId, senderId, storyId },
      "Story view notification created",
    );

    // Log notification creation
    ActivityService.log({
      user: senderId,
      action: 'view_story',
      resource: 'notification',
      resourceId: notification._id.toString(),
      details: {
        notificationType: 'story_view',
        recipientId,
        storyId
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }

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

  static async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw ApiError.notFound("Notification not found");
    }

    if (notification.recipient.toString() !== userId) {
      // Log unauthorized attempt
      ActivityService.log({
        user: userId,
        action: 'view_post',
        resource: 'notification',
        resourceId: notificationId,
        status: 'failure',
        details: {
          reason: 'unauthorized',
          operation: 'mark_read'
        }
      }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
      
      throw ApiError.forbidden(
        "Not authorized to mark this notification as read",
      );
    }

    notification.isRead = true;
    await notification.save();

    logger.info({ notificationId, userId }, "Notification marked as read");

    // Log notification read
    ActivityService.log({
      user: userId,
      action: 'view_post',
      resource: 'notification',
      resourceId: notificationId,
      details: {
        operation: 'mark_read',
        notificationType: notification.type
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }

  static async markAllAsRead(userId: string): Promise<void> {
    const result = await Notification.updateMany(
      { recipient: new mongoose.Types.ObjectId(userId), isRead: false },
      { $set: { isRead: true } },
    );

    logger.info({ userId, modifiedCount: result.modifiedCount }, "All notifications marked as read");

    // Log batch mark as read
    ActivityService.log({
      user: userId,
      action: 'view_post',
      resource: 'notification',
      details: {
        operation: 'mark_all_read',
        count: result.modifiedCount
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const count = await Notification.countDocuments({
      recipient: new mongoose.Types.ObjectId(userId),
      isRead: false,
    });

    return count;
  }

  static async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw ApiError.notFound("Notification not found");
    }

    if (notification.recipient.toString() !== userId) {
      // Log unauthorized delete attempt
      ActivityService.log({
        user: userId,
        action: 'delete_message',
        resource: 'notification',
        resourceId: notificationId,
        status: 'failure',
        details: {
          reason: 'unauthorized',
          operation: 'delete'
        }
      }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
      
      throw ApiError.forbidden("Not authorized to delete this notification");
    }

    const notificationType = notification.type;
    await notification.deleteOne();

    logger.info({ notificationId, userId }, "Notification deleted");

    // Log notification deletion
    ActivityService.log({
      user: userId,
      action: 'delete_message',
      resource: 'notification',
      resourceId: notificationId,
      details: {
        operation: 'delete',
        notificationType
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }

  static async deleteAllNotifications(userId: string): Promise<void> {
    const result = await Notification.deleteMany({
      recipient: new mongoose.Types.ObjectId(userId),
    });

    logger.info({ userId, deletedCount: result.deletedCount }, "All notifications deleted");

    // Log batch deletion
    ActivityService.log({
      user: userId,
      action: 'delete_message',
      resource: 'notification',
      details: {
        operation: 'delete_all',
        count: result.deletedCount
      }
    }).catch(err => logger.error({ err }, 'Failed to log notification activity'));
  }
}