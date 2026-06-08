// src/utils/redisHealthChecker.ts
import { env } from "@config/env";
import { getRedisHealthStatus, reconnectRedis } from "@config/redis";
import { logger } from "@utils/logger";
import { RedisConnectionState } from "../types/redis.types";
import { RedisStateManager } from "./redisStateManager";

/**
 * Redis health checker
 * Runs periodic health checks and reconnection attempts
 */
export class RedisHealthChecker {
  /**
   * Perform a health check
   * Called by cron job every 10 minutes
   */
  static async check(): Promise<void> {
    // Skip if Redis is disabled
    if (!env.REDIS_ENABLED) {
      logger.debug("Redis health check skipped - Redis is disabled");
      return;
    }

    const stateManager = RedisStateManager.getInstance();
    const currentState = stateManager.getState();

    logger.debug(`Redis health check - Current state: ${currentState}`);

    // If already connected, just log status
    if (stateManager.isConnected()) {
      const status = getRedisHealthStatus();
      logger.debug(
        { uptime: `${status.uptimeSeconds}s` },
        "Redis health check: Connected ✓",
      );
      return;
    }

    // If disconnected or in error state, try to reconnect
    if (
      currentState === RedisConnectionState.DISCONNECTED ||
      currentState === RedisConnectionState.ERROR ||
      currentState === RedisConnectionState.RECONNECTING
    ) {
      logger.info("Redis health check: Attempting reconnection...");

      const reconnected = await reconnectRedis();

      if (reconnected) {
        logger.info("Redis health check: Reconnection successful ✓");
      } else {
        logger.warn(
          {
            state: currentState,
            attempts: stateManager.getHealthStatus().totalReconnectAttempts,
          },
          "Redis health check: Reconnection failed - will retry",
        );
      }
    }
  }

  /**
   * Force a reconnection attempt regardless of current state
   */
  static async forceReconnect(): Promise<boolean> {
    if (!env.REDIS_ENABLED) {
      logger.info("Redis force reconnect skipped - Redis is disabled");
      return false;
    }

    logger.info("Forcing Redis reconnection...");
    return reconnectRedis();
  }

  /**
   * Get detailed health report
   */
  static getHealthReport(): Record<string, unknown> {
    const status = getRedisHealthStatus();
    const isEnabled = env.REDIS_ENABLED === true;

    return {
      enabled: isEnabled,
      connected: status.isConnected,
      state: status.state,
      uptime:
        status.uptimeSeconds > 0
          ? `${Math.floor(status.uptimeSeconds / 3600)}h ${Math.floor((status.uptimeSeconds % 3600) / 60)}m`
          : "0m",
      lastConnected: status.lastConnectedAt?.toISOString() || null,
      lastDisconnected: status.lastDisconnectedAt?.toISOString() || null,
      reconnectionStats: {
        total: status.totalReconnectAttempts,
        successful: status.successfulReconnects,
        failed: status.failedReconnects,
      },
    };
  }
}
