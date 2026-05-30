import { env } from "@config/env";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import type { NextFunction, Request, Response } from "express";

export const errorHandler = (
  err: Error | ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  let statusCode = 500;
  let message = "Internal server error";
  const errors: Record<string, string[]> = {};

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    if (err.errors) {
      Object.assign(errors, err.errors);
    }
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
  } else if (err.name === "CastError") {
    statusCode = 400;
    message = "Invalid ID format";
  } else if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  if (env.NODE_ENV === "development") {
    logger.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: Object.keys(errors).length > 0 ? errors : undefined,
    stack: env.NODE_ENV === "development" ? err.stack : undefined,
  });
};

export const notFound = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  next(ApiError.notFound(`Route not found: ${req.originalUrl}`));
};
