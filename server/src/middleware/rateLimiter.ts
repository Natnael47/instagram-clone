import { env } from "@config/env";
import { getRedisClient, isRedisAvailable } from "@config/redis";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";

// Check if we're in test mode
const isTest = env.NODE_ENV === "test";

/**
 * Get the appropriate store for rate limiting
 * Uses Redis if available, falls back to memory
 */
function getRateLimitStore() {
  if (isRedisAvailable()) {
    try {
      const client = getRedisClient();
      if (client) {
        logger.info("Rate limiter using Redis store");
        return new RedisStore({
          // @ts-expect-error - ioredis client is compatible
          sendCommand: (...args: any[]) => client.call(...args),
          prefix: "rate_limit:",
        });
      }
    } catch (error) {
      logger.warn(
        { err: error instanceof Error ? error.message : String(error) },
        "Failed to create Redis store for rate limiter - falling back to memory",
      );
    }
  }

  logger.info("Rate limiter using memory store");
  return undefined; // undefined = default memory store
}

/**
 * Get a safe client identifier without using req.ip directly
 * Uses x-forwarded-for header or socket remote address
 */
function getClientId(req: any): string {
  // Try to get IP from x-forwarded-for header (common behind proxy)
  const forwarded = req.headers?.["x-forwarded-for"];
  if (forwarded) {
    return typeof forwarded === "string"
      ? forwarded.split(",")[0]?.trim() || "unknown"
      : forwarded[0]?.trim() || "unknown";
  }

  // Try socket remote address
  if (req.socket?.remoteAddress) {
    return req.socket.remoteAddress || "unknown";
  }

  return "unknown";
}

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: isTest ? 1000 : 15 * 60 * 1000,
  max: isTest ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: getRateLimitStore(),
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use client ID
    if ((req as any).user?._id) {
      return `user:${(req as any).user._id.toString()}`;
    }
    return getClientId(req);
  },
  handler: (_req, _res) => {
    throw ApiError.tooMany("Too many requests, please try again later.");
  },
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: isTest ? 1000 : 15 * 60 * 1000,
  max: isTest ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: getRateLimitStore(),
  keyGenerator: (req) => {
    // For auth endpoints, use client ID + endpoint
    return `auth:${getClientId(req)}:${req.path}`;
  },
  handler: (_req, _res) => {
    throw ApiError.tooMany("Too many login attempts, please try again later.");
  },
});

// Limiter for post/comment creation
export const createLimiter = rateLimit({
  windowMs: isTest ? 1000 : 60 * 60 * 1000,
  max: isTest ? 1000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: getRateLimitStore(),
  keyGenerator: (req) => {
    // Use user ID for authenticated requests
    if ((req as any).user?._id) {
      return `create:${(req as any).user._id.toString()}`;
    }
    return getClientId(req);
  },
  handler: (_req, _res) => {
    throw ApiError.tooMany("Too many requests, please try again later.");
  },
});

/**
 * Create a custom rate limiter with Redis support
 * @param options - Rate limit options
 * @returns Configured rate limiter middleware
 */
export const createCustomLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}) => {
  const prefix = options.keyPrefix || "custom";

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    store: getRateLimitStore(),
    keyGenerator: (req) => {
      if ((req as any).user?._id) {
        return `${prefix}:${(req as any).user._id.toString()}`;
      }
      return `${prefix}:${getClientId(req)}`;
    },
    handler: (_req, _res) => {
      throw ApiError.tooMany(
        options.message || "Too many requests, please try again later.",
      );
    },
  });
};
