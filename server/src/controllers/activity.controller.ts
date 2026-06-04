// src/controllers/activity.controller.ts
import { asyncHandler } from "@middleware/asyncHandler";
import { ActivityService } from "@services/activity.service";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { Request, Response } from "express";
import type { ActivityAction, ResourceType } from "../types/activity.types";

export class ActivityController {
  /**
   * Get current user's activity history
   * GET /api/v1/activity/my-activity
   */
  static getMyActivity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const { page, limit, action, resource, startDate, endDate, status } =
        req.query;

      const result = await ActivityService.getUserActivity(userId, {
        page: page ? parseInt(page as string, 10) : 1,
        limit: limit ? Math.min(parseInt(limit as string, 10), 100) : 20,
        action: action as ActivityAction,
        resource: resource as ResourceType,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        status: status as "success" | "failure",
      });

      // Fixed: message first, data second
      res
        .status(200)
        .json(
          ApiResponse.success(
            "Activity history retrieved successfully",
            result,
          ),
        );
    },
  );

  /**
   * Get activity for a specific resource
   * GET /api/v1/activity/resource/:type/:id
   */
  static getResourceActivity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { type, id } = req.params;
      const { page, limit } = req.query;

      // Validate resource type
      const validResources = [
        "user",
        "post",
        "comment",
        "story",
        "message",
        "notification",
        "conversation",
      ];

      // Fix: Ensure type is a single string
      const resourceType = Array.isArray(type) ? type[0] : type;
      const resourceId = Array.isArray(id) ? id[0] : id;

      if (!resourceType || !validResources.includes(resourceType)) {
        throw ApiError.badRequest("Invalid resource type");
      }

      if (!resourceId) {
        throw ApiError.badRequest("Resource ID is required");
      }

      const result = await ActivityService.getResourceActivity(
        resourceType,
        resourceId,
        {
          page: page ? parseInt(page as string, 10) : 1,
          limit: limit ? Math.min(parseInt(limit as string, 10), 50) : 20,
        },
      );

      // Fixed: message first, data second
      res
        .status(200)
        .json(
          ApiResponse.success(
            "Resource activity retrieved successfully",
            result,
          ),
        );
    },
  );

  /**
   * Get activity statistics for current user
   * GET /api/v1/activity/stats
   */
  static getActivityStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user!._id.toString();
      const daysParam = req.query.days as string;
      const days = daysParam ? parseInt(daysParam, 10) : 30;

      if (days < 1 || days > 365) {
        throw ApiError.badRequest("Days must be between 1 and 365");
      }

      const stats = await ActivityService.getUserStats(userId, days);

      // Fixed: message first, data second
      res
        .status(200)
        .json(
          ApiResponse.success(
            `Activity statistics for the last ${days} days retrieved successfully`,
            stats,
          ),
        );
    },
  );

  /**
   * Get recent activity feed (for admin/moderation)
   * GET /api/v1/activity/recent
   */
  static getRecentActivity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const limitParam = req.query.limit as string;
      const limit = limitParam ? Math.min(parseInt(limitParam, 10), 100) : 50;
      const action = req.query.action as ActivityAction | undefined;

      const activities = await ActivityService.getUserActivity(
        req.user!._id.toString(),
        {
          limit,
          action,
        },
      );

      // Fixed: message first, data second
      res
        .status(200)
        .json(
          ApiResponse.success(
            "Recent activity retrieved successfully",
            activities,
          ),
        );
    },
  );
}
