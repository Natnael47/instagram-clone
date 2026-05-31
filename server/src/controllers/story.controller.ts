import { asyncHandler } from "@middleware/asyncHandler";
import { StoryService } from "@services/story.service";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

export class StoryController {
  static createStory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const file = req.file;
    if (!file) {
      throw new Error("Image file is required");
    }

    const userIdStr = userId.toString();
    const story = await StoryService.createStory(userIdStr, file);

    logger.info({ storyId: story._id, userId: userIdStr }, "New story created");

    res
      .status(201)
      .json(ApiResponse.success("Story created successfully", { story }));
  });

  static getFollowedStories = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const userIdStr = userId.toString();
      const stories = await StoryService.getFollowedStories(userIdStr);

      logger.info(
        { userId: userIdStr, storyCount: stories.length },
        "Followed stories retrieved",
      );

      res
        .status(200)
        .json(
          ApiResponse.success("Stories retrieved successfully", { stories }),
        );
    },
  );

  static getMyStories = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const userIdStr = userId.toString();
    const stories = await StoryService.getUserStories(userIdStr);

    logger.info(
      { userId: userIdStr, storyCount: stories.length },
      "User's own stories retrieved",
    );

    res
      .status(200)
      .json(
        ApiResponse.success("Your stories retrieved successfully", { stories }),
      );
  });

  static getUserStories = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;

    const stories = await StoryService.getUserStories(userId);

    logger.info(
      { userId, storyCount: stories.length },
      "User stories retrieved",
    );

    res.status(200).json(
      ApiResponse.success("User stories retrieved successfully", {
        stories,
      }),
    );
  });

  static viewStory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const storyId = req.params.storyId as string;

    const userIdStr = userId.toString();
    const story = await StoryService.viewStory(storyId, userIdStr);

    logger.info({ storyId, userId: userIdStr }, "Story viewed");

    res
      .status(200)
      .json(ApiResponse.success("Story viewed successfully", { story }));
  });

  static deleteStory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const storyId = req.params.storyId as string;

    const userIdStr = userId.toString();
    await StoryService.deleteStory(storyId, userIdStr);

    logger.info({ storyId, userId: userIdStr }, "Story deleted");

    res.status(200).json(ApiResponse.success("Story deleted successfully"));
  });
}
