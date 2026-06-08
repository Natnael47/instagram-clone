import { getRedisClient, isRedisAvailable } from "@config/redis";
import { createAdapter } from "@socket.io/redis-adapter";
import { logger } from "@utils/logger";
import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { getIO, initializeSocket } from "./socketServer";

/**
 * Initialize Socket.IO with HTTP server
 * Uses Redis adapter if available, falls back to in-memory
 * @param server - HTTP server instance
 */
export const setupSocket = async (
  server: HttpServer,
): Promise<SocketServer> => {
  const io = await initializeSocket(server);

  // Try to use Redis adapter for multi-instance support
  if (isRedisAvailable()) {
    try {
      const pubClient = getRedisClient();
      const subClient = pubClient?.duplicate();

      if (pubClient && subClient) {
        io.adapter(createAdapter(pubClient, subClient));
        logger.info("Socket.IO using Redis adapter for multi-instance support");
      }
    } catch (error) {
      logger.warn(
        { err: error instanceof Error ? error.message : String(error) },
        "Failed to setup Redis adapter for Socket.IO - using in-memory adapter",
      );
    }
  } else {
    logger.info("Socket.IO using in-memory adapter (Redis not available)");
  }

  return io;
};

/**
 * Get Socket.IO instance for emitting events from services
 */
export { getIO };

/**
 * Socket event constants
 */
export { SocketEvents } from "@config/socket";

/**
 * Socket types
 */
export type {
  AuthenticatedPayload,
  AuthenticatePayload,
  NewMessagePayload,
  NewPostPayload,
  NewStoryPayload,
  SendMessagePayload,
  TypingPayload,
  UserStatusChangePayload,
} from "../types/socket";
