import { SocketEvents } from "@config/socket";
import { MessageService } from "@services/message.service";
import { logger } from "@utils/logger";
import { Server, Socket } from "socket.io";

/**
 * Chat event handlers
 */
export const chatHandler = (io: Server, socket: Socket, userId: string) => {
  /**
   * Join a conversation room
   */
  socket.on(SocketEvents.JOIN_CONVERSATION, async (conversationId: string) => {
    if (!conversationId || typeof conversationId !== "string") {
      socket.emit(SocketEvents.ERROR, { message: "Invalid conversation ID" });
      return;
    }

    const roomName = `conversation:${conversationId}`;
    socket.join(roomName);

    logger.info({ userId, conversationId }, "User joined conversation room");
  });

  /**
   * Leave a conversation room
   */
  socket.on(SocketEvents.LEAVE_CONVERSATION, async (conversationId: string) => {
    if (!conversationId || typeof conversationId !== "string") {
      return;
    }

    const roomName = `conversation:${conversationId}`;
    socket.leave(roomName);

    logger.info({ userId, conversationId }, "User left conversation room");
  });

  /**
   * Send a message
   */
  socket.on(
    SocketEvents.SEND_MESSAGE,
    async (data: {
      conversationId?: string;
      recipientId?: string;
      text: string;
    }) => {
      const { conversationId, recipientId, text } = data;

      if (!text || typeof text !== "string") {
        socket.emit(SocketEvents.ERROR, {
          message: "Message text is required",
        });
        return;
      }

      try {
        let result;

        if (conversationId) {
          result = await MessageService.sendMessageToConversation(
            conversationId,
            userId,
            text,
          );

          // Emit to conversation room
          io.to(`conversation:${conversationId}`).emit(
            SocketEvents.NEW_MESSAGE,
            {
              conversationId,
              message: result.message,
            },
          );
        } else if (recipientId) {
          result = await MessageService.sendMessageToUser(
            userId,
            recipientId,
            text,
          );

          // Emit to both users' personal rooms
          io.to(`user:${userId}`).emit(SocketEvents.NEW_MESSAGE, {
            conversationId: result.conversation._id,
            message: result.message,
          });
          io.to(`user:${recipientId}`).emit(SocketEvents.NEW_MESSAGE, {
            conversationId: result.conversation._id,
            message: result.message,
          });
        } else {
          socket.emit(SocketEvents.ERROR, {
            message: "Either conversationId or recipientId is required",
          });
          return;
        }
      } catch (error) {
        logger.error({ error, userId }, "Failed to send message");
        socket.emit(SocketEvents.ERROR, { message: "Failed to send message" });
      }
    },
  );

  /**
   * Mark message as read
   */
  socket.on(
    SocketEvents.MESSAGE_READ,
    async (data: { conversationId: string; messageId: string }) => {
      const { conversationId, messageId } = data;

      if (!conversationId || !messageId) {
        return;
      }

      try {
        await MessageService.markMessageAsRead(messageId, userId);

        // Notify the sender that message was read
        io.to(`conversation:${conversationId}`).emit(
          SocketEvents.MESSAGE_READ,
          {
            conversationId,
            messageId,
          },
        );
      } catch (error) {
        logger.error({ error, userId }, "Failed to mark message as read");
      }
    },
  );
};
