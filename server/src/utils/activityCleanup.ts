// src/utils/activityCleanup.ts
import { env } from "@config/env";
import { Activity } from "@models/Activity";
import { logger } from "@utils/logger";

/**
 * Activity cleanup utility
 * Manages the lifecycle of activity records
 */
export class ActivityCleanup {
  /**
   * Clean up old activity records
   * @param retentionDays - Number of days to keep activities (default: 7)
   * @returns Number of deleted records
   */
  static async cleanup(retentionDays: number = 7): Promise<number> {
    // Never run cleanup in test environment
    if (env.NODE_ENV === "test") {
      logger.info("Activity cleanup skipped in test environment");
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      logger.info(
        `Starting activity cleanup: removing records older than ${retentionDays} days (before ${cutoffDate.toISOString()})`,
      );

      // Get count before deletion for logging
      const countBefore = await Activity.countDocuments({
        createdAt: { $lt: cutoffDate },
      });

      if (countBefore === 0) {
        logger.info("No old activities to clean up");
        return 0;
      }

      logger.info(`Found ${countBefore} activities to delete`);

      // Delete in batches to avoid performance issues
      const batchSize = 10000;
      let totalDeleted = 0;

      while (true) {
        const result = await Activity.deleteMany({
          createdAt: { $lt: cutoffDate },
        }).limit(batchSize);

        totalDeleted += result.deletedCount;

        if (result.deletedCount < batchSize) {
          break;
        }

        // Small delay between batches to reduce database load
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      logger.info(
        `Activity cleanup completed: ${totalDeleted} records deleted (retention: ${retentionDays} days)`,
      );
      return totalDeleted;
    } catch (error) {
      logger.error(error, "Activity cleanup failed");
      return 0;
    }
  }

  /**
   * Get activity collection statistics
   */
  static async getStats() {
    try {
      const [totalCount, oldestActivity, newestActivity] = await Promise.all([
        Activity.countDocuments(),
        Activity.findOne().sort({ createdAt: 1 }).select("createdAt").lean(),
        Activity.findOne().sort({ createdAt: -1 }).select("createdAt").lean(),
      ]);

      // Calculate collection age
      const collectionAge = oldestActivity?.createdAt
        ? Math.floor((Date.now() - new Date(oldestActivity.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        totalCount,
        oldestActivity: oldestActivity?.createdAt,
        newestActivity: newestActivity?.createdAt,
        collectionAgeDays: collectionAge,
        collectionSizeMB: 'N/A',
        avgDocumentSizeBytes: 'N/A',
        totalIndexes: 'N/A',
      };
    } catch (error) {
      logger.error(error, "Failed to get activity stats");
      return null;
    }
  }

  /**
   * Get activity breakdown by action type
   */
  static async getActionBreakdown(): Promise<Record<string, number>> {
    try {
      const breakdown = await Activity.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      const result: Record<string, number> = {};
      breakdown.forEach((item: any) => {
        result[item._id] = item.count;
      });

      return result;
    } catch (error) {
      logger.error(error, "Failed to get action breakdown");
      return {};
    }
  }
}

/**
 * Standalone execution for manual cleanup
 * Can be run as: bun run src/utils/activityCleanup.ts [days] [command]
 * Examples:
 *   bun run src/utils/activityCleanup.ts        # Cleanup with default 7 days
 *   bun run src/utils/activityCleanup.ts 30     # Cleanup with 30 days retention
 *   bun run src/utils/activityCleanup.ts stats  # Show statistics
 *   bun run src/utils/activityCleanup.ts breakdown # Show action breakdown
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];

  if (arg === 'stats') {
    ActivityCleanup.getStats()
      .then((stats) => {
        console.log('Activity Collection Statistics:');
        console.log(JSON.stringify(stats, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('Failed to get stats:', error);
        process.exit(1);
      });
  } else if (arg === 'breakdown') {
    ActivityCleanup.getActionBreakdown()
      .then((breakdown) => {
        console.log('Activity Action Breakdown:');
        console.log(JSON.stringify(breakdown, null, 2));
        process.exit(0);
      })
      .catch((error) => {
        console.error('Failed to get breakdown:', error);
        process.exit(1);
      });
  } else {
    // Default: run cleanup with specified days or default 7
    const days = arg ? parseInt(arg, 10) : 7;
    ActivityCleanup.cleanup(days)
      .then((count) => {
        console.log(`Manual cleanup completed: ${count} records deleted`);
        process.exit(0);
      })
      .catch((error) => {
        console.error("Manual cleanup failed:", error);
        process.exit(1);
      });
  }
}