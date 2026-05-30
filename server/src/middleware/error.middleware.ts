import { env } from "@config/env";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import type { NextFunction, Request, Response } from "express";

/**
 * 404 Not Found middleware
 * Catches all unmatched routes and creates a 404 error
 */
export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const error = ApiError.notFound(`Not Found - ${req.originalUrl}`);
  next(error);
};

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 * Formats errors consistently for API responses
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Log the error
  logger.error(
    {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userId: (req as any).user?.id,
    },
    "Error occurred",
  );

  // Default values
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: Record<string, string[]> | undefined = undefined;

  // Handle known API errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  }
  // Handle Mongoose validation errors
  else if (err.name === "ValidationError" && (err as any).errors) {
    statusCode = 400;
    message = "Validation Error";
    const validationErrors: Record<string, string[]> = {};
    const errorsObj = (err as any).errors;
    for (const key in errorsObj) {
      validationErrors[key] = [errorsObj[key].message];
    }
    errors = validationErrors;
  }
  // Handle Mongoose duplicate key error
  else if (err.name === "MongoServerError" && (err as any).code === 11000) {
    statusCode = 409;
    const keyPattern = (err as any).keyPattern;
    if (keyPattern) {
      const field = Object.keys(keyPattern)[0];
      if (field) {
        message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
      } else {
        message = "Duplicate field value already exists";
      }
    } else {
      message = "Duplicate field value already exists";
    }
  }
  // Handle JWT errors
  else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }
  // Handle generic errors
  else if (err.message) {
    message = err.message;
  }

  // Prepare response object
  const errorResponse: {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
    stack?: string;
  } = {
    success: false,
    message,
  };

  // Add validation errors if present
  if (errors && Object.keys(errors).length > 0) {
    errorResponse.errors = errors;
  }

  // Add stack trace in development mode only
  if (env.NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle uncaught exceptions and unhandled rejections
 * These are registered in server.ts
 */
export const handleUncaughtErrors = (): void => {
  // Handle uncaught exceptions
  process.on("uncaughtException", (err: Error) => {
    logger.error({ error: err }, "UNCAUGHT EXCEPTION! Shutting down...");
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on("unhandledRejection", (err: Error) => {
    logger.error({ error: err }, "UNHANDLED REJECTION! Shutting down...");
    process.exit(1);
  });
};

/**
 * Graceful shutdown handler
 * Closes server and database connections properly
 */
export const gracefulShutdown = (
  server: import("http").Server,
  mongoose: typeof import("mongoose"),
): void => {
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Close server
    server.close(async () => {
      logger.info("HTTP server closed");

      // Close database connection
      try {
        await mongoose.connection.close();
        logger.info("Database connection closed");
      } catch (err) {
        logger.error({ error: err }, "Error closing database connection");
      }

      logger.info("Graceful shutdown completed");
      process.exit(0);
    });

    // Force close after 10 seconds if server doesn't close naturally
    setTimeout(() => {
      logger.error(
        "Could not close connections in time, forcefully shutting down",
      );
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};
