import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { protect, optionalAuth, restrictTo, checkOwnership } from '../../../src/middleware/auth.middleware';
import { ApiError } from '../../../src/utils/ApiError';
import { Types } from 'mongoose';
import type { Request, Response, NextFunction } from 'express';

// Mock User model
mock.module('../../../src/models/User', () => ({
  User: {
    findById: mock(),
  },
}));

// Mock generateToken
mock.module('../../../src/utils/generateToken', () => ({
  extractTokenFromHeader: mock(),
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

// Helper to create mock Express objects
function createMockReqRes() {
  const req = {
    headers: {} as Record<string, string>,
    user: undefined as any,
  } as Request;
  
  const res = {
    status: mock(() => res),
    json: mock(() => res),
  } as unknown as Response;
  
  const next = mock(() => {}) as NextFunction;

  return { req, res, next };
}

describe('Auth Middleware - Unit Tests', () => {
  
  beforeEach(() => {
    mock.restore();
  });

  describe('protect()', () => {
    it('should call next() when valid token is provided', async () => {
      const { req, res, next } = createMockReqRes();
      const { extractTokenFromHeader, verifyToken } = await import('../../../src/utils/generateToken');
      const { User } = await import('../../../src/models/User');

      const mockUser = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        username: 'testuser',
      };

      req.headers.authorization = 'Bearer valid-token';
      (extractTokenFromHeader as any).mockReturnValue('valid-token');
      (verifyToken as any).mockReturnValue({ id: '507f1f77bcf86cd799439011', type: 'access' });
      
      (User.findById as any).mockReturnValue({
        select: mock().mockResolvedValue(mockUser),
      });

      await protect(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should throw error when no token is provided', async () => {
      const { req, res, next } = createMockResReq();
      const { extractTokenFromHeader } = await import('../../../src/utils/generateToken');

      (extractTokenFromHeader as any).mockReturnValue(null);

      await expect(protect(req, res, next)).rejects.toThrow('Not authorized. No token provided.');
    });

    it('should throw error when token is invalid', async () => {
      const { req, res, next } = createMockResReq();
      const { extractTokenFromHeader, verifyToken } = await import('../../../src/utils/generateToken');

      req.headers.authorization = 'Bearer invalid-token';
      (extractTokenFromHeader as any).mockReturnValue('invalid-token');
      (verifyToken as any).mockReturnValue(null);

      await expect(protect(req, res, next)).rejects.toThrow('Not authorized. Invalid token.');
    });

    it('should throw error when user no longer exists', async () => {
      const { req, res, next } = createMockResReq();
      const { extractTokenFromHeader, verifyToken } = await import('../../../src/utils/generateToken');
      const { User } = await import('../../../src/models/User');

      req.headers.authorization = 'Bearer valid-token';
      (extractTokenFromHeader as any).mockReturnValue('valid-token');
      (verifyToken as any).mockReturnValue({ id: '507f1f77bcf86cd799439011', type: 'access' });
      
      (User.findById as any).mockReturnValue({
        select: mock().mockResolvedValue(null),
      });

      await expect(protect(req, res, next)).rejects.toThrow('Not authorized. User no longer exists.');
    });

    it('should throw error when token has no id field', async () => {
      const { req, res, next } = createMockResReq();
      const { extractTokenFromHeader, verifyToken } = await import('../../../src/utils/generateToken');

      req.headers.authorization = 'Bearer no-id-token';
      (extractTokenFromHeader as any).mockReturnValue('no-id-token');
      (verifyToken as any).mockReturnValue({ type: 'access' }); // No id field

      await expect(protect(req, res, next)).rejects.toThrow('Not authorized. Invalid token.');
    });
  });

  describe('optionalAuth()', () => {
    it('should call next() without user when no token provided', async () => {
      const { req, res, next } = createMockResReq();
      const { extractTokenFromHeader } = await import('../../../src/utils/generateToken');

      (extractTokenFromHeader as any).mockReturnValue(null);

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });

    it('should attach user when valid token provided', async () => {
      const { req, res, next } = createMockResReq();
      const { extractTokenFromHeader, verifyToken } = await import('../../../src/utils/generateToken');
      const { User } = await import('../../../src/models/User');

      const mockUser = { _id: new Types.ObjectId(), username: 'testuser' };

      req.headers.authorization = 'Bearer valid-token';
      (extractTokenFromHeader as any).mockReturnValue('valid-token');
      (verifyToken as any).mockReturnValue({ id: 'user-id', type: 'access' });
      (User.findById as any).mockReturnValue({
        select: mock().mockResolvedValue(mockUser),
      });

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should call next() without user when token is invalid', async () => {
      const { req, res, next } = createMockResReq();
      const { extractTokenFromHeader, verifyToken } = await import('../../../src/utils/generateToken');

      req.headers.authorization = 'Bearer invalid-token';
      (extractTokenFromHeader as any).mockReturnValue('invalid-token');
      (verifyToken as any).mockReturnValue(null);

      await optionalAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
    });
  });

  describe('restrictTo()', () => {
    it('should call next() when user has allowed role', () => {
      const { req, res, next } = createMockResReq();
      req.user = { role: 'admin' } as any;

      const middleware = restrictTo('admin', 'moderator');
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error when user has no role', () => {
      const { req, res, next } = createMockResReq();
      req.user = {} as any;

      const middleware = restrictTo('admin');
      
      expect(() => middleware(req, res, next)).toThrow('You don\'t have permission to perform this action');
    });

    it('should throw error when no user is attached', () => {
      const { req, res, next } = createMockResReq();

      const middleware = restrictTo('admin');
      
      expect(() => middleware(req, res, next)).toThrow('Not authorized');
    });
  });

  describe('checkOwnership()', () => {
    it('should call next() when user owns the resource', async () => {
      const { req, res, next } = createMockResReq();
      req.user = { _id: new Types.ObjectId('507f1f77bcf86cd799439011') } as any;
      req.params = { id: 'resource-id' };

      const mockModel = {
        findById: mock().mockResolvedValue({
          author: new Types.ObjectId('507f1f77bcf86cd799439011'),
        }),
      };

      const middleware = checkOwnership((req) => req.params.id, mockModel);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error when user does not own resource', async () => {
      const { req, res, next } = createMockResReq();
      req.user = { _id: new Types.ObjectId('507f1f77bcf86cd799439011') } as any;
      req.params = { id: 'resource-id' };

      const mockModel = {
        findById: mock().mockResolvedValue({
          author: new Types.ObjectId('different-author-id'),
        }),
      };

      const middleware = checkOwnership((req) => req.params.id, mockModel);
      
      await expect(middleware(req, res, next)).rejects.toThrow('You don\'t have permission to modify this resource');
    });

    it('should throw error when resource not found', async () => {
      const { req, res, next } = createMockResReq();
      req.user = { _id: new Types.ObjectId('507f1f77bcf86cd799439011') } as any;
      req.params = { id: 'nonexistent' };

      const mockModel = {
        findById: mock().mockResolvedValue(null),
      };

      const middleware = checkOwnership((req) => req.params.id, mockModel);
      
      await expect(middleware(req, res, next)).rejects.toThrow('Resource not found');
    });

    it('should throw error when no user is attached', async () => {
      const { req, res, next } = createMockResReq();
      req.params = { id: 'resource-id' };

      const mockModel = { findById: mock() };
      const middleware = checkOwnership((req) => req.params.id, mockModel);
      
      await expect(middleware(req, res, next)).rejects.toThrow('Not authorized');
    });
  });
});