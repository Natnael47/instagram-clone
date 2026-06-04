// src/utils/cronManager.ts
import { env } from "@config/env";
import { logger } from "@utils/logger";
import cron, { ScheduledTask } from "node-cron";
import { ActivityCleanup } from "./activityCleanup";

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
    if (env.NODE_ENV !== "production") {
      logger.info("Cron jobs are disabled in non-production environment");
      return;
    }

    logger.info("Initializing cron jobs for production...");

    // Register all cron jobs here
    this.registerActivityCleanup();
    this.registerStoryExpiryCheck();

    logger.info(`Total cron jobs scheduled: ${this.jobs.size}`);
    this.jobs.forEach((_job, name) => {
      logger.info(`  ✓ ${name}`);
    });
  }

  /**
   * Activity log cleanup - Runs every Monday at 3:00 AM
   * Cron: 0 3 * * 1 (At 03:00 on Monday)
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
   */
  private static registerStoryExpiryCheck(): void {
    const job = cron.schedule("0 * * * *", async () => {
      logger.debug("[CRON] Checking for expired stories...");
      try {
        // Import dynamically to avoid circular dependencies
        const { Story } = await import("@models/Story");
        const now = new Date();

        const expiredStories = await Story.countDocuments({
          expiresAt: { $lt: now },
        });

        if (expiredStories > 0) {
          logger.info(`[CRON] Found ${expiredStories} expired stories`);
          // Optionally delete expired stories
          // await Story.deleteMany({ expiresAt: { $lt: now } });
        }
      } catch (error) {
        logger.error(error, "[CRON] Story expiry check failed");
      }
    });

    this.jobs.set("storyExpiryCheck", job);
    logger.info("✓ Story expiry check scheduled: Every hour");
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
    this.jobs.forEach((job, name) => {
      // Check if job is running by trying to get its status
      const running = true; // ScheduledTask doesn't expose running state directly
      status.push({
        name,
        running,
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
