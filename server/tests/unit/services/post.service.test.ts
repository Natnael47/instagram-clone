import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Types } from "mongoose";
import { Post } from "../../../src/models/Post";
import { User } from "../../../src/models/User";
import { PostService } from "../../../src/services/post.service";
import { secondPost, testPost, validPostData } from "../../fixtures/posts";

// Mock Post model
// Mock Post model with static methods
const mockPostStatic = {
  findById: mock(),
  find: mock(),
  findByIdAndUpdate: mock(),
  findByIdAndDelete: mock(),
  countDocuments: mock(),
};

mock.module('../../../src/models/Post', () => ({
  Post: Object.assign(
    mock(() => ({
      save: mock(async () => Promise.resolve()),
      populate: mock(async function(this: any) { return this; }),
      toObject: mock(function(this: any) { return { ...this }; }),
    })),
    mockPostStatic
  ),
}));

// Mock User model
mock.module("../../../src/models/User", () => ({
  User: {
    findById: mock(),
    findByIdAndUpdate: mock(),
  },
}));

// Mock Comment model
mock.module("../../../src/models/Comment", () => ({
  Comment: {
    create: mock(),
    findById: mock(),
    countDocuments: mock(),
    deleteMany: mock(),
  },
}));

// Mock NotificationService
mock.module("../../../src/services/notification.service", () => ({
  NotificationService: {
    createLikeNotification: mock(async () => Promise.resolve()),
    createCommentNotification: mock(async () => Promise.resolve()),
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

describe("PostService - Unit Tests", () => {
  beforeEach(() => {
    mock.restore();
  });

  describe("createPost()", () => {
    it("should create a post successfully", async () => {
      // Arrange
      const mockPostInstance = {
        ...validPostData,
        author: new Types.ObjectId("507f1f77bcf86cd799439011"),
        likes: [],
        comments: [],
        save: mock(async () => Promise.resolve()),
        populate: mock(async function (this: any) {
          return this;
        }),
        toObject: mock(function (this: any) {
          return { ...this };
        }),
      };

      // Mock Post constructor
      (Post as any).mockImplementation(() => mockPostInstance);
      (User.findByIdAndUpdate as any).mockResolvedValue({});
      (User.findById as any).mockReturnValue({
        select: mock().mockResolvedValue({ followers: [] }),
      });

      // Act
      const result = await PostService.createPost(
        "507f1f77bcf86cd799439011",
        validPostData.imageUrl,
        validPostData.caption,
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockPostInstance.save).toHaveBeenCalled();
    });

    it("should throw error if image is missing", async () => {
      // Act & Assert
      await expect(
        PostService.createPost("507f1f77bcf86cd799439012", "", "caption"),
      ).rejects.toThrow("Image is required");
    });
  });

  describe("getPostById()", () => {
      describe('getPostById()', () => {
    it('should return post by ID', async () => {
      // Arrange - Create chainable populate that works for double .populate()
      const mockChain = {
        populate: mock()
          .mockImplementationOnce(function(this: any, field: string) { 
            // First populate returns this for chaining
            return this; 
          })
          .mockResolvedValueOnce({
            ...testPost,
            likes: [],
            toObject: () => ({ ...testPost, likes: [] }),
          }),
      };

      (Post.findById as any).mockReturnValue(mockChain);

      // Act
      const result = await PostService.getPostById(testPost._id.toString());

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw error if post not found', async () => {
      // Arrange
      const mockChain = {
        populate: mock()
          .mockImplementationOnce(function(this: any) { return this; })
          .mockResolvedValueOnce(null),
      };

      (Post.findById as any).mockReturnValue(mockChain);

      // Act & Assert
      await expect(
        PostService.getPostById('507f1f77bcf86cd799439014')
      ).rejects.toThrow('Post not found');
    });
  });
  });

  describe("deletePost()", () => {
       it('should delete own post successfully', async () => {
      // Arrange
      const authorId = '507f1f77bcf86cd799439011';
      const postId = new Types.ObjectId().toString();
      
      (Post.findById as any).mockResolvedValue({
        _id: postId,
        author: new Types.ObjectId(authorId),
      });
      (Post.findByIdAndDelete as any).mockResolvedValue({});
      (User.findByIdAndUpdate as any).mockResolvedValue({});

      // Act
      await PostService.deletePost(postId, authorId);

      // Assert
      expect(Post.findByIdAndDelete).toHaveBeenCalled();
    });

    it("should throw error when trying to delete another user post", async () => {
      // Arrange
      (Post.findById as any).mockResolvedValue({
        ...testPost,
        author: new Types.ObjectId("507f1f77bcf86cd799439018"),
      });

      // Act & Assert
      await expect(
        PostService.deletePost(
          testPost._id.toString(),
          "507f1f77bcf86cd799439011",
        ),
      ).rejects.toThrow("You can only delete your own posts");
    });
  });

  describe("likePost()", () => {
    it("should like a post successfully", async () => {
      // Arrange
            (Post.findById as any).mockResolvedValue({
        ...testPost,
        likes: [],
        author: { 
          _id: new Types.ObjectId('507f1f77bcf86cd799439099'), 
          toString: () => '507f1f77bcf86cd799439099' 
        },
      });
      (Post.findByIdAndUpdate as any).mockResolvedValue({});

      // Act
      await PostService.likePost(
        testPost._id.toString(),
        "507f1f77bcf86cd799439011",
      );

      // Assert
      expect(Post.findByIdAndUpdate).toHaveBeenCalled();
    });

    it("should throw error if post already liked", async () => {
      // Arrange
      (Post.findById as any).mockResolvedValue({
        ...testPost,
        likes: [new Types.ObjectId("507f1f77bcf86cd799439011")],
      });

      // Act & Assert
      await expect(
        PostService.likePost(
          testPost._id.toString(),
          "507f1f77bcf86cd799439011",
        ),
      ).rejects.toThrow("Post already liked");
    });
  });

  describe("unlikePost()", () => {
    it("should unlike a post successfully", async () => {
      // Arrange
      (Post.findById as any).mockResolvedValue({
        ...testPost,
        likes: [new Types.ObjectId("507f1f77bcf86cd799439011")],
      });
      (Post.findByIdAndUpdate as any).mockResolvedValue({});

      // Act
      await PostService.unlikePost(
        testPost._id.toString(),
        "507f1f77bcf86cd799439011",
      );

      // Assert
      expect(Post.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe("getUserPosts()", () => {
    it("should return user posts with pagination", async () => {
      // Arrange
      (Post.find as any).mockReturnValue({
        populate: mock().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue([testPost, secondPost]),
      });
      (Post.countDocuments as any).mockResolvedValue(2);

      // Act
      const result = await PostService.getUserPosts("507f1f77bcf86cd799439011");

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(2);
    });
  });
});
