import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Types } from "mongoose";
import { Post } from "../../../src/models/Post";
import { User } from "../../../src/models/User";
import { FeedService } from "../../../src/services/feed.service";
import { secondPost, testPost } from "../../fixtures/posts";

// Mock Post model
mock.module("../../../src/models/Post", () => ({
  Post: {
    find: mock(),
    countDocuments: mock(),
  },
}));

// Mock User model
mock.module("../../../src/models/User", () => ({
  User: {
    findById: mock(),
  },
}));

// Mock pagination
mock.module("../../../src/utils/pagination", () => ({
  parsePaginationParams: mock((page?: any, limit?: any) => ({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 10),
  })),
  formatPaginatedResult: mock(
    (data: any, page: number, limit: number, total: number) => ({
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: false,
        hasPrev: false,
      },
    }),
  ),
}));

// Mock logger
mock.module("../../../src/utils/logger", () => ({
  logger: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
  },
}));

describe("FeedService - Unit Tests", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("getPersonalizedFeed()", () => {
    it("should return feed from followed users", async () => {
      // Arrange
      const mockUser = {
        _id: new Types.ObjectId("507f1f77bcf86cd799439011"),
        following: [
          new Types.ObjectId("507f1f77bcf86cd799439012"),
          new Types.ObjectId("507f1f77bcf86cd799439013"),
        ],
      };

      const mockPosts = [
        {
          ...testPost,
          likes: [],
          toObject: () => ({ ...testPost, likes: [] }),
        },
        {
          ...secondPost,
          likes: [],
          toObject: () => ({ ...secondPost, likes: [] }),
        },
      ];

      (User.findById as any).mockResolvedValue(mockUser);

      (Post.find as any).mockReturnValue({
        populate: mock().mockReturnThis().mockReturnThis().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue(mockPosts),
      });
      (Post.countDocuments as any).mockResolvedValue(2);

      // Act
      const result = await FeedService.getPersonalizedFeed(
        "507f1f77bcf86cd799439011",
        1,
        10,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
    });

    it("should return empty feed if user follows no one", async () => {
      // Arrange
      const mockUser = {
        _id: new Types.ObjectId(),
        following: [],
      };

      (User.findById as any).mockResolvedValue(mockUser);

      // Act
      const result = await FeedService.getPersonalizedFeed("507f1f77bcf86cd799439012");

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it("should throw error if user not found", async () => {
      // Arrange
      (User.findById as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        FeedService.getPersonalizedFeed("invalid-user"),
      ).rejects.toThrow("User not found");
    });
  });

  describe("getGlobalFeed()", () => {
    it("should return all posts sorted by newest", async () => {
      // Arrange
      const mockPosts = [
        {
          ...testPost,
          likes: [],
          toObject: () => ({ ...testPost, likes: [] }),
        },
      ];

      (Post.find as any).mockReturnValue({
        populate: mock().mockReturnThis().mockReturnThis().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue(mockPosts),
      });
      (Post.countDocuments as any).mockResolvedValue(1);

      // Act
      const result = await FeedService.getGlobalFeed(undefined, 1, 10);

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
    });

    it("should include like status when userId provided", async () => {
      // Arrange
      const userId = "507f1f77bcf86cd799439011";
      const mockPosts = [
        {
          ...testPost,
          likes: [new Types.ObjectId(userId)],
          toObject: () => ({
            ...testPost,
            likes: [new Types.ObjectId(userId)],
          }),
        },
      ];

      (Post.find as any).mockReturnValue({
        populate: mock().mockReturnThis().mockReturnThis().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue(mockPosts),
      });
      (Post.countDocuments as any).mockResolvedValue(1);

      // Act
      const result = await FeedService.getGlobalFeed(userId);

      // Assert
      expect(result.data[0]).toHaveProperty("isLikedByCurrentUser");
    });
  });

  describe("getFeedByUserIds()", () => {
        it('should return posts from specific users', async () => {
      // Arrange
      const mockPosts = [
        { 
          ...testPost, 
          likes: [],
          toObject: () => ({ ...testPost, likes: [] }),
        },
        { 
          ...secondPost, 
          likes: [],
          toObject: () => ({ ...secondPost, likes: [] }),
        },
      ];

      (Post.find as any).mockReturnValue({
        populate: mock().mockReturnThis().mockReturnThis().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue(mockPosts),
      });
      (Post.countDocuments as any).mockResolvedValue(2);

      // Act
      const result = await FeedService.getFeedByUserIds(
        ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        undefined,
        1,
        10
      );

      // Assert
      expect(result.data).toHaveLength(2);
    });

    it("should return empty feed if userIds array is empty", async () => {
      // Act
      const result = await FeedService.getFeedByUserIds([], undefined, 1, 10);

      // Assert
      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });
});
