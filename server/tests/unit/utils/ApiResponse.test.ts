import { describe, it, expect } from 'bun:test';
import { ApiResponse, PaginatedResponse } from '../../../src/utils/ApiResponse';

describe('ApiResponse', () => {
  
  describe('Constructor', () => {
    it('should create a response with success, message, and data', () => {
      const data = { id: 1, name: 'John' };
      const response = new ApiResponse(true, 'Success', data);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toEqual(data);
      expect(response.timestamp).toBeDefined();
    });

    it('should create a response without data', () => {
      const response = new ApiResponse(true, 'Success');
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toBeUndefined();
    });

    it('should generate ISO timestamp on creation', () => {
      const before = new Date();
      const response = new ApiResponse(true, 'Test');
      const after = new Date();
      
      const timestamp = new Date(response.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('Static Factory Methods', () => {
    describe('success()', () => {
      it('should create a success response with data', () => {
        const data = { userId: '123', username: 'john' };
        const response = ApiResponse.success('User created', data);
        
        expect(response.success).toBe(true);
        expect(response.message).toBe('User created');
        expect(response.data).toEqual(data);
        expect(response).toBeInstanceOf(ApiResponse);
      });

      it('should create a success response without data', () => {
        const response = ApiResponse.success('Operation completed');
        
        expect(response.success).toBe(true);
        expect(response.message).toBe('Operation completed');
        expect(response.data).toBeUndefined();
      });

      it('should handle null data', () => {
        const response = ApiResponse.success('No results', null);
        
        expect(response.success).toBe(true);
        expect(response.data).toBeNull();
      });

      it('should handle array data', () => {
        const data = [1, 2, 3];
        const response = ApiResponse.success('List retrieved', data);
        
        expect(response.success).toBe(true);
        expect(response.data).toEqual([1, 2, 3]);
      });
    });

    describe('error()', () => {
      it('should create an error response', () => {
        const response = ApiResponse.error('User not found');
        
        expect(response.success).toBe(false);
        expect(response.message).toBe('User not found');
        expect(response.data).toBeUndefined();
      });

      it('should create an error response with error details', () => {
        const errors = { email: ['Already exists'] };
        const response = ApiResponse.error('Validation failed', errors);
        
        expect(response.success).toBe(false);
        expect(response.message).toBe('Validation failed');
        expect(response.data).toEqual(errors);
      });
    });
  });

  describe('toJSON()', () => {
    it('should return object with success, message, and timestamp', () => {
      const response = ApiResponse.success('Test');
      const json = response.toJSON();
      
      expect(json.success).toBe(true);
      expect(json.message).toBe('Test');
      expect(json.timestamp).toBeDefined();
      expect(json.data).toBeUndefined();
    });

    it('should include data when present', () => {
      const data = { id: 1 };
      const response = ApiResponse.success('With data', data);
      const json = response.toJSON();
      
      expect(json.data).toEqual(data);
    });

    it('should not include data when undefined', () => {
      const response = ApiResponse.error('No data');
      const json = response.toJSON();
      
      expect(json.success).toBe(false);
      expect(json).not.toHaveProperty('data');
    });
  });

  describe('Generic Type Support', () => {
    it('should work with typed data', () => {
      interface User {
        id: string;
        email: string;
      }
      
      const user: User = { id: '1', email: 'test@test.com' };
      const response = ApiResponse.success<User>('User found', user);
      
      expect(response.data?.id).toBe('1');
      expect(response.data?.email).toBe('test@test.com');
    });
  });
});

describe('PaginatedResponse', () => {
  
  describe('Constructor', () => {
    it('should create paginated response with correct metadata', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const response = new PaginatedResponse(data, 1, 10, 25);
      
      expect(response.success).toBe(true);
      expect(response.message).toBe('Success');
      expect(response.data).toEqual(data);
      expect(response.pagination).toBeDefined();
    });

    it('should calculate pagination correctly - first page', () => {
      const response = new PaginatedResponse([], 1, 10, 25);
      
      expect(response.pagination.page).toBe(1);
      expect(response.pagination.limit).toBe(10);
      expect(response.pagination.total).toBe(25);
      expect(response.pagination.pages).toBe(3); // ceil(25/10)
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(false);
    });

    it('should calculate pagination correctly - middle page', () => {
      const response = new PaginatedResponse([], 2, 10, 25);
      
      expect(response.pagination.page).toBe(2);
      expect(response.pagination.hasNext).toBe(true);
      expect(response.pagination.hasPrev).toBe(true);
    });

    it('should calculate pagination correctly - last page', () => {
      const response = new PaginatedResponse([], 3, 10, 25);
      
      expect(response.pagination.page).toBe(3);
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrev).toBe(true);
    });

    it('should calculate pagination correctly - single page', () => {
      const response = new PaginatedResponse([], 1, 10, 5);
      
      expect(response.pagination.pages).toBe(1);
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrev).toBe(false);
    });

    it('should handle exactly divisible pages', () => {
      const response = new PaginatedResponse([], 1, 10, 30);
      
      expect(response.pagination.pages).toBe(3);
    });

    it('should accept custom message', () => {
      const response = new PaginatedResponse([], 1, 10, 25, 'Items retrieved');
      
      expect(response.message).toBe('Items retrieved');
    });
  });

  describe('toJSON()', () => {
    it('should include pagination in JSON', () => {
      const data = [{ id: 1 }, { id: 2 }];
      const response = new PaginatedResponse(data, 1, 10, 20);
      const json = response.toJSON();
      
      expect(json.success).toBe(true);
      expect(json.data).toEqual(data);
      expect(json.pagination).toBeDefined();
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.limit).toBe(10);
      expect(json.pagination.total).toBe(20);
      expect(json.pagination.pages).toBe(2);
      expect(json.timestamp).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty data', () => {
      const response = new PaginatedResponse([], 1, 10, 0);
      
      expect(response.data).toEqual([]);
      expect(response.pagination.total).toBe(0);
      expect(response.pagination.pages).toBe(0);
    });

    it('should handle page number higher than total pages', () => {
      const response = new PaginatedResponse([], 5, 10, 25);
      
      expect(response.pagination.hasNext).toBe(false);
      expect(response.pagination.hasPrev).toBe(true);
    });

    it('should handle limit larger than total', () => {
      const response = new PaginatedResponse([], 1, 100, 25);
      
      expect(response.pagination.pages).toBe(1);
      expect(response.pagination.hasNext).toBe(false);
    });
  });
});