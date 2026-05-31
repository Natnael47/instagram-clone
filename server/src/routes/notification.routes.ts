import { Router } from "express";
import { NotificationController } from "@controllers/notification.controller";
import { protect } from "@middleware/auth.middleware";

const router = Router();

// All notification routes are protected
router.get("/", protect, NotificationController.getNotifications);
router.get("/unread/count", protect, NotificationController.getUnreadCount);
router.put("/:notificationId/read", protect, NotificationController.markAsRead);
router.put("/read-all", protect, NotificationController.markAllAsRead);
router.delete("/:notificationId", protect, NotificationController.deleteNotification);
router.delete("/", protect, NotificationController.deleteAllNotifications);

export default router;