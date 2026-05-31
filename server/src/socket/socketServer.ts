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

export const initializeSocket = async (
  server: HttpServer,
): Promise<SocketServer> => {
  io = new SocketServer(server, socketConfig);

  // Log all incoming socket events for debugging
  io.engine.on("connection", (rawSocket) => {
    logger.info({ sid: rawSocket.id }, "Socket.IO raw connection received");
  });

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

    socket.join(`user:${userId}`);

    // Log all events this socket receives
    socket.onAny((event, ...args) => {
      logger.info({ event, userId }, `Socket event received: ${event}`);
    });

    // Log all events this socket emits
    socket.onAnyOutgoing((event, ...args) => {
      logger.info({ event, userId }, `Socket event sent: ${event}`);
    });

    chatHandler(io, socket, userId);
    feedHandler(io, socket, userId);
    typingHandler(io, socket, userId);
    onlineHandler(io, socket, userId);

    socket.on(SocketEvents.DISCONNECT, (reason) => {
      logger.info(
        { userId, socketId: socket.id, reason },
        "Socket disconnected",
      );
    });

    socket.on(SocketEvents.ERROR, (error: Error) => {
      logger.error({ error, userId }, "Socket error");
    });
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
