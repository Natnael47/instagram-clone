import React, { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { Socket } from "socket.io-client";
import { socketClient } from "@/api/client/socketClient";
import { useAuth } from "@/hooks/useAuth";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
});

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  const connect = useCallback(async (): Promise<void> => {
    try {
      const newSocket = await socketClient.connect();
      setSocket(newSocket);
      setIsConnected(true);

      newSocket.on("disconnect", () => {
        setIsConnected(false);
      });

      newSocket.on("connect", () => {
        setIsConnected(true);
      });
    } catch (error) {
      console.error("Failed to connect socket:", error);
    }
  }, []);

  const disconnect = useCallback((): void => {
    socketClient.disconnect();
    setSocket(null);
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      disconnect();
    }
    return () => {
      disconnect();
    };
  }, [isAuthenticated]);

  const value = useMemo(() => ({
    socket,
    isConnected,
    connect,
    disconnect,
  }), [socket, isConnected, connect, disconnect]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};