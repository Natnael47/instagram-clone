import { NotificationController } from "@controllers/notification.controller";
import { activityLogger } from "@middleware/activityLogger.middleware";
import { protect } from "@middleware/auth.middleware";
import { Router } from "express";

const router = Router();

// All notification routes are protected with activity logging
router.get("/", protect, NotificationController.getNotifications);

router.get("/unread/count", protect, NotificationController.getUnreadCount);

router.put(
  "/:notificationId/read",
  protect,
  activityLogger({
    action: "view_post",
    resource: "notification",
    getResourceId: (req) => {
      const id = req.params.notificationId;
      return Array.isArray(id) ? id[0] : id;
    },
    getDetails: () => ({
      operation: "mark_read",
    }),
  }),
  NotificationController.markAsRead,
);

router.put(
  "/read-all",
  protect,
  activityLogger({
    action: "view_post",
    resource: "notification",
    getDetails: () => ({
      operation: "mark_all_read",
    }),
  }),
  NotificationController.markAllAsRead,
);

router.delete(
  "/:notificationId",
  protect,
  activityLogger({
    action: "delete_message",
    resource: "notification",
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.notificationId;
      return Array.isArray(id) ? id[0] : id;
    },
    getDetails: () => ({
      operation: "delete_single",
    }),
  }),
  NotificationController.deleteNotification,
);

router.delete(
  "/",
  protect,
  activityLogger({
    action: "delete_message",
    resource: "notification",
    onlyOnSuccess: true,
    getDetails: () => ({
      operation: "delete_all",
    }),
  }),
  NotificationController.deleteAllNotifications,
);

export default router;
