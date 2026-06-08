// src/config/redis.ts
import { logger } from "@utils/logger";
import { RedisStateManager } from "@utils/redisStateManager";
import Redis from "ioredis";
import type { RedisConfig } from "../types/redis.types";
import { env } from "./env";

/**
 * Redis client instance
 */
let redisClient: Redis | null = null;

/**
 * Get Redis configuration from environment
 */
function getRedisConfig(): RedisConfig {
  return {
    enabled: env.REDIS_ENABLED === true,
    url: env.REDIS_URL || "redis://localhost:6379",
    password: env.REDIS_PASSWORD,
    db: env.REDIS_DB ? parseInt(String(env.REDIS_DB), 10) : 0,
    retryIntervalMinutes: env.REDIS_RETRY_INTERVAL
      ? parseInt(String(env.REDIS_RETRY_INTERVAL), 10)
      : 10,
    maxRetriesPerAttempt: env.REDIS_MAX_RETRIES
      ? parseInt(String(env.REDIS_MAX_RETRIES), 10)
      : 3,
    connectTimeoutMs: env.REDIS_CONNECT_TIMEOUT
      ? parseInt(String(env.REDIS_CONNECT_TIMEOUT), 10)
      : 5000,
  };
}

/**
 * Create Redis client with event handlers
 * All errors are caught and logged - never throw
 */
function createRedisClient(config: RedisConfig): Redis {
  const client = new Redis(config.url, {
    password: config.password || undefined,
    db: config.db,
    maxRetriesPerRequest: null, // We handle retries ourselves
    connectTimeout: config.connectTimeoutMs,
    lazyConnect: true, // Don't connect immediately
    retryStrategy: () => null, // Disable auto-retry, we handle it
    enableOfflineQueue: false, // Don't queue commands when disconnected
  });

  // Connection successful
  client.on("connect", () => {
    RedisStateManager.getInstance().setConnected();
    logger.info("Redis connected successfully");
  });

  // Connection ready
  client.on("ready", () => {
    logger.info("Redis client ready");
  });

  // Connection error - CATCH ALL, NEVER THROW
  client.on("error", (error: Error) => {
    // Only log as error if we're supposed to be connected
    const stateManager = RedisStateManager.getInstance();
    if (stateManager.isConnected()) {
      logger.error({ err: error.message }, "Redis connection error");
    } else {
      logger.debug({ err: error.message }, "Redis error (not connected)");
    }
    // Don't change state here - let close/reconnecting events handle it
  });

  // Connection closed
  client.on("close", () => {
    RedisStateManager.getInstance().setDisconnected();
    logger.warn("Redis connection closed - server continues without Redis");
  });

  // Reconnecting
  client.on("reconnecting", () => {
    RedisStateManager.getInstance().setReconnecting();
    logger.info("Redis reconnecting...");
  });

  // End event
  client.on("end", () => {
    RedisStateManager.getInstance().setDisconnected();
    logger.info("Redis connection ended");
  });

  return client;
}

/**
 * Initialize Redis connection
 * Non-blocking - never throws
 */
export async function initializeRedis(): Promise<boolean> {
  const config = getRedisConfig();

  if (!config.enabled) {
    logger.info("Redis is disabled via configuration");
    return false;
  }

  logger.info(`Initializing Redis connection to ${config.url}`);

  try {
    redisClient = createRedisClient(config);

    const stateManager = RedisStateManager.getInstance();
    stateManager.setConnecting();

    // Attempt connection with timeout
    const connectionPromise = redisClient.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Redis connection timeout")),
        config.connectTimeoutMs,
      );
    });

    await Promise.race([connectionPromise, timeoutPromise]);

    stateManager.setConnected();
    logger.info("Redis initialized successfully ✓");
    return true;
  } catch (error) {
    RedisStateManager.getInstance().setDisconnected();
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      "Redis initialization failed - continuing without Redis",
    );

    // Clean up failed client
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      redisClient = null;
    }

    return false;
  }
}

/**
 * Attempt to reconnect to Redis
 * Used by health checker cron job
 */
export async function reconnectRedis(): Promise<boolean> {
  const config = getRedisConfig();

  if (!config.enabled) {
    return false;
  }

  const stateManager = RedisStateManager.getInstance();

  // Only reconnect if disconnected or in error state
  if (stateManager.isConnected()) {
    logger.debug("Redis already connected, skipping reconnect");
    return true;
  }

  logger.info("Attempting Redis reconnection...");
  stateManager.setReconnecting();

  try {
    // Clean up old client if exists
    if (redisClient) {
      try {
        redisClient.disconnect();
      } catch {
        // Ignore cleanup errors
      }
      redisClient = null;
    }

    // Create new client
    redisClient = createRedisClient(config);
    stateManager.setConnecting();

    // Attempt connection with timeout
    const connectionPromise = redisClient.connect();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("Redis reconnection timeout")),
        config.connectTimeoutMs,
      );
    });

    await Promise.race([connectionPromise, timeoutPromise]);

    stateManager.setConnected();
    logger.info("Redis reconnected successfully ✓");
    return true;
  } catch (error) {
    stateManager.setDisconnected();
    stateManager.recordFailedAttempt();
    logger.warn(
      { err: error instanceof Error ? error.message : String(error) },
      "Redis reconnection failed - will retry later",
    );
    return false;
  }
}

/**
 * Disconnect from Redis gracefully
 * Never throws - safe to call even if already disconnected
 */
export async function disconnectRedis(): Promise<void> {
  if (!redisClient) {
    return;
  }

  try {
    // Check if connection is still active before trying to quit
    if (redisClient.status === "ready" || redisClient.status === "connect") {
      await redisClient.quit();
    } else {
      // If not connected, just disconnect
      redisClient.disconnect();
    }
  } catch (error) {
    // Just log, don't throw - we're shutting down anyway
    logger.debug({ err: error }, "Error during Redis disconnect (ignored)");
  } finally {
    redisClient = null;
    RedisStateManager.getInstance().setDisconnected();
    logger.info("Redis disconnected");
  }
}

/**
 * Get Redis client instance
 * Returns null if not connected
 */
export function getRedisClient(): Redis | null {
  const stateManager = RedisStateManager.getInstance();
  if (!stateManager.isConnected() || !redisClient) {
    return null;
  }
  // Double check the client is actually ready
  if (redisClient.status !== "ready") {
    return null;
  }
  return redisClient;
}

/**
 * Check if Redis is available and connected
 */
export function isRedisAvailable(): boolean {
  if (!redisClient) return false;
  return (
    RedisStateManager.getInstance().isConnected() &&
    redisClient.status === "ready"
  );
}

/**
 * Get Redis health status
 */
export function getRedisHealthStatus() {
  return RedisStateManager.getInstance().getHealthStatus();
}
