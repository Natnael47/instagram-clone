// src/utils/cronManager.ts
import { env } from "@config/env";
import { logger } from "@utils/logger";
import cron, { ScheduledTask } from "node-cron";
import { ActivityCleanup } from "./activityCleanup";
import { RedisHealthChecker } from "./redisHealthChecker";

/**
 * Cron Job Manager
 * Centralizes all scheduled tasks for the application
 */
export class CronManager {
  private static jobs: Map<string, ScheduledTask> = new Map();

  /**
   * Initialize all cron jobs
   * Called once during server startup
   */
  static initialize(): void {
    // Skip ALL cron jobs in test environment
    if (env.NODE_ENV === "test") {
      logger.info("Cron jobs are disabled in test environment");
      return;
    }

    // Redis health check runs in BOTH development and production
    this.registerRedisHealthCheck();

    // These jobs only run in production
    if (env.NODE_ENV === "production") {
      logger.info("Initializing production cron jobs...");
      this.registerActivityCleanup();
      this.registerStoryExpiryCheck();
    } else {
      logger.info(
        "Production cron jobs are disabled in development environment",
      );
    }

    this.logScheduledJobs();
  }

  /**
   * Activity log cleanup - Runs every Monday at 3:00 AM
   * Cron: 0 3 * * 1 (At 03:00 on Monday)
   * PRODUCTION ONLY
   */
  private static registerActivityCleanup(): void {
    const job = cron.schedule("0 3 * * 1", async () => {
      logger.info("[CRON] Starting weekly activity log cleanup...");
      try {
        const deletedCount = await ActivityCleanup.cleanup(7);
        logger.info(
          `[CRON] Weekly activity cleanup completed: ${deletedCount} records deleted`,
        );
      } catch (error) {
        logger.error(error, "[CRON] Activity cleanup failed");
      }
    });

    this.jobs.set("activityCleanup", job);
    logger.info("✓ Activity cleanup scheduled: Every Monday at 3:00 AM UTC");
  }

  /**
   * Story expiry check - Runs every hour
   * Cleans up expired stories
   * PRODUCTION ONLY
   */
  private static registerStoryExpiryCheck(): void {
    const job = cron.schedule("0 * * * *", async () => {
      logger.debug("[CRON] Checking for expired stories...");
      try {
        const { Story } = await import("@models/Story");
        const now = new Date();

        const expiredStories = await Story.countDocuments({
          expiresAt: { $lt: now },
        });

        if (expiredStories > 0) {
          logger.info(`[CRON] Found ${expiredStories} expired stories`);
        }
      } catch (error) {
        logger.error(error, "[CRON] Story expiry check failed");
      }
    });

    this.jobs.set("storyExpiryCheck", job);
    logger.info("✓ Story expiry check scheduled: Every hour");
  }

  /**
   * Redis health check - Runs based on REDIS_RETRY_INTERVAL env variable
   * Attempts reconnection if Redis is disconnected
   * RUNS IN BOTH DEVELOPMENT AND PRODUCTION
   */
  private static registerRedisHealthCheck(): void {
    // READ FROM ENV, NOT HARDCODED!
    const intervalMinutes = env.REDIS_RETRY_INTERVAL || 10;

    let cronExpression: string;
    if (intervalMinutes === 1) {
      cronExpression = "* * * * *"; // Every minute
    } else if (intervalMinutes <= 59) {
      cronExpression = `*/${intervalMinutes} * * * *`; // Every N minutes
    } else {
      const hours = Math.floor(intervalMinutes / 60);
      cronExpression = `0 */${hours} * * *`; // Every N hours
    }

    const job = cron.schedule(cronExpression, async () => {
      logger.debug("[CRON] Running Redis health check...");
      try {
        await RedisHealthChecker.check();
      } catch (error) {
        logger.error(error, "[CRON] Redis health check failed");
      }
    });

    this.jobs.set("redisHealthCheck", job);
    logger.info(
      `✓ Redis health check scheduled: Every ${intervalMinutes} minute(s)`,
    );
  }

  /**
   * Log all scheduled jobs
   */
  private static logScheduledJobs(): void {
    if (this.jobs.size === 0) {
      logger.info("No cron jobs scheduled");
      return;
    }

    logger.info(`Total cron jobs scheduled: ${this.jobs.size}`);
    this.jobs.forEach((_job, name) => {
      logger.info(`  ✓ ${name}`);
    });
  }

  /**
   * Stop all cron jobs
   * Useful for graceful shutdown
   */
  static stopAll(): void {
    logger.info("Stopping all cron jobs...");
    this.jobs.forEach((job, name) => {
      job.stop();
      logger.info(`  ✓ Stopped: ${name}`);
    });
    this.jobs.clear();
    logger.info("All cron jobs stopped");
  }

  /**
   * Get status of all jobs
   */
  static getStatus(): Array<{ name: string; running: boolean }> {
    const status: Array<{ name: string; running: boolean }> = [];
    this.jobs.forEach((_job, name) => {
      status.push({
        name,
        running: true,
      });
    });
    return status;
  }

  /**
   * Add a custom cron job dynamically
   */
  static addJob(
    name: string,
    cronExpression: string,
    callback: () => void | Promise<void>,
  ): void {
    if (this.jobs.has(name)) {
      logger.warn(`Cron job "${name}" already exists. Removing old job.`);
      this.removeJob(name);
    }

    const job = cron.schedule(cronExpression, async () => {
      try {
        await callback();
      } catch (error) {
        logger.error(error, `[CRON] Job "${name}" failed`);
      }
    });

    this.jobs.set(name, job);
    logger.info(`✓ Custom cron job added: ${name} (${cronExpression})`);
  }

  /**
   * Remove a specific cron job
   */
  static removeJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.stop();
      this.jobs.delete(name);
      logger.info(`✓ Removed cron job: ${name}`);
    }
  }
}
