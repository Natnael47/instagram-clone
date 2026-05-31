import { Server, Socket } from "socket.io";
import { SocketEvents } from "@config/socket";
import { logger } from "@utils/logger";

/**
 * Typing indicator event handlers
 */
export const typingHandler = (io: Server, socket: Socket, userId: string) => {
  /**
   * User is typing in a conversation
   */
  socket.on(SocketEvents.TYPING, (data: { conversationId: string; isTyping: boolean }) => {
    const { conversationId, isTyping } = data;

    if (!conversationId || typeof conversationId !== "string") {
      return;
    }

    // Get user info from socket
    const user = (socket as any).user;
    if (!user) {
      return;
    }

    // Broadcast to conversation room (excluding sender)
    socket.to(`conversation:${conversationId}`).emit(SocketEvents.USER_TYPING, {
      userId,
      username: user.username,
      isTyping,
    });
  });
};

/**
 * Emit typing indicator to conversation participants
 * @param io - Socket.IO server instance
 * @param conversationId - Conversation ID
 * @param userId - User ID who is typing
 * @param username - Username of user typing
 * @param isTyping - Whether user is typing
 */
export const emitTypingIndicator = (
  io: Server,
  conversationId: string,
  userId: string,
  username: string,
  isTyping: boolean
): void => {
  io.to(`conversation:${conversationId}`).emit(SocketEvents.USER_TYPING, {
    userId,
    username,
    isTyping,
  });
};