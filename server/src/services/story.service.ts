import { Story, type StoryDocument } from "@models/Story";
import { User } from "@models/User";
import { NotificationService } from "@services/notification.service";
import { UploadService } from "@services/upload.service";
import { getIO } from "@socket/index";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import { Types } from "mongoose";
import { ActivityService } from "./activity.service";

export class StoryService {
  static async createStory(
    userId: string,
    file: Express.Multer.File,
  ): Promise<StoryDocument> {
    if (!file) {
      throw ApiError.badRequest("Story image is required");
    }

    const imageUrl = await UploadService.uploadStory(file);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const story = await Story.create({
      author: new Types.ObjectId(userId),
      imageUrl,
      viewers: [],
      expiresAt,
    });

    await User.findByIdAndUpdate(userId, {
      $push: { stories: story._id },
    });

    await story.populate("author", "username fullName profilePicture");

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

    // Log story creation
    ActivityService.log({
      user: userId,
      action: 'create_story',
      resource: 'story',
      resourceId: story._id.toString(),
      details: {
        expiresAt: expiresAt.toISOString(),
        duration: '24h'
      }
    }).catch(err => logger.error({ err }, 'Failed to log story activity'));

    return story;
  }

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

  static async getMyStories(userId: string): Promise<StoryDocument[]> {
    const stories = await Story.find({
      author: new Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
    })
      .populate("author", "username fullName profilePicture")
      .populate("viewers", "username fullName profilePicture")
      .sort({ createdAt: -1 });

    logger.info(
      { userId, storyCount: stories.length },
      "My stories retrieved",
    );

    return stories;
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
      // Log expired story view attempt
      ActivityService.log({
        user: viewerId,
        action: 'view_story',
        resource: 'story',
        resourceId: storyId,
        status: 'failure',
        details: {
          reason: 'expired',
          storyAuthorId: story.author.toString()
        }
      }).catch(err => logger.error({ err }, 'Failed to log story activity'));
      
      throw ApiError.badRequest("Story has expired");
    }

    const isNewView = story.author.toString() !== viewerId;
    
    if (isNewView) {
      const viewerObjectId = new Types.ObjectId(viewerId);
      const viewerIds = story.viewers.map((v) => v.toString());
      if (!viewerIds.includes(viewerId)) {
        story.viewers.push(viewerObjectId);
        await story.save();
      }

      // Create notification for story author
      await NotificationService.createStoryViewNotification(
        story.author.toString(),
        viewerId,
        storyId,
      );
    }

    await story.populate("author", "username fullName profilePicture");

    logger.info({ storyId, viewerId }, "Story viewed");

    // Log story view (only for new views, not author checking their own story)
    if (isNewView) {
      ActivityService.log({
        user: viewerId,
        action: 'view_story',
        resource: 'story',
        resourceId: storyId,
        details: {
          storyAuthorId: story.author.toString(),
          isNewView: true
        }
      }).catch(err => logger.error({ err }, 'Failed to log story activity'));
    }

    return story;
  }

  static async deleteStory(storyId: string, userId: string): Promise<void> {
    const story = await Story.findById(storyId);
    if (!story) {
      throw ApiError.notFound("Story not found");
    }

    if (story.author.toString() !== userId) {
      // Log unauthorized delete attempt
      ActivityService.log({
        user: userId,
        action: 'delete_story',
        resource: 'story',
        resourceId: storyId,
        status: 'failure',
        details: {
          reason: 'unauthorized',
          storyAuthorId: story.author.toString()
        }
      }).catch(err => logger.error({ err }, 'Failed to log story activity'));
      
      throw ApiError.forbidden("You can only delete your own stories");
    }

    await User.findByIdAndUpdate(userId, {
      $pull: { stories: new Types.ObjectId(storyId) },
    });

    await Story.findByIdAndDelete(storyId);

    logger.info({ storyId, userId }, "Story deleted");

    // Log story deletion
    ActivityService.log({
      user: userId,
      action: 'delete_story',
      resource: 'story',
      resourceId: storyId,
      status: 'success'
    }).catch(err => logger.error({ err }, 'Failed to log story activity'));
  }
}