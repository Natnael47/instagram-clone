import { asyncHandler } from "@middleware/asyncHandler";
import { NotificationService } from "@services/notification.service";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

export class NotificationController {
  static getNotifications = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const page = req.query.page as string | undefined;
      const limit = req.query.limit as string | undefined;
      const unreadOnly = req.query.unreadOnly as string | undefined;
      const unreadOnlyFlag = unreadOnly === "true";

      const userIdStr = userId.toString();
      const result = await NotificationService.getUserNotifications(
        userIdStr,
        page,
        limit,
        unreadOnlyFlag,
      );

      logger.info(
        {
          userId: userIdStr,
          total: result.pagination.total,
          unreadOnly: unreadOnlyFlag,
        },
        "Notifications retrieved",
      );

      res
        .status(200)
        .json(
          ApiResponse.success("Notifications retrieved successfully", result),
        );
    },
  );

  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const notificationId = req.params.notificationId as string;

    const userIdStr = userId.toString();
    await NotificationService.markAsRead(notificationId, userIdStr);

    logger.info(
      { notificationId, userId: userIdStr },
      "Notification marked as read",
    );

    res
      .status(200)
      .json(ApiResponse.success("Notification marked as read successfully"));
  });

  static markAllAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const userIdStr = userId.toString();
    await NotificationService.markAllAsRead(userIdStr);

    logger.info({ userId: userIdStr }, "All notifications marked as read");

    res
      .status(200)
      .json(
        ApiResponse.success("All notifications marked as read successfully"),
      );
  });

  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const userIdStr = userId.toString();
    const count = await NotificationService.getUnreadCount(userIdStr);

    logger.info(
      { userId: userIdStr, unreadCount: count },
      "Unread notification count retrieved",
    );

    res
      .status(200)
      .json(
        ApiResponse.success("Unread count retrieved successfully", { count }),
      );
  });

  static deleteNotification = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const notificationId = req.params.notificationId as string;

      const userIdStr = userId.toString();
      await NotificationService.deleteNotification(notificationId, userIdStr);

      logger.info(
        { notificationId, userId: userIdStr },
        "Notification deleted",
      );

      res
        .status(200)
        .json(ApiResponse.success("Notification deleted successfully"));
    },
  );

  static deleteAllNotifications = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const userIdStr = userId.toString();
      await NotificationService.deleteAllNotifications(userIdStr);

      logger.info({ userId: userIdStr }, "All notifications deleted");

      res
        .status(200)
        .json(ApiResponse.success("All notifications deleted successfully"));
    },
  );
}
