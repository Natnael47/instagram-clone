import { env } from "@config/env";
import { isRedisAvailable } from "@config/redis";
import { asyncHandler } from "@middleware/asyncHandler";
import { protect } from "@middleware/auth.middleware";
import { ApiResponse } from "@utils/ApiResponse";
import { RedisHealthChecker } from "@utils/redisHealthChecker";
import { Router } from "express";
import activityRoutes from "./activity.routes";
import authRoutes from "./auth.routes";
import commentRoutes from "./comment.routes";
import feedRoutes from "./feed.routes";
import messageRoutes from "./message.routes";
import notificationRoutes from "./notification.routes";
import postRoutes from "./post.routes";
import storyRoutes from "./story.routes";
import userRoutes from "./user.routes";

const router = Router();

// Mount all routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/posts", postRoutes);
router.use("/feed", feedRoutes);
router.use("/stories", storyRoutes);
router.use("/comments", commentRoutes);
router.use("/messages", messageRoutes);
router.use("/notifications", notificationRoutes);
router.use("/activity", activityRoutes);

// ============================================
// Health & Status Routes
// ============================================

/**
 * GET /api/v1/health
 * Public health check endpoint
 */
router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json(
      ApiResponse.success("Server is healthy", {
        status: "ok",
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        uptime: process.uptime(),
      }),
    );
  }),
);

/**
 * GET /api/v1/health/redis
 * Redis health status (protected - requires auth)
 */
router.get(
  "/health/redis",
  protect,
  asyncHandler(async (_req, res) => {
    const healthReport = RedisHealthChecker.getHealthReport();

    res.json(
      ApiResponse.success("Redis health status retrieved", healthReport),
    );
  }),
);

/**
 * POST /api/v1/health/redis/reconnect
 * Force Redis reconnection (protected - requires auth)
 */
router.post(
  "/health/redis/reconnect",
  protect,
  asyncHandler(async (_req, res) => {
    const reconnected = await RedisHealthChecker.forceReconnect();

    res.json(
      ApiResponse.success(
        reconnected
          ? "Redis reconnected successfully"
          : "Redis reconnection failed",
        {
          reconnected,
          timestamp: new Date().toISOString(),
        },
      ),
    );
  }),
);

/**
 * GET /api/v1/health/system
 * Full system health status (protected - requires auth)
 */
router.get(
  "/health/system",
  protect,
  asyncHandler(async (_req, res) => {
    const mongoose = await import("mongoose");
    const dbState = mongoose.default.connection.readyState;
    const dbStates: Record<number, string> = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const redisStatus = isRedisAvailable();
    const redisReport = RedisHealthChecker.getHealthReport();

    res.json(
      ApiResponse.success("System health status retrieved", {
        server: {
          uptime: process.uptime(),
          environment: env.NODE_ENV,
          memoryUsage: process.memoryUsage(),
        },
        database: {
          state: dbStates[dbState] || "unknown",
          connected: dbState === 1,
        },
        redis: {
          enabled: env.REDIS_ENABLED,
          ...redisReport,
        },
        timestamp: new Date().toISOString(),
      }),
    );
  }),
);

export default router;
