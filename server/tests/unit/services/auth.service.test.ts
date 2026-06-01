import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { AuthService } from '../../../src/services/auth.service';
import { User } from '../../../src/models/User';
import { ApiError } from '../../../src/utils/ApiError';
import { Types } from 'mongoose';
import { testUser, validRegistrationData } from '../../fixtures/users';

// Mock User model
mock.module('../../../src/models/User', () => ({
  User: {
    findOne: mock(),
    findById: mock(),
    create: mock(),
    findByIdAndUpdate: mock(),
  },
}));

// Mock generateToken functions
mock.module('../../../src/utils/generateToken', () => ({
  generateAccessToken: mock(() => 'mock-access-token'),
  generateRefreshToken: mock(() => 'mock-refresh-token'),
  verifyToken: mock(),
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

describe('AuthService - Unit Tests', () => {
  
  beforeEach(() => {
    // Reset all mocks before each test
    mock.restore();
  });

  describe('register()', () => {
    it('should register a new user successfully', async () => {
      // Arrange: No existing user found
      (User.findOne as any).mockResolvedValue(null);
      (User.create as any).mockResolvedValue({
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        username: 'newuser',
        email: 'newuser@example.com',
        fullName: 'New User',
        toObject: () => ({
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          username: 'newuser',
          email: 'newuser@example.com',
          fullName: 'New User',
        }),
      });

      // Act
      const result = await AuthService.register(validRegistrationData);

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toBeDefined();
      expect(User.create).toHaveBeenCalled();
    });

    it('should throw error if email already exists', async () => {
      // Arrange: User with same email exists
      (User.findOne as any).mockResolvedValue({
        email: 'newuser@example.com',
        username: 'different',
      });

      // Act & Assert
      await expect(
        AuthService.register(validRegistrationData)
      ).rejects.toThrow(ApiError);
      
      await expect(
        AuthService.register(validRegistrationData)
      ).rejects.toThrow('Email already registered');
    });

    it('should throw error if username already exists', async () => {
      // Arrange: User with same username exists
      (User.findOne as any).mockResolvedValue({
        email: 'different@example.com',
        username: 'newuser',
      });

      // Act & Assert
      await expect(
        AuthService.register(validRegistrationData)
      ).rejects.toThrow('Username already taken');
    });
  });

  describe('login()', () => {
    it('should login user with valid email and password', async () => {
      // Arrange
      const mockUser = {
        _id: testUser._id,
        email: testUser.email,
        username: testUser.username,
        matchPassword: mock(async () => true),
        toObject: () => ({
          _id: testUser._id,
          username: testUser.username,
          email: testUser.email,
          password: 'hashedpassword',
        }),
      };

      (User.findOne as any).mockReturnValue({
        select: mock().mockResolvedValue(mockUser),
      });

      // Act
      const result = await AuthService.login('testuser@example.com', 'password123');

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.user).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      // Arrange: User not found
      (User.findOne as any).mockReturnValue({
        select: mock().mockResolvedValue(null),
      });

      // Act & Assert
      await expect(
        AuthService.login('wrong@email.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw error for wrong password', async () => {
      // Arrange: User found but wrong password
      const mockUser = {
        matchPassword: mock(async () => false),
        toObject: () => ({}),
      };

      (User.findOne as any).mockReturnValue({
        select: mock().mockResolvedValue(mockUser),
      });

      // Act & Assert
      await expect(
        AuthService.login('testuser@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

    describe('getCurrentUser()', () => {
    it('should return user profile without password', async () => {
      // Arrange: Create a chainable mock that returns `this` for each method
      const mockPopulateChain = {
        select: mock(function(this: any) { return this; }),
        populate: mock(function(this: any) { return this; }),
      };
      
      const mockResolvedUser = {
        _id: testUser._id,
        username: testUser.username,
        email: testUser.email,
        fullName: testUser.fullName,
      };

      // Final populate resolves with user
      mockPopulateChain.populate = mock()
        .mockImplementationOnce(function(this: any) { return this; }) // first populate
        .mockResolvedValueOnce(mockResolvedUser); // second populate resolves

      (User.findById as any).mockReturnValue(mockPopulateChain);

      // Act
      const result = await AuthService.getCurrentUser(testUser._id.toString());

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw error if user not found', async () => {
      // Arrange
      const mockChain = {
        select: mock(function(this: any) { return this; }),
        populate: mock(function(this: any) { return this; }),
      };
      mockChain.populate = mock()
        .mockImplementationOnce(function(this: any) { return this; })
        .mockResolvedValueOnce(null);

      (User.findById as any).mockReturnValue(mockChain);

      // Act & Assert
      await expect(
        AuthService.getCurrentUser('507f1f77bcf86cd799439012')
      ).rejects.toThrow('User not found');
    });
  });

  describe('changePassword()', () => {
    it('should change password successfully', async () => {
      // Arrange
      const mockUser = {
        matchPassword: mock(async () => true),
        save: mock(async () => Promise.resolve()),
        password: '',
      };

      (User.findById as any).mockReturnValue({
        select: mock().mockResolvedValue(mockUser),
      });

      // Act
      await AuthService.changePassword(
        testUser._id.toString(),
        'oldpassword',
        'newpassword'
      );

      // Assert
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.password).toBe('newpassword');
    });

    it('should throw error if current password is incorrect', async () => {
      // Arrange
      const mockUser = {
        matchPassword: mock(async () => false),
      };

      (User.findById as any).mockReturnValue({
        select: mock().mockResolvedValue(mockUser),
      });

      // Act & Assert
      await expect(
        AuthService.changePassword(
          testUser._id.toString(),
          'wrongpassword',
          'newpassword'
        )
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('updateProfile()', () => {
    it('should update user profile successfully', async () => {
      // Arrange: No username/email conflict
      (User.findOne as any).mockResolvedValue(null);
      (User.findByIdAndUpdate as any).mockReturnValue({
        select: mock().mockResolvedValue({
          _id: testUser._id,
          username: 'updateduser',
          fullName: 'Updated Name',
        }),
      });

      // Act
      const result = await AuthService.updateProfile(
        testUser._id.toString(),
        { fullName: 'Updated Name', bio: 'New bio' }
      );

      // Assert
      expect(result).toBeDefined();
    });

    it('should throw error if new username is taken', async () => {
      // Arrange: Username conflict
      (User.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        username: 'takenusername',
      });

      // Act & Assert
      await expect(
        AuthService.updateProfile(testUser._id.toString(), {
          username: 'takenusername',
        })
      ).rejects.toThrow('Username already taken');
    });

    it('should throw error if new email is taken', async () => {
      // Arrange: Email conflict
      (User.findOne as any).mockResolvedValue({
        _id: new Types.ObjectId(),
        email: 'taken@email.com',
      });

      // Act & Assert
      await expect(
        AuthService.updateProfile(testUser._id.toString(), {
          email: 'taken@email.com',
        })
      ).rejects.toThrow('Email already registered');
    });
  });

  describe('refreshAccessToken()', () => {
    it('should refresh access token successfully', async () => {
      // Arrange
      const { verifyToken } = await import('../../../src/utils/generateToken');
      (verifyToken as any).mockReturnValue({
        id: testUser._id.toString(),
        type: 'refresh',
      });
      (User.findById as any).mockResolvedValue({ _id: testUser._id });

      // Act
      const result = await AuthService.refreshAccessToken('valid-refresh-token');

      // Assert
      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should throw error for invalid refresh token', async () => {
      // Arrange
      const { verifyToken } = await import('../../../src/utils/generateToken');
      (verifyToken as any).mockReturnValue(null);

      // Act & Assert
      await expect(
        AuthService.refreshAccessToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });
});