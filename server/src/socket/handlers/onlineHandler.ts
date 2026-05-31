import { Server, Socket } from "socket.io";
import { SocketEvents } from "@config/socket";
import { logger } from "@utils/logger";
import { User } from "@models/User";

// Track online users
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds
const userSockets = new Map<string, string[]>(); // userId -> array of socketIds

/**
 * Online status event handlers
 */
export const onlineHandler = (io: Server, socket: Socket, userId: string) => {
  // Add user to online tracking
  addOnlineUser(userId, socket.id);

  // Notify followers that user is online
  notifyStatusChange(io, userId, true);

  // Handle disconnect
  socket.on(SocketEvents.DISCONNECT, () => {
    removeOnlineUser(userId, socket.id);
    notifyStatusChange(io, userId, false);
  });
};

/**
 * Add user to online tracking
 */
const addOnlineUser = (userId: string, socketId: string): void => {
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId)?.add(socketId);

  if (!userSockets.has(userId)) {
    userSockets.set(userId, []);
  }
  userSockets.get(userId)?.push(socketId);
};

/**
 * Remove user from online tracking
 */
const removeOnlineUser = (userId: string, socketId: string): void => {
  const sockets = onlineUsers.get(userId);
  if (sockets) {
    sockets.delete(socketId);
    if (sockets.size === 0) {
      onlineUsers.delete(userId);
    }
  }

  const userSocketList = userSockets.get(userId);
  if (userSocketList) {
    const index = userSocketList.indexOf(socketId);
    if (index !== -1) {
      userSocketList.splice(index, 1);
    }
    if (userSocketList.length === 0) {
      userSockets.delete(userId);
    }
  }
};

/**
 * Check if user is online
 */
export const isUserOnline = (userId: string): boolean => {
  return onlineUsers.has(userId) && (onlineUsers.get(userId)?.size ?? 0) > 0;
};

/**
 * Notify followers about user status change
 */
const notifyStatusChange = async (io: Server, userId: string, isOnline: boolean): Promise<void> => {
  try {
    const user = await User.findById(userId).select("followers");
    if (!user) return;

    const followers = user.followers.map(f => f.toString());
    
    for (const followerId of followers) {
      io.to(`user:${followerId}`).emit(SocketEvents.USER_STATUS_CHANGE, {
        userId,
        isOnline,
      });
    }
  } catch (error) {
    logger.error({ error, userId }, "Failed to notify status change");
  }
};

/**
 * Emit online status to specific user
 */
export const emitUserStatus = (io: Server, targetUserId: string, userId: string, isOnline: boolean): void => {
  io.to(`user:${targetUserId}`).emit(SocketEvents.USER_STATUS_CHANGE, {
    userId,
    isOnline,
  });
};

/**
 * Get all online users
 */
export const getOnlineUsers = (): string[] => {
  return Array.from(onlineUsers.keys());
};