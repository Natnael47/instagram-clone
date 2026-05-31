import { io, Socket } from "socket.io-client";
import { env } from "@/config/env";
import { storage } from "@/utils/storage";

let socket: Socket | null = null;

export const socketClient = {
  async connect(): Promise<Socket> {
    if (socket?.connected) {
      return socket;
    }

    const token = await storage.getToken();
    if (!token) {
      throw new Error("No auth token available");
    }

    socket = io(env.SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    return new Promise((resolve, reject) => {
      socket!.on("connect", () => {
        console.log("Socket connected:", socket!.id);
        resolve(socket!);
      });

      socket!.on("connect_error", (error) => {
        console.error("Socket connection error:", error.message);
        reject(error);
      });

      socket!.on("disconnect", (reason) => {
        console.log("Socket disconnected:", reason);
      });
    });
  },

  disconnect(): void {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket(): Socket | null {
    return socket;
  },

  isConnected(): boolean {
    return socket?.connected ?? false;
  },
};