import { isRedisAvailable } from "@config/redis";
import { asyncHandler } from "@middleware/asyncHandler";
import { User, type UserDocument } from "@models/User";
import { RedisService } from "@services/redis.service";
import { ApiError } from "@utils/ApiError";
import { extractTokenFromHeader, verifyToken } from "@utils/generateToken";
import { logger } from "@utils/logger";
import type { NextFunction, Request, Response } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

/**
 * Check if token is blacklisted in Redis
 * @param token - JWT token to check
 * @returns true if token is blacklisted
 */
async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!isRedisAvailable()) {
    return false; // Can't check blacklist without Redis
  }

  try {
    const blacklisted = await RedisService.get(`blacklist:token:${token}`);
    return blacklisted !== null;
  } catch (error) {
    logger.error({ err: error }, "Failed to check token blacklist");
    return false; // Fail open - allow access if Redis check fails
  }
}

/**
 * Blacklist a token in Redis (used on logout)
 * @param token - JWT token to blacklist
 * @param expiresInSeconds - Token expiration in seconds
 */
export async function blacklistToken(
  token: string,
  expiresInSeconds: number = 900, // 15 minutes default
): Promise<void> {
  if (!isRedisAvailable()) {
    logger.warn("Cannot blacklist token - Redis not available");
    return;
  }

  try {
    await RedisService.set(`blacklist:token:${token}`, "1", {
      ttl: expiresInSeconds,
    });
    logger.info("Token blacklisted in Redis");
  } catch (error) {
    logger.error({ err: error }, "Failed to blacklist token");
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

    // Check if token is blacklisted (Redis)
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw ApiError.unauthorized(
        "Token has been revoked. Please login again.",
      );
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

    // Cache user in Redis for faster subsequent requests
    if (isRedisAvailable()) {
      RedisService.set(
        `user:${user._id.toString()}`,
        JSON.stringify({
          _id: user._id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          profilePicture: user.profilePicture,
        }),
        { ttl: 300 },
      ) // Cache for 5 minutes
        .catch((err) => logger.error({ err }, "Failed to cache user in Redis"));
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
      // Check if token is blacklisted
      const blacklisted = await isTokenBlacklisted(token);
      if (blacklisted) {
        // Token is blacklisted, continue without user
        return next();
      }

      const decoded = verifyToken(token);
      if (decoded && decoded.id) {
        // Try to get user from Redis cache first
        let user = null;

        if (isRedisAvailable()) {
          try {
            const cachedUser = await RedisService.get(`user:${decoded.id}`);
            if (cachedUser) {
              user = JSON.parse(cachedUser);
            }
          } catch {
            // Cache miss or error, fall through to database
          }
        }

        // If not in cache, get from database
        if (!user) {
          user = await User.findById(decoded.id).select("-password");

          // Cache for future requests
          if (user && isRedisAvailable()) {
            RedisService.set(
              `user:${user._id.toString()}`,
              JSON.stringify({
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                profilePicture: user.profilePicture,
              }),
              { ttl: 300 },
            ).catch((err) =>
              logger.error({ err }, "Failed to cache user in Redis"),
            );
          }
        }

        if (user) {
          req.user = user as UserDocument;
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
