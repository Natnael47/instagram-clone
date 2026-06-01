import { beforeEach, describe, expect, it, mock } from "bun:test";
import { User } from "../../../src/models/User";
import { UserService } from "../../../src/services/user.service";
import { secondUser, testUser } from "../../fixtures/users";

// Mock User model
mock.module("../../../src/models/User", () => ({
  User: {
    findById: mock(),
    findOne: mock(),
    find: mock(),
    findByIdAndUpdate: mock(),
    countDocuments: mock(),
  },
}));

// Mock NotificationService
mock.module("../../../src/services/notification.service", () => ({
  NotificationService: {
    createFollowNotification: mock(async () => Promise.resolve()),
  },
}));

// Mock socket
mock.module("../../../src/socket/index", () => ({
  getIO: mock(() => ({
    to: mock().mockReturnValue({
      emit: mock(),
    }),
  })),
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

describe("UserService - Unit Tests", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("getUserProfile()", () => {
    it("should return user profile without password", async () => {
      // Arrange - Chainable: .select().populate().populate()
      const mockChain = {
        select: mock(function (this: any) {
          return this;
        }),
        populate: mock()
          .mockImplementationOnce(function (this: any) {
            return this;
          })
          .mockResolvedValueOnce({
            _id: testUser._id,
            username: testUser.username,
            fullName: testUser.fullName,
            followers: [],
            following: [],
            toObject: () => ({
              _id: testUser._id,
              username: testUser.username,
              fullName: testUser.fullName,
              followers: [],
              following: [],
            }),
          }),
      };

      (User.findById as any).mockReturnValue(mockChain);

      // Act
      const result = await UserService.getUserProfile(testUser._id.toString());

      // Assert
      expect(result).toBeDefined();
    });

    it("should throw error if user not found", async () => {
      // Arrange
      const mockChain = {
        select: mock(function (this: any) {
          return this;
        }),
        populate: mock()
          .mockImplementationOnce(function (this: any) {
            return this;
          })
          .mockResolvedValueOnce(null),
      };

      (User.findById as any).mockReturnValue(mockChain);

      // Act & Assert
      await expect(
        UserService.getUserProfile("507f1f77bcf86cd799439014"),
      ).rejects.toThrow("User not found");
    });
  });

  describe("followUser()", () => {
    it("should follow a user successfully", async () => {
      // Arrange
      (User.findById as any)
        .mockResolvedValueOnce({ _id: secondUser._id }) // target user
        .mockResolvedValueOnce({
          // follower
          _id: testUser._id,
          following: [],
        });

      (User.findByIdAndUpdate as any).mockResolvedValue({});

      // Act
      await UserService.followUser(
        testUser._id.toString(),
        secondUser._id.toString(),
      );

      // Assert
      expect(User.findByIdAndUpdate).toHaveBeenCalledTimes(2);
    });

    it("should throw error when trying to follow yourself", async () => {
      // Act & Assert
      await expect(
        UserService.followUser(
          testUser._id.toString(),
          testUser._id.toString(),
        ),
      ).rejects.toThrow("You cannot follow yourself");
    });

    it("should throw error if already following", async () => {
      // Arrange
      (User.findById as any)
        .mockResolvedValueOnce({ _id: secondUser._id }) // target user
        .mockResolvedValueOnce({
          // follower already following
          _id: testUser._id,
          following: [secondUser._id],
        });

      // Act & Assert
      await expect(
        UserService.followUser(
          testUser._id.toString(),
          secondUser._id.toString(),
        ),
      ).rejects.toThrow("Already following this user");
    });

    it("should throw error if target user not found", async () => {
      // Arrange
      (User.findById as any).mockResolvedValueOnce(null); // target not found

      // Act & Assert
      await expect(
        UserService.followUser(
          testUser._id.toString(),
          "507f1f77bcf86cd799439014",
        ),
      ).rejects.toThrow("User to follow not found");
    });
  });

  describe("unfollowUser()", () => {
    it("should unfollow a user successfully", async () => {
      // Arrange
      (User.findById as any).mockResolvedValueOnce({ _id: secondUser._id }); // target user exists

      (User.findByIdAndUpdate as any).mockResolvedValue({});

      // Act
      await UserService.unfollowUser(
        testUser._id.toString(),
        secondUser._id.toString(),
      );

      // Assert
      expect(User.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw error when trying to unfollow yourself", async () => {
      // Act & Assert
      await expect(
        UserService.unfollowUser(
          testUser._id.toString(),
          testUser._id.toString(),
        ),
      ).rejects.toThrow("You cannot unfollow yourself");
    });
  });

  describe("searchUsers()", () => {
    it("should search users by query", async () => {
      // Arrange
      (User.find as any).mockReturnValue({
        select: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockReturnThis(),
        sort: mock().mockResolvedValue([testUser, secondUser]),
      });
      (User.countDocuments as any).mockResolvedValue(2);

      // Act
      const result = await UserService.searchUsers("test");

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
    });
  });

  describe("getSuggestedUsers()", () => {
    it("should return suggested users excluding current user and followed", async () => {
      // Arrange
      (User.findById as any).mockResolvedValue({
        following: [],
      });

      (User.find as any).mockReturnValue({
        select: mock().mockReturnThis(),
        sort: mock().mockReturnThis(),
        limit: mock().mockResolvedValue([secondUser]),
      });

      // Act
      const result = await UserService.getSuggestedUsers(
        testUser._id.toString(),
      );

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(1);
    });
  });
});
