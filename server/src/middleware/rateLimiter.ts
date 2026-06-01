import { env } from "@config/env";
import { ApiError } from "@utils/ApiError";
import rateLimit from "express-rate-limit";

// Check if we're in test mode
const isTest = env.NODE_ENV === "test";

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: isTest ? 1000 : 15 * 60 * 1000, // 1 second in test, 15 minutes in prod
  max: isTest ? 1000 : 100, // 1000 in test, 100 in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw ApiError.tooMany("Too many requests, please try again later.");
  },
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: isTest ? 1000 : 15 * 60 * 1000, // 1 second in test, 15 minutes in prod
  max: isTest ? 1000 : 10, // 1000 in test, 10 in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw ApiError.tooMany("Too many login attempts, please try again later.");
  },
});

// Limiter for post/comment creation
export const createLimiter = rateLimit({
  windowMs: isTest ? 1000 : 60 * 60 * 1000, // 1 second in test, 1 hour in prod
  max: isTest ? 1000 : 30, // 1000 in test, 30 in prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res) => {
    throw ApiError.tooMany("Too many requests, please try again later.");
  },
});
