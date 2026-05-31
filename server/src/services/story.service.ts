import { Story, type StoryDocument } from "@models/Story";
import { User } from "@models/User";
import { UploadService } from "@services/upload.service";
import { getIO } from "@socket/index";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import mongoose, { Types } from "mongoose";

export class StoryService {
  static async createStory(
    userId: string,
    file: Express.Multer.File,
  ): Promise<StoryDocument> {
    if (!file) {
      throw ApiError.badRequest("Story image is required");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const imageUrl = await UploadService.uploadStory(file);

      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      const story = await Story.create({
        author: new Types.ObjectId(userId),
        imageUrl,
        viewers: [],
        expiresAt,
      });

      await User.findByIdAndUpdate(
        userId,
        { $push: { stories: story._id } },
        { session },
      );

      await session.commitTransaction();

      await story.populate("author", "username fullName profilePicture");

      // Socket: Notify followers about new story
      try {
        const io = getIO();
        const user = await User.findById(userId).select("followers");
        if (user && user.followers.length > 0) {
          const storyObject = story.toObject();
          for (const followerId of user.followers) {
            io.to(`user:${followerId.toString()}`).emit("new-story", {
              authorId: userId,
              story: storyObject,
            });
          }
        }
      } catch (socketError) {
        logger.error(socketError, "Failed to emit new-story socket event");
      }

      logger.info({ storyId: story._id, userId }, "New story created");

      return story;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  // Rest of the class remains unchanged...
  static async getFollowedStories(userId: string): Promise<any[]> {
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      throw ApiError.notFound("User not found");
    }

    const followingIds = currentUser.following.map((id) => id.toString());

    if (followingIds.length === 0) {
      return [];
    }

    const stories = await Story.find({
      author: {
        $in: followingIds.map((id) => new Types.ObjectId(id)),
      },
      expiresAt: { $gt: new Date() },
    })
      .populate("author", "username fullName profilePicture")
      .populate("viewers", "username fullName profilePicture")
      .sort({ createdAt: -1 });

    const storiesByAuthor = new Map();
    for (const story of stories) {
      const author = story.author as unknown as { _id: Types.ObjectId };
      const authorId = author._id.toString();
      if (!storiesByAuthor.has(authorId)) {
        storiesByAuthor.set(authorId, []);
      }
      const storyObj = story.toObject();
      (storyObj as any).hasCurrentUserViewed = story.viewers.some(
        (viewer: any) => viewer._id.toString() === userId,
      );
      storiesByAuthor.get(authorId).push(storyObj);
    }

    const result = Array.from(storiesByAuthor.entries()).map(
      ([authorId, userStories]) => ({
        authorId,
        author: userStories[0].author,
        stories: userStories,
      }),
    );

    logger.info(
      { userId, storyCount: stories.length },
      "Followed stories retrieved",
    );

    return result;
  }

  static async getUserStories(userId: string): Promise<StoryDocument[]> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const stories = await Story.find({
      author: new Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
    })
      .populate("author", "username fullName profilePicture")
      .populate("viewers", "username fullName profilePicture")
      .sort({ createdAt: -1 });

    logger.info(
      { userId, storyCount: stories.length },
      "User stories retrieved",
    );

    return stories;
  }

  static async viewStory(
    storyId: string,
    viewerId: string,
  ): Promise<StoryDocument> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw ApiError.notFound("Story not found");
    }

    if (story.expiresAt < new Date()) {
      throw ApiError.badRequest("Story has expired");
    }

    if (story.author.toString() !== viewerId) {
      const viewerObjectId = new Types.ObjectId(viewerId);
      const viewerIds = story.viewers.map((v) => v.toString());
      if (!viewerIds.includes(viewerId)) {
        story.viewers.push(viewerObjectId);
        await story.save();
      }
    }

    await story.populate("author", "username fullName profilePicture");

    logger.info({ storyId, viewerId }, "Story viewed");

    return story;
  }

  static async deleteStory(storyId: string, userId: string): Promise<void> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const story = await Story.findById(storyId);
      if (!story) {
        throw ApiError.notFound("Story not found");
      }

      if (story.author.toString() !== userId) {
        throw ApiError.forbidden("You can only delete your own stories");
      }

      await User.findByIdAndUpdate(
        userId,
        { $pull: { stories: new Types.ObjectId(storyId) } },
        { session },
      );

      await Story.findByIdAndDelete(storyId, { session });

      await session.commitTransaction();

      logger.info({ storyId, userId }, "Story deleted");
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
