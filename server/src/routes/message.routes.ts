import { MessageController } from "@controllers/message.controller";
import { protect } from "@middleware/auth.middleware";
import { activityLogger } from "@middleware/activityLogger.middleware";
import { validate } from "@middleware/validate.middleware";
import {
  deleteMessageValidator,
  getMessagesValidator,
  sendMessageValidator,
} from "@validators/message.validator";
import { Router } from "express";

const router = Router();

// All message routes are protected with activity logging
router.post(
  "/",
  protect,
  validate(sendMessageValidator),
  activityLogger({
    action: 'send_message',
    resource: 'message',
    onlyOnSuccess: true,
    getDetails: (req) => ({
      conversationId: req.body?.conversationId,
      recipientId: req.body?.recipientId,
      messageType: 'text',
      textLength: req.body?.text?.length
    })
  }),
  MessageController.sendMessage,
);

router.get(
  "/conversations", 
  protect, 
  MessageController.getConversations
);

router.get(
  "/unread/count", 
  protect, 
  MessageController.getUnreadCount
);

router.get(
  "/:conversationId",
  protect,
  validate(getMessagesValidator),
  activityLogger({
    action: 'send_message',
    resource: 'conversation',
    getDetails: (req) => ({
      conversationId: req.params.conversationId,
      action: 'view_messages'
    })
  }),
  MessageController.getMessages,
);

router.put(
  "/:messageId/read", 
  protect, 
  activityLogger({
    action: 'send_message',
    resource: 'message',
    getResourceId: (req) => {
      const id = req.params.messageId;
      return Array.isArray(id) ? id[0] : id;
    },
    getDetails: () => ({
      action: 'mark_read'
    })
  }),
  MessageController.markAsRead
);

router.delete(
  "/:messageId",
  protect,
  validate(deleteMessageValidator),
  activityLogger({
    action: 'delete_message',
    resource: 'message',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.messageId;
      return Array.isArray(id) ? id[0] : id;
    }
  }),
  MessageController.deleteMessage,
);

export default router;