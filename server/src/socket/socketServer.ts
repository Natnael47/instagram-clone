import { socketConfig, SocketEvents } from "@config/socket";
import { User } from "@models/User";
import { verifyToken } from "@utils/generateToken";
import { logger } from "@utils/logger";
import { Server as HttpServer } from "http";
import { Socket, Server as SocketServer } from "socket.io";
import { chatHandler } from "./handlers/chatHandler";
import { feedHandler } from "./handlers/feedHandler";
import { onlineHandler } from "./handlers/onlineHandler";
import { typingHandler } from "./handlers/typingHandler";

let io: SocketServer;

/**
 * Initialize Socket.IO server
 * @param server - HTTP server instance
 */
export const initializeSocket = async (
  server: HttpServer,
): Promise<SocketServer> => {
  io = new SocketServer(server, socketConfig);

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token || typeof token !== "string") {
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

  // Connection handler
  io.on(SocketEvents.CONNECTION, (socket: Socket) => {
    const userId = (socket as any).userId;
    const user = (socket as any).user;

    if (!userId) {
      socket.disconnect();
      return;
    }

    logger.info({ userId, socketId: socket.id }, "Socket connected");

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Initialize handlers
    chatHandler(io, socket, userId);
    feedHandler(io, socket, userId);
    typingHandler(io, socket, userId);
    onlineHandler(io, socket, userId);

    // Handle disconnect
    socket.on(SocketEvents.DISCONNECT, () => {
      logger.info({ userId, socketId: socket.id }, "Socket disconnected");
    });

    // Handle errors
    socket.on(SocketEvents.ERROR, (error: Error) => {
      logger.error({ error, userId }, "Socket error");
    });
  });

  logger.info("Socket.IO server initialized");

  return io;
};

/**
 * Get Socket.IO instance
 */
export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};
