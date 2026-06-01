import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { CommentService } from '../../../src/services/comment.service';
import { Comment } from '../../../src/models/Comment';
import { Post } from '../../../src/models/Post';
import { ApiError } from '../../../src/utils/ApiError';
import { Types } from 'mongoose';

// Mock Comment model
mock.module('../../../src/models/Comment', () => ({
  Comment: {
    findById: mock(),
    create: mock(),
    find: mock(),
    countDocuments: mock(),
    deleteMany: mock(),
  },
}));

// Mock Post model
mock.module('../../../src/models/Post', () => ({
  Post: {
    findById: mock(),
    findByIdAndUpdate: mock(),
  },
}));

// Mock socket
mock.module('../../../src/socket/index', () => ({
  getIO: mock(() => ({
    to: mock().mockReturnValue({
      emit: mock(),
    }),
  })),
}));

// Mock pagination
mock.module('../../../src/utils/pagination', () => ({
  parsePaginationParams: mock((page?: any, limit?: any) => ({
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 10,
    skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 10),
  })),
  formatPaginatedResult: mock((data: any, page: number, limit: number, total: number) => ({
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit), hasNext: false, hasPrev: false },
  })),
}));

// Mock logger
mock.module('../../../src/utils/logger', () => ({
  logger: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
  },
}));

