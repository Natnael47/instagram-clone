import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { validate, validateParams, validateQuery, validateBody, sanitizeBody } from '../../../src/middleware/validate.middleware';
import { ApiError } from '../../../src/utils/ApiError';
import type { Request, Response, NextFunction } from 'express';
import { body, param, query, type ValidationChain } from 'express-validator';

function createMockReqRes() {
  const req = {
    params: {} as Record<string, string>,
    query: {} as Record<string, string>,
    body: {} as Record<string, any>,
  } as Request;
  
  const res = {} as Response;
  const next = mock(() => {}) as NextFunction;

  return { req, res, next };
}

describe('Validate Middleware - Unit Tests', () => {
  
  beforeEach(() => {
    mock.restore();
  });

  describe('validate()', () => {
    it('should call next when validation passes', async () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: 'test@test.com', password: 'Password123!' };
      
      const validations: ValidationChain[] = [
        body('email').isEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password too short'),
      ];

      const middleware = validate(validations);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw validation error when validation fails', async () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: 'invalid-email', password: '123' };
      
      const validations: ValidationChain[] = [
        body('email').isEmail().withMessage('Valid email required'),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
      ];

      const middleware = validate(validations);
      
      await expect(middleware(req, res, next)).rejects.toThrow('Validation failed');
    });

    it('should format multiple field errors', async () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: '', username: '' };
      
      const validations: ValidationChain[] = [
        body('email').notEmpty().withMessage('Email is required'),
        body('username').notEmpty().withMessage('Username is required'),
      ];

      const middleware = validate(validations);
      
      try {
        await middleware(req, res, next);
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        if (error instanceof ApiError) {
          expect(error.errors).toBeDefined();
          expect(error.errors?.email).toBeDefined();
          expect(error.errors?.username).toBeDefined();
        }
      }
    });

    it('should handle empty validation array', async () => {
      const { req, res, next } = createMockResReq();
      
      const middleware = validate([]);
      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('validateParams()', () => {
    it('should call next when all required params are present', () => {
      const { req, res, next } = createMockResReq();
      req.params = { id: '123', userId: '456' };

      const middleware = validateParams(['id', 'userId']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error when params are missing', () => {
      const { req, res, next } = createMockResReq();
      req.params = { id: '123' };

      const middleware = validateParams(['id', 'userId']);
      
      expect(() => middleware(req, res, next)).toThrow('Missing required parameters: userId');
    });

    it('should throw error when multiple params are missing', () => {
      const { req, res, next } = createMockResReq();
      req.params = {};

      const middleware = validateParams(['id', 'userId', 'postId']);
      
      expect(() => middleware(req, res, next)).toThrow('Missing required parameters: id, userId, postId');
    });

    it('should handle empty params object', () => {
      const { req, res, next } = createMockResReq();

      const middleware = validateParams(['id']);
      
      expect(() => middleware(req, res, next)).toThrow('Missing required parameters: id');
    });
  });

  describe('validateQuery()', () => {
    it('should call next when all required query params are present', () => {
      const { req, res, next } = createMockResReq();
      req.query = { q: 'search', page: '1' };

      const middleware = validateQuery(['q', 'page']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error when query params are missing', () => {
      const { req, res, next } = createMockResReq();
      req.query = { page: '1' };

      const middleware = validateQuery(['q', 'page']);
      
      expect(() => middleware(req, res, next)).toThrow('Missing required query parameters: q');
    });
  });

  describe('validateBody()', () => {
    it('should call next when all required body fields are present', () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: 'test@test.com', password: '123456', username: 'test' };

      const middleware = validateBody(['email', 'password']);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should throw error when body fields are missing', () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: 'test@test.com' };

      const middleware = validateBody(['email', 'password']);
      
      expect(() => middleware(req, res, next)).toThrow('Missing required fields: password');
    });

    it('should treat empty strings as missing', () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: '', password: '123456' };

      const middleware = validateBody(['email', 'password']);
      
      expect(() => middleware(req, res, next)).toThrow('Missing required fields: email');
    });
  });

  describe('sanitizeBody()', () => {
    it('should remove specified fields from body', () => {
      const { req, res, next } = createMockResReq();
      req.body = { 
        email: 'test@test.com', 
        password: 'secret', 
        role: 'admin',
        isAdmin: true 
      };

      const middleware = sanitizeBody(['password', 'role']);
      middleware(req, res, next);

      expect(req.body.email).toBe('test@test.com');
      expect(req.body.isAdmin).toBe(true);
      expect(req.body.password).toBeUndefined();
      expect(req.body.role).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle empty fields array', () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: 'test@test.com' };

      const middleware = sanitizeBody([]);
      middleware(req, res, next);

      expect(req.body.email).toBe('test@test.com');
      expect(next).toHaveBeenCalled();
    });

    it('should handle non-existent fields gracefully', () => {
      const { req, res, next } = createMockResReq();
      req.body = { email: 'test@test.com' };

      const middleware = sanitizeBody(['nonexistent']);
      middleware(req, res, next);

      expect(req.body.email).toBe('test@test.com');
      expect(next).toHaveBeenCalled();
    });
  });
});