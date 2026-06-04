import { connectDB } from "@config/database";
import { env } from "@config/env";
import { setupSocket } from "@socket/index";
import { CronManager } from "@utils/cronManager";
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

    // Initialize Cron Jobs (production only)
    CronManager.initialize();
    logger.info("Cron jobs initialized");

    server.listen(env.PORT, () => {
      logger.info(
        `Server running in ${env.NODE_ENV} mode
Port: ${env.PORT}
URL: http://localhost:${env.PORT}
Health: http://localhost:${env.PORT}/health
WebSocket: ws://localhost:${env.PORT}`,
      );
    });

    // Graceful shutdown handler
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      // Stop cron jobs
      CronManager.stopAll();

      server.close(() => {
        logger.info("HTTP server closed");
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("unhandledRejection", (err: Error) => {
      logger.error("UNHANDLED REJECTION - Shutting down...");
      logger.error(err.message);
      gracefulShutdown("UNHANDLED REJECTION");
    });

    process.on("uncaughtException", (err: Error) => {
      logger.error("UNCAUGHT EXCEPTION - Shutting down...");
      logger.error(err.message);
      gracefulShutdown("UNCAUGHT EXCEPTION");
    });

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (err) {
    logger.error("Failed to start server");
    logger.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};

startServer();
