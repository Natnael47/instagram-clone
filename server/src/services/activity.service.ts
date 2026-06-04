// src/services/activity.service.ts
import { env } from "@config/env";
import { Activity } from "@models/Activity";
import { logger } from "@utils/logger";
import mongoose from "mongoose";
import type {
  ActivityLogParams,
  ActivityQuery,
  ActivityStats,
  ResourceType,
} from "../types/activity.types";

export class ActivityService {
  /**
   * Determine if activities should be saved to database
   */
  private static shouldSaveToDatabase(): boolean {
    return env.NODE_ENV === "production";
  }

  /**
   * Determine if activities should be logged to console
   */
  private static shouldLogToConsole(): boolean {
    return env.NODE_ENV !== "production";
  }

  /**
   * Main logging method - safe, non-blocking
   */
  static async log(params: ActivityLogParams): Promise<void> {
    const {
      user,
      action,
      resource,
      resourceId,
      details,
      status = "success",
      req,
    } = params;

    // Console logging for development/test
    if (this.shouldLogToConsole()) {
      const logMessage = {
        type: "activity",
        timestamp: new Date().toISOString(),
        environment: env.NODE_ENV,
        user,
        action,
        resource,
        resourceId: resourceId || "N/A",
        status,
        details: details || {},
      };

      if (status === "failure") {
        logger.warn(logMessage, `[ACTIVITY FAILED] ${action} on ${resource}`);
      } else {
        logger.info(logMessage, `[ACTIVITY] ${action} on ${resource}`);
      }
    }

    // Database logging for production
    if (!this.shouldSaveToDatabase()) {
      return;
    }

    // Fire-and-forget: Don't let activity logging block the main operation
    try {
      await Activity.create({
        user,
        action,
        resource,
        resourceId: resourceId || undefined,
        details: details || {},
        status,
        ip: req?.ip || req?.socket?.remoteAddress,
        userAgent: req?.headers?.["user-agent"],
        environment: env.NODE_ENV,
        metadata: params.metadata || {},
      });
    } catch (error) {
      // Log the error but never throw - activity logging must not break the app
      logger.error(
        { error, activityParams: { user, action, resource } },
        "Failed to save activity to database",
      );
    }
  }

  /**
   * Batch logging for high-volume operations
   */
  static async logBatch(activities: ActivityLogParams[]): Promise<void> {
    if (!this.shouldSaveToDatabase() || activities.length === 0) {
      return;
    }

    try {
      const batchId = new Date().toISOString();
      const docs = activities.map((params) => ({
        user: params.user,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details || {},
        status: params.status || "success",
        ip: params.req?.ip,
        userAgent: params.req?.headers?.["user-agent"],
        environment: env.NODE_ENV,
        metadata: { ...params.metadata, batchId },
      }));

      await Activity.insertMany(docs, { ordered: false });
    } catch (error) {
      logger.error(error, "Failed to save activity batch");
    }
  }

  /**
   * Get user activity with pagination
   */
  static async getUserActivity(userId: string, options: ActivityQuery = {}) {
    const {
      page = 1,
      limit = 20,
      action,
      resource,
      startDate,
      endDate,
      status,
    } = options;

    const query: Record<string, any> = { user: userId };

    if (action) query.action = action;
    if (resource) query.resource = resource;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-__v -updatedAt")
        .lean(),
      Activity.countDocuments(query),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Get resource-specific activity
   */
  static async getResourceActivity(
    resource: string,
    resourceId: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const query = {
      resource: resource as ResourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
    };

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "username avatar")
        .select("-__v")
        .lean(),
      Activity.countDocuments(query),
    ]);

    return {
      activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get activity statistics for a user
   */
  static async getUserStats(
    userId: string,
    days: number = 30,
  ): Promise<ActivityStats> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [stats, dailyActivity] = await Promise.all([
      // Action breakdown
      Activity.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate },
            status: "success",
          },
        },
        {
          $group: {
            _id: "$action",
            count: { $sum: 1 },
            lastActivity: { $max: "$createdAt" },
          },
        },
        { $sort: { count: -1 } },
      ]),
      // Daily activity
      Activity.aggregate([
        {
          $match: {
            user: new mongoose.Types.ObjectId(userId),
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const actionBreakdown: Record<string, number> = {};
    let lastActivity: Date | undefined;
    let totalActivities = 0;

    stats.forEach((stat: any) => {
      actionBreakdown[stat._id] = stat.count;
      totalActivities += stat.count;
      if (!lastActivity || stat.lastActivity > lastActivity) {
        lastActivity = stat.lastActivity;
      }
    });

    return {
      totalActivities,
      lastActivity,
      actionBreakdown,
      dailyActivity: dailyActivity.map((d: any) => ({
        date: d._id,
        count: d.count,
      })),
    };
  }

  /**
   * Delete old activities (manual cleanup)
   */
  static async cleanupOldActivities(
    retentionDays: number = 90,
  ): Promise<number> {
    if (env.NODE_ENV === "test") {
      return 0;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
      const result = await Activity.deleteMany({
        createdAt: { $lt: cutoffDate },
      });

      logger.info(
        `Cleaned up ${result.deletedCount} activities older than ${retentionDays} days`,
      );
      return result.deletedCount;
    } catch (error) {
      logger.error(error, "Failed to cleanup old activities");
      return 0;
    }
  }
}
