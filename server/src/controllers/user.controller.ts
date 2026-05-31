import { asyncHandler } from "@middleware/asyncHandler";
import { UserService } from "@services/user.service";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

export class UserController {
  static getUserProfile = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const currentUserId = req.user?._id.toString();

    const user = await UserService.getUserProfile(id, currentUserId);

    logger.info({ userId: id, currentUserId }, "User profile retrieved");

    res
      .status(200)
      .json(
        ApiResponse.success("User profile retrieved successfully", { user }),
      );
  });

  static followUser = asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = req.user?._id.toString();
    if (!currentUserId) {
      throw new Error("User not authenticated");
    }

    const targetUserId = req.params.id as string;

    await UserService.followUser(currentUserId, targetUserId);

    logger.info({ followerId: currentUserId, targetUserId }, "User followed");

    res.status(200).json(ApiResponse.success("User followed successfully"));
  });

  static unfollowUser = asyncHandler(async (req: Request, res: Response) => {
    const currentUserId = req.user?._id.toString();
    if (!currentUserId) {
      throw new Error("User not authenticated");
    }

    const targetUserId = req.params.id as string;

    await UserService.unfollowUser(currentUserId, targetUserId);

    logger.info({ followerId: currentUserId, targetUserId }, "User unfollowed");

    res.status(200).json(ApiResponse.success("User unfollowed successfully"));
  });

  static searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const q = req.query.q as string;
    const page = req.query.page as string;
    const limit = req.query.limit as string;

    if (!q) {
      throw new Error("Search query is required");
    }

    const result = await UserService.searchUsers(q, page, limit);

    logger.info({ query: q, page, limit }, "Users searched");

    res
      .status(200)
      .json(ApiResponse.success("Users retrieved successfully", result));
  });

  static getFollowers = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const page = req.query.page as string;
    const limit = req.query.limit as string;

    const result = await UserService.getFollowers(id, page, limit);

    logger.info({ userId: id, page, limit }, "User followers retrieved");

    res
      .status(200)
      .json(ApiResponse.success("Followers retrieved successfully", result));
  });

  static getFollowing = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const page = req.query.page as string;
    const limit = req.query.limit as string;

    const result = await UserService.getFollowing(id, page, limit);

    logger.info({ userId: id, page, limit }, "User following retrieved");

    res
      .status(200)
      .json(
        ApiResponse.success("Following users retrieved successfully", result),
      );
  });

  static getSuggestedUsers = asyncHandler(
    async (req: Request, res: Response) => {
      const currentUserId = req.user?._id.toString();
      if (!currentUserId) {
        throw new Error("User not authenticated");
      }

      const limitParam = req.query.limit as string;
      const limitNum = limitParam ? parseInt(limitParam, 10) : 10;

      const suggestions = await UserService.getSuggestedUsers(
        currentUserId,
        limitNum,
      );

      logger.info(
        { userId: currentUserId, limit: limitNum },
        "Suggested users retrieved",
      );

      res.status(200).json(
        ApiResponse.success("Suggested users retrieved successfully", {
          suggestions,
        }),
      );
    },
  );
}
