import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { NotificationService } from '../../../src/services/notification.service';
import { Notification } from '../../../src/models/Notification';
import { Post } from '../../../src/models/Post';
import { User } from '../../../src/models/User';
import { ApiError } from '../../../src/utils/ApiError';
import { Types } from 'mongoose';

// Mock Notification model
mock.module('../../../src/models/Notification', () => ({
  Notification: {
    create: mock(),
    findById: mock(),
    find: mock(),
    countDocuments: mock(),
    updateMany: mock(),
    deleteMany: mock(),
  },
}));

// Mock User model
mock.module('../../../src/models/User', () => ({
  User: {
    findById: mock(),
  },
}));

// Mock Post model
mock.module('../../../src/models/Post', () => ({
  Post: {
    findById: mock(),
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

describe('NotificationService - Unit Tests', () => {
  
  beforeEach(() => {
    mock.restore();
  });

  describe('createLikeNotification()', () => {
    it('should create a like notification', async () => {
      // Arrange
      const recipientId = '507f1f77bcf86cd799439012';
      const senderId = '507f1f77bcf86cd799439011';
      const postId = new Types.ObjectId();

      (User.findById as any).mockResolvedValue({
        _id: senderId,
        username: 'testuser',
      });
      (Post.findById as any).mockResolvedValue({ _id: postId });
      
      const mockNotification = {
        _id: new Types.ObjectId(),
        populate: mock(async function(this: any) { return this; }),
        toObject: () => ({ message: 'testuser liked your post' }),
      };
      (Notification.create as any).mockResolvedValue(mockNotification);

      // Act
      await NotificationService.createLikeNotification(recipientId, senderId, postId.toString());

      // Assert
      expect(Notification.create).toHaveBeenCalled();
    });

        it('should not create notification for self-like', async () => {
      // Arrange - Reset mock count first
      (Notification.create as any).mockClear();
      
      // Act
      await NotificationService.createLikeNotification(
        '507f1f77bcf86cd799439011', 
        '507f1f77bcf86cd799439011', 
        '507f1f77bcf86cd799439011'
      );

      // Assert
      expect(Notification.create).not.toHaveBeenCalled();
    });

    it('should not create notification if sender not found', async () => {
      // Arrange
      (User.findById as any).mockResolvedValue(null);
      (Notification.create as any).mockClear();

      // Act
      await NotificationService.createLikeNotification(
        '507f1f77bcf86cd799439012', 
        '507f1f77bcf86cd799439011', 
        '507f1f77bcf86cd799439011'
      );

      // Assert
      expect(Notification.create).not.toHaveBeenCalled();
    });
  });

  describe('createFollowNotification()', () => {
    it('should create a follow notification', async () => {
      // Arrange
      (User.findById as any).mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        username: 'follower',
      });
      
      (Notification.create as any).mockResolvedValue({
        populate: mock(async function(this: any) { return this; }),
        toObject: () => ({}),
      });

      // Act
      await NotificationService.createFollowNotification('507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012');

      // Assert
      expect(Notification.create).toHaveBeenCalled();
    });

        it('should not create notification for self-follow', async () => {
      // Arrange
      (Notification.create as any).mockClear();
      
      // Act
      await NotificationService.createFollowNotification(
        '507f1f77bcf86cd799439011', 
        '507f1f77bcf86cd799439011'
      );

      // Assert
      expect(Notification.create).not.toHaveBeenCalled();
    });
  });

  describe('createCommentNotification()', () => {
    it('should create a comment notification', async () => {
      // Arrange
      (User.findById as any).mockResolvedValue({
        _id: '507f1f77bcf86cd799439012',
        username: 'commenter',
      });
      (Post.findById as any).mockResolvedValue({ _id: '507f1f77bcf86cd799439019' });
      
      (Notification.create as any).mockResolvedValue({
        populate: mock(async function(this: any) { return this; }),
        toObject: () => ({}),
      });

      // Act
      await NotificationService.createCommentNotification(
        '507f1f77bcf86cd799439011',
        '507f1f77bcf86cd799439012',
        '507f1f77bcf86cd799439019',
        '507f1f77bcf86cd799439015'
      );

      // Assert
      expect(Notification.create).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications()', () => {
    it('should return user notifications', async () => {
      // Arrange
      const mockNotifications = [
        { _id: new Types.ObjectId(), type: 'like', message: 'Someone liked your post' },
      ];

      (Notification.find as any).mockReturnValue({
        populate: mock().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue(mockNotifications),
      });
      (Notification.countDocuments as any).mockResolvedValue(1);

      // Act
      const result = await NotificationService.getUserNotifications('507f1f77bcf86cd799439018');

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
    });

    it('should filter unread notifications when unreadOnly is true', async () => {
      // Arrange
      (Notification.find as any).mockReturnValue({
        populate: mock().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue([]),
      });
      (Notification.countDocuments as any).mockResolvedValue(0);

      // Act
      const result = await NotificationService.getUserNotifications(
        '507f1f77bcf86cd799439018',
        1,
        10,
        true
      );

      // Assert
      expect(result.data).toHaveLength(0);
    });
  });

  describe('markAsRead()', () => {
    it('should mark notification as read', async () => {
      // Arrange
      const mockNotification = {
        _id: new Types.ObjectId(),
        recipient: new Types.ObjectId('507f1f77bcf86cd799439018'),
        isRead: false,
        save: mock(async () => Promise.resolve()),
      };

      (Notification.findById as any).mockResolvedValue(mockNotification);

      // Act
      await NotificationService.markAsRead('507f1f77bcf86cd799439017', '507f1f77bcf86cd799439018');

      // Assert
      expect(mockNotification.isRead).toBe(true);
      expect(mockNotification.save).toHaveBeenCalled();
    });

    it('should throw error if not notification recipient', async () => {
      // Arrange
      const mockNotification = {
        recipient: new Types.ObjectId('507f1f77bcf86cd799439099'),
      };

      (Notification.findById as any).mockResolvedValue(mockNotification);

      // Act & Assert
      await expect(
        NotificationService.markAsRead('507f1f77bcf86cd799439017', '507f1f77bcf86cd799439018')
      ).rejects.toThrow('Not authorized to mark this notification as read');
    });
  });

  describe('markAllAsRead()', () => {
    it('should mark all notifications as read', async () => {
      // Arrange
      (Notification.updateMany as any).mockResolvedValue({});

      // Act
      await NotificationService.markAllAsRead('507f1f77bcf86cd799439018');

      // Assert
      expect(Notification.updateMany).toHaveBeenCalled();
    });
  });

  describe('getUnreadCount()', () => {
    it('should return unread count', async () => {
      // Arrange
      (Notification.countDocuments as any).mockResolvedValue(5);

      // Act
      const count = await NotificationService.getUnreadCount('507f1f77bcf86cd799439018');

      // Assert
      expect(count).toBe(5);
    });
  });

  describe('deleteNotification()', () => {
    it('should delete notification', async () => {
      // Arrange
      const mockNotification = {
        recipient: new Types.ObjectId('507f1f77bcf86cd799439018'),
        deleteOne: mock(async () => Promise.resolve()),
      };

      (Notification.findById as any).mockResolvedValue(mockNotification);

      // Act
      await NotificationService.deleteNotification('507f1f77bcf86cd799439017', '507f1f77bcf86cd799439018');

      // Assert
      expect(mockNotification.deleteOne).toHaveBeenCalled();
    });
  });

  describe('deleteAllNotifications()', () => {
    it('should delete all user notifications', async () => {
      // Arrange
      (Notification.deleteMany as any).mockResolvedValue({});

      // Act
      await NotificationService.deleteAllNotifications('507f1f77bcf86cd799439018');

      // Assert
      expect(Notification.deleteMany).toHaveBeenCalled();
    });
  });
});