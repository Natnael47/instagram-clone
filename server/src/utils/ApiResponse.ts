/**
 * Standard API Response wrapper
 * Ensures consistent response format across all endpoints
 */
export class ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  timestamp: string;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Create a success response
   * @param message - Success message
   * @param data - Optional payload data
   * @returns ApiResponse instance
   */
  static success<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(true, message, data);
  }

  /**
   * Create an error response
   * @param message - Error message
   * @param data - Optional error details (for validation errors, etc.)
   * @returns ApiResponse instance
   */
  static error<T>(message: string, data?: T): ApiResponse<T> {
    return new ApiResponse<T>(false, message, data);
  }

  /**
   * Convert response to JSON-friendly object
   */
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      ...(this.data !== undefined && { data: this.data }),
      timestamp: this.timestamp,
    };
  }
}

/**
 * Paginated response wrapper
 * Used for endpoints that return lists with pagination metadata
 */
export class PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  constructor(
    data: T[],
    page: number,
    limit: number,
    total: number,
    message = "Success",
  ) {
    super(true, message, data);
    const pages = Math.ceil(total / limit);
    this.pagination = {
      page,
      limit,
      total,
      pages,
      hasNext: page < pages,
      hasPrev: page > 1,
    };
  }

  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      pagination: this.pagination,
      timestamp: this.timestamp,
    };
  }
}
