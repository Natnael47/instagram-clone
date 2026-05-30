import { asyncHandler } from "@middleware/asyncHandler";
import { User, type UserDocument } from "@models/User";
import { ApiError } from "@utils/ApiError";
import { extractTokenFromHeader, verifyToken } from "@utils/generateToken";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request object
 * Protected routes should use this middleware
 */
export const protect = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      throw ApiError.unauthorized("Not authorized. No token provided.");
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      throw ApiError.unauthorized("Not authorized. Invalid token.");
    }

    // Get user from database
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      throw ApiError.unauthorized("Not authorized. User no longer exists.");
    }

    // Attach user to request
    req.user = user;
    next();
  },
);

/**
 * Optional authentication middleware
 * Verifies token if present but doesn't require it
 * Attaches user if token is valid, otherwise continues without user
 */
export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        const user = await User.findById(decoded.id).select("-password");
        if (user) {
          req.user = user;
        }
      }
    }
    next();
  },
);

/**
 * Role-based authorization middleware factory
 * @param roles - Array of allowed roles
 * @returns Middleware that checks if user has allowed role
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw ApiError.unauthorized("Not authorized");
    }

    // Check if user has required role
    // Note: Add 'role' field to User model if you need role-based auth
    // For now, this is a placeholder
    if (!roles.includes("user")) {
      throw ApiError.forbidden(
        "You don't have permission to perform this action",
      );
    }

    next();
  };
};

/**
 * Resource ownership middleware factory
 * @param getResourceId - Function to extract resource ID from request params
 * @param model - Mongoose model to check ownership
 * @returns Middleware that checks if user owns the resource
 */
export const checkOwnership = (
  getResourceId: (req: Request) => string,
  model: any,
) => {
  return asyncHandler(
    async (req: Request, _res: Response, next: NextFunction) => {
      if (!req.user) {
        throw ApiError.unauthorized("Not authorized");
      }

      const resourceId = getResourceId(req);
      const resource = await model.findById(resourceId);

      if (!resource) {
        throw ApiError.notFound("Resource not found");
      }

      // Check if user is the author/owner
      const userId = req.user._id.toString();
      const resourceUserId =
        resource.author?.toString() || resource.user?.toString();

      if (resourceUserId !== userId) {
        throw ApiError.forbidden(
          "You don't have permission to modify this resource",
        );
      }

      next();
    },
  );
};