describe('CommentService - Unit Tests', () => {
  
  beforeEach(() => {
    mock.restore();
  });

  describe('addComment()', () => {
    it('should add a comment to a post successfully', async () => {
      // Arrange
      const mockPost = { _id: new Types.ObjectId() };
      const mockComment = {
        _id: new Types.ObjectId(),
        text: 'Great post!',
        author: new Types.ObjectId(),
        populate: mock(async function(this: any) { return this; }),
      };

      (Post.findById as any).mockResolvedValue(mockPost);
      (Comment.create as any).mockResolvedValue(mockComment);

      // Act
      const result = await CommentService.addComment(
        mockPost._id.toString(),
        '507f1f77bcf86cd799439011',
        'Great post!'
      );

      // Assert
      expect(result).toBeDefined();
      expect(Comment.create).toHaveBeenCalled();
    });

    it('should throw error if post not found', async () => {
      // Arrange
      (Post.findById as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        CommentService.addComment('invalid-post', '507f1f77bcf86cd799439011', 'text')
      ).rejects.toThrow('Post not found');
    });

    it('should add a reply to a parent comment', async () => {
      // Arrange
      const parentCommentId = new Types.ObjectId();
      const mockPost = { _id: new Types.ObjectId() };
      const mockParentComment = { _id: parentCommentId };
      const mockReply = {
        _id: new Types.ObjectId(),
        text: 'Reply text',
        author: new Types.ObjectId(),
        parentComment: parentCommentId,
        populate: mock(async function(this: any) { return this; }),
      };

      (Post.findById as any).mockResolvedValue(mockPost);
      (Comment.findById as any).mockResolvedValue(mockParentComment);
      (Comment.create as any).mockResolvedValue(mockReply);

      // Act
      const result = await CommentService.addComment(
        mockPost._id.toString(),
        '507f1f77bcf86cd799439011',
        'Reply text',
        parentCommentId.toString()
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw error if parent comment not found', async () => {
      // Arrange
      const mockPost = { _id: new Types.ObjectId() };
      (Post.findById as any).mockResolvedValue(mockPost);
      (Comment.findById as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        CommentService.addComment(
          mockPost._id.toString(),
          '507f1f77bcf86cd799439011',
          'text',
          'invalid-parent'
        )
      ).rejects.toThrow('Parent comment not found');
    });
  });

  describe('updateComment()', () => {
    it('should update a comment successfully', async () => {
      // Arrange
      const mockComment = {
        _id: new Types.ObjectId(),
        text: 'Old text',
        author: new Types.ObjectId('507f1f77bcf86cd799439011'),
        isEdited: false,
        save: mock(async () => Promise.resolve()),
        populate: mock(async function(this: any) { return this; }),
      };

      (Comment.findById as any).mockResolvedValue(mockComment);

      // Act
      const result = await CommentService.updateComment(
        mockComment._id.toString(),
        '507f1f77bcf86cd799439011',
        'Updated text'
      );

      // Assert
      expect(result.text).toBe('Updated text');
      expect(result.isEdited).toBe(true);
      expect(mockComment.save).toHaveBeenCalled();
    });

    it('should throw error if not comment author', async () => {
      // Arrange
            const mockComment = {
        author: new Types.ObjectId('507f1f77bcf86cd799439099'), // Different from user-id
      };

      (Comment.findById as any).mockResolvedValue(mockComment);

      // Act & Assert
      await expect(
        CommentService.updateComment('507f1f77bcf86cd799439012', '507f1f77bcf86cd799439015', 'text')
      ).rejects.toThrow('You can only edit your own comments');
    });

    it('should throw error if comment not found', async () => {
      // Arrange
      (Comment.findById as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        CommentService.updateComment('507f1f77bcf86cd799439010', '507f1f57bcf86cd799439012', 'text')
      ).rejects.toThrow('Comment not found');
    });
  });

  describe('deleteComment()', () => {
    it('should delete own comment successfully', async () => {
      // Arrange
            const mockComment = {
        _id: new Types.ObjectId(),
        author: new Types.ObjectId('507f1f77bcf86cd799439011'),
        post: new Types.ObjectId(),
        deleteOne: mock(async () => Promise.resolve()),
      };
      const mockPost = {
        author: new Types.ObjectId('507f1f77bcf86cd799439099'),
      };

      (Comment.findById as any).mockResolvedValue(mockComment);
      (Post.findById as any).mockResolvedValue(mockPost);
      (Comment.deleteMany as any).mockResolvedValue({});
      (Post.findByIdAndUpdate as any).mockResolvedValue({});

      // Act
      await CommentService.deleteComment(
        mockComment._id.toString(),
        '507f1f77bcf86cd799439011'
      );

      // Assert
      expect(mockComment.deleteOne).toHaveBeenCalled();
    });

    it('should allow post author to delete any comment', async () => {
      // Arrange
            const mockComment = {
        author: new Types.ObjectId('507f1f77bcf86cd799439011'),
        post: new Types.ObjectId(),
        deleteOne: mock(async () => Promise.resolve()),
      };
      const mockPost = {
        author: new Types.ObjectId('507f1f77bcf86cd799439012'),
      };

      (Comment.findById as any).mockResolvedValue(mockComment);
      (Post.findById as any).mockResolvedValue(mockPost);
      (Comment.deleteMany as any).mockResolvedValue({});
      (Post.findByIdAndUpdate as any).mockResolvedValue({});

      // Act
      await CommentService.deleteComment('507f1f77bcf86cd799439012', '507f1f77bcf86cd799439012');

      // Assert
      expect(mockComment.deleteOne).toHaveBeenCalled();
    });
  });

  describe('likeComment()', () => {
    it('should like a comment successfully', async () => {
      // Arrange
            const mockComment = {
        _id: new Types.ObjectId(),
        author: new Types.ObjectId('507f1f77bcf86cd799439012'), // Different from liker
        likes: [] as Types.ObjectId[],
        save: mock(async () => Promise.resolve()),
      };

      (Comment.findById as any).mockResolvedValue(mockComment);

      // Act
      await CommentService.likeComment(
        mockComment._id.toString(),
        '507f1f77bcf86cd799439011'
      );

      // Assert
      expect(mockComment.likes).toHaveLength(1);
      expect(mockComment.save).toHaveBeenCalled();
    });

    it('should throw error if already liked', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439011';
      const mockComment = {
        likes: [new Types.ObjectId(userId)],
      };

      (Comment.findById as any).mockResolvedValue(mockComment);

      // Act & Assert
      await expect(
        CommentService.likeComment('507f1f77bcf86cd799439012', userId)
      ).rejects.toThrow('Comment already liked');
    });
  });

  describe('unlikeComment()', () => {
    it('should unlike a comment successfully', async () => {
      // Arrange
      const userId = '507f1f77bcf86cd799439011';
      const mockComment = {
        likes: [new Types.ObjectId(userId)],
        save: mock(async () => Promise.resolve()),
      };

      (Comment.findById as any).mockResolvedValue(mockComment);

      // Act
      await CommentService.unlikeComment('507f1f77bcf86cd799439012', userId);

      // Assert
      expect(mockComment.likes).toHaveLength(0);
      expect(mockComment.save).toHaveBeenCalled();
    });
  });
});