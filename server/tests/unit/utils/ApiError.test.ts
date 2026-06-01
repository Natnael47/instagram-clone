import { describe, it, expect } from 'bun:test';
import { ApiError } from '../../../src/utils/ApiError';

describe('ApiError', () => {
  
  describe('Constructor', () => {
    it('should create an error with status code and message', () => {
      const error = new ApiError(404, 'User not found');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ApiError);
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.isOperational).toBe(true);
    });

    it('should set isOperational to true by default', () => {
      const error = new ApiError(500, 'Server error');
      expect(error.isOperational).toBe(true);
    });

    it('should allow custom isOperational flag', () => {
      const error = new ApiError(500, 'Programming error', undefined, false);
      expect(error.isOperational).toBe(false);
    });

    it('should accept validation errors object', () => {
      const validationErrors = {
        email: ['Email is required'],
        password: ['Password must be at least 6 characters'],
      };
      
      const error = new ApiError(400, 'Validation failed', validationErrors);
      expect(error.errors).toEqual(validationErrors);
    });

    it('should capture stack trace', () => {
      const error = new ApiError(500, 'Error with stack');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApiError');
    });

    it('should accept custom stack trace', () => {
      const customStack = 'Custom stack trace';
      const error = new ApiError(500, 'Error', undefined, true, customStack);
      expect(error.stack).toBe(customStack);
    });
  });

  describe('Static Factory Methods', () => {
    describe('badRequest()', () => {
      it('should create a 400 error', () => {
        const error = ApiError.badRequest('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('Invalid input');
        expect(error.isOperational).toBe(true);
      });

      it('should accept validation errors', () => {
        const errors = { username: ['Username is required'] };
        const error = ApiError.badRequest('Validation error', errors);
        expect(error.statusCode).toBe(400);
        expect(error.errors).toEqual(errors);
      });
    });

    describe('unauthorized()', () => {
      it('should create a 401 error with default message', () => {
        const error = ApiError.unauthorized();
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Not authorized');
      });

      it('should create a 401 error with custom message', () => {
        const error = ApiError.unauthorized('Token expired');
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Token expired');
      });
    });

    describe('forbidden()', () => {
      it('should create a 403 error with default message', () => {
        const error = ApiError.forbidden();
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('Forbidden');
      });

      it('should create a 403 error with custom message', () => {
        const error = ApiError.forbidden('Access denied');
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('Access denied');
      });
    });

    describe('notFound()', () => {
      it('should create a 404 error with default message', () => {
        const error = ApiError.notFound();
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('Resource not found');
      });

      it('should create a 404 error with custom message', () => {
        const error = ApiError.notFound('User not found');
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('User not found');
      });
    });

    describe('conflict()', () => {
      it('should create a 409 error', () => {
        const error = ApiError.conflict('Email already exists');
        expect(error.statusCode).toBe(409);
        expect(error.message).toBe('Email already exists');
      });
    });

    describe('tooMany()', () => {
      it('should create a 429 error with default message', () => {
        const error = ApiError.tooMany();
        expect(error.statusCode).toBe(429);
        expect(error.message).toBe('Too many requests');
      });

      it('should create a 429 error with custom message', () => {
        const error = ApiError.tooMany('Rate limit exceeded');
        expect(error.statusCode).toBe(429);
        expect(error.message).toBe('Rate limit exceeded');
      });
    });

    describe('internal()', () => {
      it('should create a 500 error with default message', () => {
        const error = ApiError.internal();
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Internal server error');
        expect(error.isOperational).toBe(true);
      });

      it('should create a 500 error with custom message', () => {
        const error = ApiError.internal('Database connection failed');
        expect(error.statusCode).toBe(500);
        expect(error.message).toBe('Database connection failed');
      });
    });
  });

  describe('Error Behavior', () => {
    it('should be throwable and catchable', () => {
      expect(() => {
        throw ApiError.badRequest('Test error');
      }).toThrow(ApiError);
    });

    it('should be catchable with specific status code', () => {
      try {
        throw ApiError.notFound('User not found');
      } catch (error) {
        if (error instanceof ApiError) {
          expect(error.statusCode).toBe(404);
          expect(error.message).toBe('User not found');
        } else {
          throw new Error('Wrong error type caught');
        }
      }
    });

    it('should be instanceof Error for try-catch compatibility', () => {
      const error = ApiError.badRequest('Test');
      expect(error instanceof Error).toBe(true);
    });

    it('should maintain prototype chain', () => {
      const error = ApiError.unauthorized();
      expect(error.constructor.name).toBe('ApiError');
      expect(Object.getPrototypeOf(error)).toBe(ApiError.prototype);
    });
  });
});