import { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { getIO, initializeSocket } from "./socketServer";

/**
 * Initialize Socket.IO with HTTP server
 * @param server - HTTP server instance
 */
export const setupSocket = async (
  server: HttpServer,
): Promise<SocketServer> => {
  return await initializeSocket(server);
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
