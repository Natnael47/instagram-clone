export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: Record<string, string[]>;

  constructor(
    statusCode: number,
    message: string,
    errors?: Record<string, string[]>,
    isOperational = true,
    stack = "",
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(
    message: string,
    errors?: Record<string, string[]>,
  ): ApiError {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Not authorized"): ApiError {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden"): ApiError {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found"): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static tooMany(message = "Too many requests"): ApiError {
    return new ApiError(429, message);
  }

  static internal(message = "Internal server error"): ApiError {
    return new ApiError(500, message, undefined, true);
  }
}
