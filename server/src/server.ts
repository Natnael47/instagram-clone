import { connectDB } from "@config/database";
import { env } from "@config/env";
import { setupSocket } from "@socket/index";
import { logger } from "@utils/logger";
import http from "http";
import app from "./app";

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    const server = http.createServer(app);

    // Initialize Socket.IO
    await setupSocket(server);
    logger.info("Socket.IO initialized");

    server.listen(env.PORT, () => {
      logger.info(
        `Server running in ${env.NODE_ENV} mode
Port: ${env.PORT}
URL: http://localhost:${env.PORT}
Health: http://localhost:${env.PORT}/health
WebSocket: ws://localhost:${env.PORT}`,
      );
    });

    process.on("unhandledRejection", (err: Error) => {
      logger.error("UNHANDLED REJECTION - Shutting down...");
      logger.error(err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    process.on("uncaughtException", (err: Error) => {
      logger.error("UNCAUGHT EXCEPTION - Shutting down...");
      logger.error(err.message);
      process.exit(1);
    });

    process.on("SIGTERM", () => {
      logger.info("SIGTERM received. Shutting down gracefully...");
      server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
      });
    });

    process.on("SIGINT", () => {
      logger.info("SIGINT received. Shutting down gracefully...");
      server.close(() => {
        logger.info("Process terminated");
        process.exit(0);
      });
    });
  } catch (err) {
    logger.error("Failed to start server");
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};

startServer();
