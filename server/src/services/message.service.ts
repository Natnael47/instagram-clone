import { Conversation, type ConversationDocument } from "@models/Conversation";
import { Message, type MessageDocument } from "@models/Message";
import { User } from "@models/User";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import { Types } from "mongoose";

export class MessageService {
  static async sendMessageToConversation(
    conversationId: string,
    senderId: string,
    text: string,
  ): Promise<{ message: MessageDocument; conversation: ConversationDocument }> {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw ApiError.notFound("Conversation not found");
    }

    if (!conversation.participants.some((p) => p.toString() === senderId)) {
      throw ApiError.forbidden(
        "You are not a participant in this conversation",
      );
    }

    const message = await Message.create({
      conversation: new Types.ObjectId(conversationId),
      sender: new Types.ObjectId(senderId),
      text,
      isRead: false,
      isDeleted: false,
    });

    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate("sender", "username fullName profilePicture");

    logger.info(
      { messageId: message._id, conversationId, senderId },
      "Message sent",
    );

    return { message, conversation };
  }

  static async sendMessageToUser(
    senderId: string,
    recipientId: string,
    text: string,
  ): Promise<{ message: MessageDocument; conversation: ConversationDocument }> {
    if (senderId === recipientId) {
      throw ApiError.badRequest("You cannot send a message to yourself");
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      throw ApiError.notFound("Recipient not found");
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, recipientId] },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [
          new Types.ObjectId(senderId),
          new Types.ObjectId(recipientId),
        ],
        lastMessage: text,
        lastMessageAt: new Date(),
      });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: new Types.ObjectId(senderId),
      text,
      isRead: false,
      isDeleted: false,
    });

    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    await message.populate("sender", "username fullName profilePicture");

    logger.info(
      {
        messageId: message._id,
        conversationId: conversation._id,
        senderId,
        recipientId,
      },
      "Message sent to user",
    );

    return { message, conversation };
  }

  static async getUserConversations(
    userId: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const userObjectId = new Types.ObjectId(userId);

    const [conversations, total] = await Promise.all([
      Conversation.find({ participants: userObjectId })
        .populate("participants", "username fullName profilePicture")
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Conversation.countDocuments({ participants: userObjectId }),
    ]);

    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const unreadCount = await Message.countDocuments({
          conversation: conversation._id,
          sender: { $ne: userId },
          isRead: false,
        });

        const conversationObj = conversation.toObject();
        (conversationObj as any).unreadCount = unreadCount;

        return conversationObj;
      }),
    );

    logger.info({ userId, total }, "User conversations retrieved");

    return formatPaginatedResult(
      conversationsWithUnread,
      pageNum,
      limitNum,
      total,
    );
  }

  static async getConversationMessages(
    conversationId: string,
    userId: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw ApiError.notFound("Conversation not found");
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw ApiError.forbidden(
        "You are not a participant in this conversation",
      );
    }

    const conversationObjectId = new Types.ObjectId(conversationId);

    const [messages, total] = await Promise.all([
      Message.find({
        conversation: conversationObjectId,
        isDeleted: false,
      })
        .populate("sender", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Message.countDocuments({
        conversation: conversationObjectId,
        isDeleted: false,
      }),
    ]);

    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        isRead: false,
      },
      { $set: { isRead: true, readAt: new Date() } },
    );

    logger.info(
      { conversationId, userId, total },
      "Conversation messages retrieved",
    );

    return formatPaginatedResult(messages.reverse(), pageNum, limitNum, total);
  }

  static async markMessageAsRead(
    messageId: string,
    userId: string,
  ): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw ApiError.notFound("Message not found");
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      throw ApiError.notFound("Conversation not found");
    }

    if (!conversation.participants.some((p) => p.toString() === userId)) {
      throw ApiError.forbidden(
        "You are not a participant in this conversation",
      );
    }

    if (message.sender.toString() === userId) {
      throw ApiError.badRequest("You cannot mark your own messages as read");
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    logger.info({ messageId, userId }, "Message marked as read");
  }

  static async deleteMessage(messageId: string, userId: string): Promise<void> {
    const message = await Message.findById(messageId);
    if (!message) {
      throw ApiError.notFound("Message not found");
    }

    if (message.sender.toString() !== userId) {
      throw ApiError.forbidden("You can only delete your own messages");
    }

    message.isDeleted = true;
    await message.save();

    logger.info({ messageId, userId }, "Message deleted");
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);

    const conversations = await Conversation.find({
      participants: userObjectId,
    });

    const conversationIds = conversations.map((c) => c._id);

    const count = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: userId },
      isRead: false,
    });

    return count;
  }
}
