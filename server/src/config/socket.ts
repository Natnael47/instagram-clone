import { env } from "@config/env";
import { ServerOptions } from "socket.io";

/**
 * Socket.IO configuration options
 */
export const socketConfig: Partial<ServerOptions> = {
  cors: {
    origin: env.CLIENT_URL || "http://localhost:19000",
    credentials: true,
    methods: ["GET", "POST"],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true,
};

/**
 * Socket events constants
 */
export const SocketEvents = {
  // Connection events
  CONNECTION: "connection",
  DISCONNECT: "disconnect",
  ERROR: "error",

  // Authentication events
  AUTHENTICATE: "authenticate",
  AUTHENTICATED: "authenticated",
  UNAUTHORIZED: "unauthorized",

  // Chat events
  JOIN_CONVERSATION: "join-conversation",
  LEAVE_CONVERSATION: "leave-conversation",
  SEND_MESSAGE: "send-message",
  NEW_MESSAGE: "new-message",
  MESSAGE_READ: "message-read",
  TYPING: "typing",
  USER_TYPING: "user-typing",

  // Feed events
  NEW_POST: "new-post",
  NEW_STORY: "new-story",
  POST_LIKED: "post-liked",
  POST_COMMENTED: "post-commented",

  // User status events
  USER_ONLINE: "user-online",
  USER_OFFLINE: "user-offline",
  USER_STATUS_CHANGE: "user-status-change",

  // Notification events
  NEW_FOLLOWER: "new-follower",
  NEW_NOTIFICATION: "new-notification",
} as const;

export type SocketEventType = (typeof SocketEvents)[keyof typeof SocketEvents];
