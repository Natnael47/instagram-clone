import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { notFound, errorHandler } from '../../../src/middleware/error.middleware';
import { ApiError } from '../../../src/utils/ApiError';
import type { Request, Response, NextFunction } from 'express';

// Mock logger
mock.module('../../../src/utils/logger', () => ({
  logger: {
    info: mock(),
    error: mock(),
    warn: mock(),
    debug: mock(),
  },
}));

function createMockReqRes() {
  const req = {
    originalUrl: '/api/v1/test',
    method: 'GET',
    ip: '127.0.0.1',
  } as Request;

  const statusMock = mock(() => res);
  const jsonMock = mock(() => res);
  
  const res = {
    status: statusMock,
    json: jsonMock,
    statusCode: 200,
  } as unknown as Response;

  const next = mock(() => {}) as NextFunction;

  return { req, res, next, statusMock, jsonMock };
}

describe('Error Middleware - Unit Tests', () => {
  
  beforeEach(() => {
    mock.restore();
  });

  describe('notFound()', () => {
    it('should create 404 error and call next with it', () => {
      const { req, res, next } = createMockResReq();
      
      notFound(req, res, next);

      expect(next).toHaveBeenCalled();
      const error = (next as any).mock.calls[0][0] as ApiError;
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toContain('Not Found');
      expect(error.message).toContain('/api/v1/test');
    });

    it('should include the original URL in error message', () => {
      const { req, res, next } = createMockResReq();
      req.originalUrl = '/api/v1/users/nonexistent';
      
      notFound(req, res, next);

      const error = (next as any).mock.calls[0][0] as ApiError;
      expect(error.message).toContain('/api/v1/users/nonexistent');
    });
  });

  describe('errorHandler()', () => {
    it('should handle ApiError and return correct status', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const error = ApiError.badRequest('Invalid input');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalled();
      const response = jsonMock.mock.calls[0][0];
      expect(response.success).toBe(false);
      expect(response.message).toBe('Invalid input');
    });

    it('should handle ApiError with validation errors', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const validationErrors = { email: ['Email is required'], password: ['Password too short'] };
      const error = ApiError.badRequest('Validation failed', validationErrors);
      
      errorHandler(error, req, res, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.errors).toEqual(validationErrors);
    });

    it('should handle 401 unauthorized error', () => {
      const { req, res, next, statusMock } = createMockResReq();
      const error = ApiError.unauthorized('Token expired');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(401);
    });

    it('should handle 403 forbidden error', () => {
      const { req, res, next, statusMock } = createMockResReq();
      const error = ApiError.forbidden('Access denied');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle 404 not found error', () => {
      const { req, res, next, statusMock } = createMockResReq();
      const error = ApiError.notFound('User not found');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(404);
    });

    it('should handle 409 conflict error', () => {
      const { req, res, next, statusMock } = createMockResReq();
      const error = ApiError.conflict('Email already exists');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(409);
    });

    it('should handle 429 too many requests error', () => {
      const { req, res, next, statusMock } = createMockResReq();
      const error = ApiError.tooMany('Rate limit exceeded');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(429);
    });

    it('should handle 500 internal server error', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const error = ApiError.internal('Database connection failed');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(500);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toBe('Database connection failed');
    });

    it('should handle generic Error objects as 500', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const error = new Error('Something broke');
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(500);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toBe('Something broke');
    });

    it('should handle Mongoose ValidationError', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const error = {
        name: 'ValidationError',
        message: 'Validation failed',
        errors: {
          email: { message: 'Email is required' },
          username: { message: 'Username is too short' },
        },
      } as unknown as Error;
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.errors).toBeDefined();
      expect(response.errors.email).toEqual(['Email is required']);
    });

    it('should handle Mongoose duplicate key error', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const error = {
        name: 'MongoServerError',
        code: 11000,
        keyPattern: { email: 1 },
      } as unknown as Error;
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(409);
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toContain('Email');
    });

    it('should handle JWT JsonWebTokenError', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const error = { name: 'JsonWebTokenError', message: 'jwt malformed' } as Error;
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock.mock.calls[0][0].message).toBe('Invalid token');
    });

    it('should handle JWT TokenExpiredError', () => {
      const { req, res, next, statusMock, jsonMock } = createMockResReq();
      const error = { name: 'TokenExpiredError', message: 'jwt expired' } as Error;
      
      errorHandler(error, req, res, next);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock.mock.calls[0][0].message).toBe('Token expired');
    });

    it('should include stack trace in development mode', () => {
      const { req, res, next, jsonMock } = createMockResReq();
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.ts:1:1';
      
      errorHandler(error, req, res, next);

      const response = jsonMock.mock.calls[0][0];
      expect(response.stack).toBeDefined();
      expect(response.stack).toContain('Test error');
    });

    it('should always set success to false', () => {
      const { req, res, next, jsonMock } = createMockResReq();
      
      errorHandler(new Error('Any error'), req, res, next);

      expect(jsonMock.mock.calls[0][0].success).toBe(false);
    });
  });
});