import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { MessageService } from '../../../src/services/message.service';
import { Message } from '../../../src/models/Message';
import { Conversation } from '../../../src/models/Conversation';
import { User } from '../../../src/models/User';
import { ApiError } from '../../../src/utils/ApiError';
import { Types } from 'mongoose';

// Mock Message model
mock.module('../../../src/models/Message', () => ({
  Message: {
    create: mock(),
    findById: mock(),
    find: mock(),
    countDocuments: mock(),
    updateMany: mock(),
  },
}));

// Mock Conversation model
mock.module('../../../src/models/Conversation', () => ({
  Conversation: {
    findById: mock(),
    findOne: mock(),
    create: mock(),
    find: mock(),
    countDocuments: mock(),
  },
}));

// Mock User model
mock.module('../../../src/models/User', () => ({
  User: {
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

describe('MessageService - Unit Tests', () => {
  
  beforeEach(() => {
    mock.restore();
  });

  describe('sendMessageToConversation()', () => {
    it('should send message to existing conversation', async () => {
      // Arrange
      const senderId = '507f1f77bcf86cd799439011';
      const conversationId = new Types.ObjectId();
      
      const mockConversation = {
        _id: conversationId,
        participants: [new Types.ObjectId(senderId), new Types.ObjectId()],
        save: mock(async () => Promise.resolve()),
      };

      const mockMessage = {
        _id: new Types.ObjectId(),
        text: 'Hello!',
        sender: new Types.ObjectId(senderId),
        conversation: conversationId,
        populate: mock(async function(this: any) { return this; }),
        toObject: () => ({ text: 'Hello!', sender: senderId }),
      };

      (Conversation.findById as any).mockResolvedValue(mockConversation);
      (Message.create as any).mockResolvedValue(mockMessage);

      // Act
      const result = await MessageService.sendMessageToConversation(
        conversationId.toString(),
        senderId,
        'Hello!'
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.message).toBeDefined();
      expect(result.conversation).toBeDefined();
      expect(Message.create).toHaveBeenCalled();
    });

    it('should throw error if conversation not found', async () => {
      // Arrange
      (Conversation.findById as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        MessageService.sendMessageToConversation('507f1f77bcf86cd799439017', '507f1f77bcf86cd799439012', 'text')
      ).rejects.toThrow('Conversation not found');
    });

        it('should throw error if sender not participant', async () => {
      // Arrange
      const mockConversation = {
        participants: [new Types.ObjectId('507f1f77bcf86cd799439012')],
        save: mock(async () => Promise.resolve()),
      };

      (Conversation.findById as any).mockResolvedValue(mockConversation);

      // Act & Assert
      await expect(
        MessageService.sendMessageToConversation(
          '507f1f77bcf86cd799439013', 
          '507f1f77bcf86cd799439011', 
          'text'
        )
      ).rejects.toThrow('You are not a participant in this conversation');
    });
  });

  describe('sendMessageToUser()', () => {
    it('should create new conversation and send message', async () => {
      // Arrange
      const senderId = '507f1f77bcf86cd799439011';
      const recipientId = '507f1f77bcf86cd799439012';

      (User.findById as any).mockResolvedValue({ _id: recipientId });
      (Conversation.findOne as any).mockResolvedValue(null);
      
      const mockConversation = {
        _id: new Types.ObjectId(),
        participants: [new Types.ObjectId(senderId), new Types.ObjectId(recipientId)],
        save: mock(async () => Promise.resolve()),
      };
      (Conversation.create as any).mockResolvedValue(mockConversation);
      
      (Message.create as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        text: 'Hi!',
        sender: new Types.ObjectId(senderId),
        populate: mock(async function(this: any) { return this; }),
        toObject: () => ({ text: 'Hi!' }),
      });

      // Act
      const result = await MessageService.sendMessageToUser(senderId, recipientId, 'Hi!');

      // Assert
      expect(result).toBeDefined();
      expect(Conversation.create).toHaveBeenCalled();
    });

    it('should throw error when sending to yourself', async () => {
      // Act & Assert
      await expect(
        MessageService.sendMessageToUser('user-1', 'user-1', 'text')
      ).rejects.toThrow('You cannot send a message to yourself');
    });

    it('should throw error if recipient not found', async () => {
      // Arrange
      (User.findById as any).mockResolvedValue(null);

      // Act & Assert
      await expect(
        MessageService.sendMessageToUser('sender', 'invalid-recipient', 'text')
      ).rejects.toThrow('Recipient not found');
    });
  });

  describe('getUserConversations()', () => {
    it('should return user conversations with unread count', async () => {
      // Arrange
      const mockConversations = [
        {
          _id: new Types.ObjectId(),
          participants: [new Types.ObjectId()],
          lastMessage: 'Hello',
          toObject: () => ({ lastMessage: 'Hello' }),
        },
      ];

      (Conversation.find as any).mockReturnValue({
        populate: mock().mockReturnThis(),
        sort: mock().mockReturnThis(),
        skip: mock().mockReturnThis(),
        limit: mock().mockResolvedValue(mockConversations),
      });
      (Conversation.countDocuments as any).mockResolvedValue(1);
      (Message.countDocuments as any).mockResolvedValue(3);

      // Act
      const result = await MessageService.getUserConversations('507f1f77bcf86cd799439012');

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toHaveLength(1);
    });
  });

  describe('markMessageAsRead()', () => {
    it('should mark message as read', async () => {
      // Arrange
      const mockMessage = {
        _id: new Types.ObjectId(),
        sender: new Types.ObjectId('507f1f77bcf86cd799439012'),
        conversation: new Types.ObjectId(),
        isRead: false,
        save: mock(async () => Promise.resolve()),
      };

      const mockConversation = {
        _id: mockMessage.conversation,
        participants: [new Types.ObjectId('507f1f77bcf86cd799439011'), mockMessage.sender],
      };

      (Message.findById as any).mockResolvedValue(mockMessage);
      (Conversation.findById as any).mockResolvedValue(mockConversation);

      // Act
      await MessageService.markMessageAsRead(
        mockMessage._id.toString(),
        '507f1f77bcf86cd799439011'
      );

      // Assert
      expect(mockMessage.isRead).toBe(true);
      expect(mockMessage.save).toHaveBeenCalled();
    });

    it('should throw error when marking own message as read', async () => {
      // Arrange
      const mockMessage = {
        sender: new Types.ObjectId('507f1f77bcf86cd799439011'),
        conversation: new Types.ObjectId(),
      };

      (Message.findById as any).mockResolvedValue(mockMessage);
      (Conversation.findById as any).mockResolvedValue({
        participants: [new Types.ObjectId('507f1f77bcf86cd799439011')],
      });

      // Act & Assert
      await expect(
        MessageService.markMessageAsRead('507f1f77bcf86cd799439018', '507f1f77bcf86cd799439011')
      ).rejects.toThrow('You cannot mark your own messages as read');
    });
  });

  describe('deleteMessage()', () => {
        it('should soft delete own message', async () => {
      // Arrange
      const senderId = '507f1f77bcf86cd799439011';
      const messageId = new Types.ObjectId().toString();
      const mockMessage = {
        sender: new Types.ObjectId(senderId),
        isDeleted: false,
        save: mock(async () => Promise.resolve()),
      };

      (Message.findById as any).mockResolvedValue(mockMessage);

      // Act
      await MessageService.deleteMessage(messageId, senderId);

      // Assert
      expect(mockMessage.isDeleted).toBe(true);
      expect(mockMessage.save).toHaveBeenCalled();
    });

        it('should throw error if not message sender', async () => {
      // Arrange
      const mockMessage = {
        sender: new Types.ObjectId('507f1f77bcf86cd799439011'),
        isDeleted: false,
        save: mock(async () => Promise.resolve()),
      };

      (Message.findById as any).mockResolvedValue(mockMessage);

      // Act & Assert - different user tries to delete
      await expect(
        MessageService.deleteMessage('any-message-id', '507f1f77bcf86cd799439099')
      ).rejects.toThrow('You can only delete your own messages');
    });
  });
});