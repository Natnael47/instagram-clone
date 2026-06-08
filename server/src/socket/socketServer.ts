import { getRedisHealthStatus, isRedisAvailable } from "@config/redis";
import { socketConfig, SocketEvents } from "@config/socket";
import { User } from "@models/User";
import { verifyToken } from "@utils/generateToken";
import { logger } from "@utils/logger";
import { RedisStateManager } from "@utils/redisStateManager";
import { Server as HttpServer } from "http";
import { Socket, Server as SocketServer } from "socket.io";
import { chatHandler } from "./handlers/chatHandler";
import { feedHandler } from "./handlers/feedHandler";
import { onlineHandler } from "./handlers/onlineHandler";
import { typingHandler } from "./handlers/typingHandler";

let io: SocketServer;

export const initializeSocket = async (
  server: HttpServer,
): Promise<SocketServer> => {
  io = new SocketServer(server, socketConfig);

  // Log Redis status on Socket.IO initialization
  const redisStatus = getRedisHealthStatus();
  logger.info(
    {
      redisConnected: redisStatus.isConnected,
      redisState: redisStatus.state,
    },
    "Socket.IO server initializing",
  );

  // Log all incoming socket events for debugging
  io.engine.on("connection", (rawSocket) => {
    logger.info({ sid: rawSocket.id }, "Socket.IO raw connection received");
  });

  // Authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;

      if (!token || typeof token !== "string") {
        logger.warn("Socket auth failed: no token provided");
        return next(new Error("Authentication required"));
      }

      const decoded = verifyToken(token);
      if (!decoded || !decoded.id) {
        logger.warn("Socket auth failed: invalid token");
        return next(new Error("Invalid token"));
      }

      const user = await User.findById(decoded.id).select(
        "_id username fullName profilePicture",
      );
      if (!user) {
        logger.warn(
          { userId: decoded.id },
          "Socket auth failed: user not found",
        );
        return next(new Error("User not found"));
      }

      (socket as any).userId = user._id.toString();
      (socket as any).user = user;
      logger.info(
        { userId: user._id.toString(), username: user.username },
        "Socket authenticated",
      );
      next();
    } catch (error) {
      logger.error(error, "Socket auth error");
      next(new Error("Authentication failed"));
    }
  });

  // Handle new connections
  io.on(SocketEvents.CONNECTION, (socket: Socket) => {
    const userId = (socket as any).userId;
    const user = (socket as any).user;

    if (!userId) {
      socket.disconnect();
      return;
    }

    logger.info(
      { userId, username: user?.username, socketId: socket.id },
      "Socket connected",
    );

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Send Redis status to connected client (useful for debugging)
    if (isRedisAvailable()) {
      socket.emit("server:status", {
        redis: "connected",
        timestamp: new Date().toISOString(),
      });
    }

    // Log all events this socket receives
    socket.onAny((event, ...args) => {
      logger.info({ event, userId }, `Socket event received: ${event}`);
    });

    // Log all events this socket emits
    socket.onAnyOutgoing((event, ...args) => {
      logger.info({ event, userId }, `Socket event sent: ${event}`);
    });

    // Initialize handlers
    chatHandler(io, socket, userId);
    feedHandler(io, socket, userId);
    typingHandler(io, socket, userId);
    onlineHandler(io, socket, userId);

    // Handle disconnect
    socket.on(SocketEvents.DISCONNECT, (reason) => {
      logger.info(
        { userId, socketId: socket.id, reason },
        "Socket disconnected",
      );
    });

    // Handle errors
    socket.on(SocketEvents.ERROR, (error: Error) => {
      logger.error({ error, userId }, "Socket error");
    });
  });

  // Listen for Redis state changes
  const stateManager = RedisStateManager.getInstance();

  // Check Redis state every 30 seconds and notify if changed
  const redisCheckInterval = setInterval(() => {
    const currentState = stateManager.isConnected();

    // Broadcast server status to all connected clients
    io.emit("server:status", {
      redis: currentState ? "connected" : "disconnected",
      timestamp: new Date().toISOString(),
    });
  }, 30000);

  // Clean up interval on server shutdown
  io.engine.on("close", () => {
    clearInterval(redisCheckInterval);
  });

  logger.info("Socket.IO server initialized");

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

/**
 * Check if Redis is available for Socket.IO operations
 */
export const isSocketRedisEnabled = (): boolean => {
  return isRedisAvailable();
};

/**
 * Get current Redis health status
 */
export const getSocketRedisStatus = () => {
  return getRedisHealthStatus();
};
