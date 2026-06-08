import { connectDB } from "@config/database";
import { env } from "@config/env";
import { disconnectRedis, initializeRedis } from "@config/redis";
import { setupSocket } from "@socket/index";
import { CronManager } from "@utils/cronManager";
import { logger } from "@utils/logger";
import http from "http";
import app from "./app";

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB (required)
    await connectDB();
    logger.info("MongoDB connected");

    // Initialize Redis (non-blocking, optional)
    const redisConnected = await initializeRedis();
    if (redisConnected) {
      logger.info("Redis initialized successfully ✓");
    } else {
      logger.info("Redis not available - continuing without Redis");
    }

    const server = http.createServer(app);

    // Initialize Socket.IO (with conditional Redis adapter)
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

      // Disconnect Redis (safe, never throws)
      await disconnectRedis();

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

    // Unhandled rejection - log but DON'T shut down for Redis errors
    process.on("unhandledRejection", (err: Error) => {
      logger.error(
        { err: err.message, stack: err.stack },
        "UNHANDLED REJECTION",
      );

      // Only shutdown for critical errors (not Redis)
      if (err.message?.includes("Redis") || err.message?.includes("ioredis")) {
        logger.warn("Redis-related unhandled rejection - keeping server alive");
        return;
      }

      // For other unhandled rejections, shutdown gracefully
      gracefulShutdown("UNHANDLED REJECTION");
    });

    process.on("uncaughtException", (err: Error) => {
      logger.error(
        { err: err.message, stack: err.stack },
        "UNCAUGHT EXCEPTION",
      );

      // Don't shutdown for Redis connection errors
      if (
        err.message?.includes("Redis") ||
        err.message?.includes("ECONNREFUSED")
      ) {
        logger.warn("Redis-related exception - keeping server alive");
        return;
      }

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
