import { asyncHandler } from "@middleware/asyncHandler";
import { MessageService } from "@services/message.service";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

export class MessageController {
  static sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { conversationId, recipientId, text } = req.body;

    if (!text || typeof text !== "string") {
      throw new Error("Message text is required");
    }

    const userIdStr = userId.toString();
    let result;

    if (conversationId && typeof conversationId === "string") {
      result = await MessageService.sendMessageToConversation(
        conversationId,
        userIdStr,
        text,
      );
    } else if (recipientId && typeof recipientId === "string") {
      result = await MessageService.sendMessageToUser(
        userIdStr,
        recipientId,
        text,
      );
    } else {
      throw new Error("Either conversationId or recipientId is required");
    }

    logger.info(
      { conversationId: result.conversation._id, userId: userIdStr },
      "Message sent",
    );

    res
      .status(201)
      .json(ApiResponse.success("Message sent successfully", result));
  });

  static getConversations = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const page = req.query.page as string | undefined;
      const limit = req.query.limit as string | undefined;

      const userIdStr = userId.toString();
      const result = await MessageService.getUserConversations(
        userIdStr,
        page,
        limit,
      );

      logger.info(
        { userId: userIdStr, total: result.pagination.total },
        "Conversations retrieved",
      );

      res
        .status(200)
        .json(
          ApiResponse.success("Conversations retrieved successfully", result),
        );
    },
  );

  static getMessages = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const conversationId = req.params.conversationId as string;
    const page = req.query.page as string | undefined;
    const limit = req.query.limit as string | undefined;

    const userIdStr = userId.toString();
    const result = await MessageService.getConversationMessages(
      conversationId,
      userIdStr,
      page,
      limit,
    );

    logger.info(
      { conversationId, userId: userIdStr, total: result.pagination.total },
      "Messages retrieved",
    );

    res
      .status(200)
      .json(ApiResponse.success("Messages retrieved successfully", result));
  });

  static markAsRead = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const messageId = req.params.messageId as string;

    const userIdStr = userId.toString();
    await MessageService.markMessageAsRead(messageId, userIdStr);

    logger.info({ messageId, userId: userIdStr }, "Message marked as read");

    res
      .status(200)
      .json(ApiResponse.success("Message marked as read successfully"));
  });

  static deleteMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const messageId = req.params.messageId as string;

    const userIdStr = userId.toString();
    await MessageService.deleteMessage(messageId, userIdStr);

    logger.info({ messageId, userId: userIdStr }, "Message deleted");

    res.status(200).json(ApiResponse.success("Message deleted successfully"));
  });

  static getUnreadCount = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const userIdStr = userId.toString();
    const count = await MessageService.getUnreadCount(userIdStr);

    logger.info(
      { userId: userIdStr, unreadCount: count },
      "Unread message count retrieved",
    );

    res
      .status(200)
      .json(
        ApiResponse.success("Unread count retrieved successfully", { count }),
      );
  });
}
