import type { Request, Response, NextFunction, RequestHandler } from "express";

/**
 * Async handler wrapper to eliminate try-catch blocks in controllers
 * Automatically catches errors and passes them to the error handling middleware
 * 
 * @param fn - Async controller function
 * @returns Wrapped function that catches errors and passes to next()
 * 
 * @example
 * // Instead of:
 * export const getUsers = async (req, res, next) => {
 *   try {
 *     const users = await User.find();
 *     res.json(users);
 *   } catch (error) {
 *     next(error);
 *   }
 * };
 * 
 * // Use:
 * export const getUsers = asyncHandler(async (req, res) => {
 *   const users = await User.find();
 *   res.json(users);
 * });
 */
export const asyncHandler = <T extends RequestHandler = RequestHandler>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): T => {
  return ((req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  }) as T;
};

/**
 * Type-safe async handler for controllers that return data
 * Use this when you want to explicitly return a response
 */
export const asyncHandlerWithReturn = <T = unknown>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Async handler for middleware functions
 * Use this for async middleware that needs to catch errors
 */
export const asyncMiddleware = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};