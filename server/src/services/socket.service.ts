import { User } from "@models/User";
import { verifyToken } from "@utils/generateToken";
import { logger } from "@utils/logger";
import type { Server as HttpServer } from "http";
import { Socket, Server as SocketServer } from "socket.io";

/**
 * Socket Service
 * Manages Socket.IO connections, rooms, and real-time events
 */
export class SocketService {
  private static io: SocketServer;
  private static onlineUsers: Map<string, string> = new Map(); // userId -> socketId
  private static userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

  /**
   * Initialize Socket.IO server
   * @param server - HTTP server instance
   */
  static initialize(server: HttpServer): void {
    this.io = new SocketServer(server, {
      cors: {
        origin: process.env.CLIENT_URL || "http://localhost:19000",
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Authentication required"));
        }

        const decoded = verifyToken(token);
        if (!decoded || !decoded.id) {
          return next(new Error("Invalid token"));
        }

        const user = await User.findById(decoded.id).select(
          "_id username fullName profilePicture",
        );
        if (!user) {
          return next(new Error("User not found"));
        }

        (socket as any).userId = user._id.toString();
        (socket as any).user = user;
        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });

    this.io.on("connection", (socket: Socket) => {
      this.handleConnection(socket);
    });

    logger.info("Socket.IO server initialized");
  }

  /**
   * Handle new socket connection
   * @param socket - Socket instance
   */
  private static handleConnection(socket: Socket): void {
    const userId = (socket as any).userId;
    const user = (socket as any).user;

    if (!userId) {
      socket.disconnect();
      return;
    }

    // Track online user
    this.addOnlineUser(userId, socket.id);

    logger.info({ userId, socketId: socket.id }, "User connected to socket");

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Emit online status to followers
    this.emitOnlineStatus(userId, true);

    // Handle joining conversation room
    socket.on("join-conversation", (conversationId: string) => {
      const roomName = `conversation:${conversationId}`;
      socket.join(roomName);
      logger.info({ userId, conversationId }, "User joined conversation room");
    });

    // Handle leaving conversation room
    socket.on("leave-conversation", (conversationId: string) => {
      const roomName = `conversation:${conversationId}`;
      socket.leave(roomName);
      logger.info({ userId, conversationId }, "User left conversation room");
    });

    // Handle typing indicator
    socket.on(
      "typing",
      (data: { conversationId: string; isTyping: boolean }) => {
        const roomName = `conversation:${data.conversationId}`;
        socket.to(roomName).emit("user-typing", {
          userId,
          username: user.username,
          isTyping: data.isTyping,
        });
      },
    );

    // Handle disconnect
    socket.on("disconnect", () => {
      this.removeOnlineUser(userId, socket.id);
      this.emitOnlineStatus(userId, false);
      logger.info(
        { userId, socketId: socket.id },
        "User disconnected from socket",
      );
    });
  }

  /**
   * Add user to online users tracking
   * @param userId - User ID
   * @param socketId - Socket ID
   */
  private static addOnlineUser(userId: string, socketId: string): void {
    this.onlineUsers.set(socketId, userId);

    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)?.add(socketId);
  }

  /**
   * Remove user from online users tracking
   * @param userId - User ID
   * @param socketId - Socket ID
   */
  private static removeOnlineUser(userId: string, socketId: string): void {
    this.onlineUsers.delete(socketId);

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }
  }

  /**
   * Check if a user is online
   * @param userId - User ID
   * @returns Boolean indicating if user is online
   */
  static isUserOnline(userId: string): boolean {
    return (
      this.userSockets.has(userId) &&
      (this.userSockets.get(userId)?.size || 0) > 0
    );
  }

  /**
   * Emit online status to followers
   * @param userId - User ID
   * @param isOnline - Online status
   */
  private static async emitOnlineStatus(
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    try {
      // Get user's followers
      const user = await User.findById(userId).select("followers");
      if (!user) return;

      // Emit to each follower's personal room
      for (const followerId of user.followers) {
        this.io.to(`user:${followerId.toString()}`).emit("user-status-change", {
          userId,
          isOnline,
        });
      }
    } catch (error) {
      logger.error({ error, userId }, "Failed to emit online status");
    }
  }

  /**
   * Send a new message notification
   * @param conversationId - Conversation ID
   * @param recipientId - Recipient user ID
   * @param message - Message data
   */
  static sendNewMessage(
    conversationId: string,
    recipientId: string,
    message: any,
  ): void {
    this.io.to(`user:${recipientId}`).emit("new-message", {
      conversationId,
      message,
    });
  }

  /**
   * Send message read receipt
   * @param conversationId - Conversation ID
   * @param senderId - Original sender ID
   * @param messageId - Message ID
   */
  static sendMessageReadReceipt(
    conversationId: string,
    senderId: string,
    messageId: string,
  ): void {
    this.io.to(`user:${senderId}`).emit("message-read", {
      conversationId,
      messageId,
    });
  }

  /**
   * Send new post notification to followers
   * @param userId - User ID who created the post
   * @param post - Post data
   */
  static async sendNewPostNotification(
    userId: string,
    post: any,
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select(
        "followers username fullName profilePicture",
      );
      if (!user) return;

      // Emit to each follower's personal room
      for (const followerId of user.followers) {
        this.io.to(`user:${followerId.toString()}`).emit("new-post", {
          author: {
            id: userId,
            username: user.username,
            fullName: user.fullName,
            profilePicture: user.profilePicture,
          },
          post,
        });
      }
    } catch (error) {
      logger.error({ error, userId }, "Failed to send new post notification");
    }
  }

  /**
   * Send new story notification to followers
   * @param userId - User ID who created the story
   * @param story - Story data
   */
  static async sendNewStoryNotification(
    userId: string,
    story: any,
  ): Promise<void> {
    try {
      const user = await User.findById(userId).select(
        "followers username fullName profilePicture",
      );
      if (!user) return;

      // Emit to each follower's personal room
      for (const followerId of user.followers) {
        this.io.to(`user:${followerId.toString()}`).emit("new-story", {
          author: {
            id: userId,
            username: user.username,
            fullName: user.fullName,
            profilePicture: user.profilePicture,
          },
          story,
        });
      }
    } catch (error) {
      logger.error({ error, userId }, "Failed to send new story notification");
    }
  }

  /**
   * Send follow notification
   * @param followerId - User ID who followed
   * @param targetUserId - User who was followed
   */
  static sendFollowNotification(
    followerId: string,
    targetUserId: string,
  ): void {
    this.io.to(`user:${targetUserId}`).emit("new-follower", {
      followerId,
    });
  }

  /**
   * Send like notification
   * @param postAuthorId - Post author ID
   * @param likerId - User ID who liked
   * @param postId - Post ID
   */
  static sendLikeNotification(
    postAuthorId: string,
    likerId: string,
    postId: string,
  ): void {
    this.io.to(`user:${postAuthorId}`).emit("post-liked", {
      likerId,
      postId,
    });
  }

  /**
   * Send comment notification
   * @param postAuthorId - Post author ID
   * @param commenterId - User ID who commented
   * @param postId - Post ID
   * @param commentId - Comment ID
   */
  static sendCommentNotification(
    postAuthorId: string,
    commenterId: string,
    postId: string,
    commentId: string,
  ): void {
    this.io.to(`user:${postAuthorId}`).emit("post-commented", {
      commenterId,
      postId,
      commentId,
    });
  }

  /**
   * Get Socket.IO instance
   * @returns Socket.IO server instance
   */
  static getIO(): SocketServer {
    if (!this.io) {
      throw new Error("Socket.IO not initialized");
    }
    return this.io;
  }
}
