import { MessageController } from "@controllers/message.controller";
import { protect } from "@middleware/auth.middleware";
import { validate } from "@middleware/validate.middleware";
import {
  deleteMessageValidator,
  getMessagesValidator,
  sendMessageValidator,
} from "@validators/message.validator";
import { Router } from "express";

const router = Router();

// All message routes are protected
router.post(
  "/",
  protect,
  validate(sendMessageValidator),
  MessageController.sendMessage,
);
router.get("/conversations", protect, MessageController.getConversations);
router.get("/unread/count", protect, MessageController.getUnreadCount);
router.get(
  "/:conversationId",
  protect,
  validate(getMessagesValidator),
  MessageController.getMessages,
);
router.put("/:messageId/read", protect, MessageController.markAsRead);
router.delete(
  "/:messageId",
  protect,
  validate(deleteMessageValidator),
  MessageController.deleteMessage,
);

export default router;
