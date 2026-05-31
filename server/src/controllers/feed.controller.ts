import { asyncHandler } from "@middleware/asyncHandler";
import { FeedService } from "@services/feed.service";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

/**
 * Feed Controller
 * Handles feed-related HTTP requests
 */
export class FeedController {
  /**
   * Get personalized feed for authenticated user
   * GET /api/v1/feed
   */
  static getPersonalizedFeed = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id.toString();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const { page, limit } = req.query;

      const result = await FeedService.getPersonalizedFeed(
        userId,
        page as string,
        limit as string,
      );

      logger.info(
        { userId, page, limit, total: result.pagination.total },
        "Personalized feed retrieved",
      );

      res
        .status(200)
        .json(
          ApiResponse.success(
            "Personalized feed retrieved successfully",
            result,
          ),
        );
    },
  );

  /**
   * Get global feed (all posts)
   * GET /api/v1/feed/global
   */
  static getGlobalFeed = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    const { page, limit } = req.query;

    const result = await FeedService.getGlobalFeed(
      userId,
      page as string,
      limit as string,
    );

    logger.info(
      { userId, page, limit, total: result.pagination.total },
      "Global feed retrieved",
    );

    res
      .status(200)
      .json(ApiResponse.success("Global feed retrieved successfully", result));
  });

  /**
   * Get feed by specific user IDs
   * POST /api/v1/feed/by-users
   */
  static getFeedByUserIds = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id.toString();
      const { userIds, page, limit } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error("At least one user ID is required");
      }

      const result = await FeedService.getFeedByUserIds(
        userIds,
        userId,
        page as string,
        limit as string,
      );

      logger.info(
        { userId, userCount: userIds.length, page, limit },
        "Feed by user IDs retrieved",
      );

      res
        .status(200)
        .json(ApiResponse.success("Feed retrieved successfully", result));
    },
  );

  /**
   * Get trending feed (most liked posts)
   * GET /api/v1/feed/trending
   */
  static getTrendingFeed = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    const { page, limit } = req.query;

    // Use global feed but with different sort (implement in service if needed)
    // For now, use global feed
    const result = await FeedService.getGlobalFeed(
      userId,
      page as string,
      limit as string,
    );

    logger.info({ userId, page, limit }, "Trending feed retrieved");

    res
      .status(200)
      .json(
        ApiResponse.success("Trending feed retrieved successfully", result),
      );
  });
}
