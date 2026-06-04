// src/middleware/activityLogger.middleware.ts
import { env } from "@config/env";
import { ActivityService } from "@services/activity.service";
import { logger } from "@utils/logger";
import type { NextFunction, Request, Response } from "express";
import type { ActivityAction, ResourceType } from "../types/activity.types";

interface ActivityLoggerOptions {
  action: ActivityAction;
  resource: ResourceType;
  getResourceId?: (req: Request) => string | undefined;
  getDetails?: (req: Request, res: Response) => Record<string, any>;
  onlyOnSuccess?: boolean;
  skipInProduction?: boolean;
}

/**
 * Middleware factory for automatic activity logging
 * Captures user actions from HTTP requests
 */
export const activityLogger = (options: ActivityLoggerOptions) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if no user (not authenticated)
    if (!req.user) {
      return next();
    }

    // Listen for response finish to log the activity
    res.on("finish", () => {
      try {
        // Skip if only logging successful responses and this wasn't successful
        if (options.onlyOnSuccess && res.statusCode >= 400) {
          return;
        }

        const userId = req.user!._id.toString();

        // Safely get resource ID
        let resourceId: string | undefined;
        if (options.getResourceId) {
          const id = options.getResourceId(req);
          resourceId = Array.isArray(id) ? id[0] : id;
        } else {
          const paramId = req.params.id;
          resourceId = Array.isArray(paramId) ? paramId[0] : paramId;
        }

        const details = options.getDetails
          ? options.getDetails(req, res)
          : {
              method: req.method,
              path: req.originalUrl,
              statusCode: res.statusCode,
              query: Object.keys(req.query).length > 0 ? req.query : undefined,
            };

        const status = res.statusCode < 400 ? "success" : "failure";

        // Log the activity (non-blocking)
        ActivityService.log({
          user: userId,
          action: options.action,
          resource: options.resource,
          resourceId,
          details,
          status,
          req,
        });

        // Additional debug logging in development
        if (env.NODE_ENV === "development") {
          logger.debug(
            {
              middleware: "activityLogger",
              userId,
              action: options.action,
              resource: options.resource,
              resourceId,
              statusCode: res.statusCode,
            },
            `Activity logged via middleware: ${options.action}`,
          );
        }
      } catch (error) {
        // Never let activity logging break the request
        logger.error(error, "Error in activity logger middleware");
      }
    });

    next();
  };
};

/**
 * Pre-built middleware configurations for common actions
 */
export const ActivityMiddleware = {
  // Auth activities
  login: activityLogger({
    action: "login",
    resource: "user",
    onlyOnSuccess: true,
    getDetails: (req) => ({
      email: req.body?.email?.toLowerCase(),
    }),
  }),

  signup: activityLogger({
    action: "signup",
    resource: "user",
    onlyOnSuccess: true,
    getDetails: (req) => ({
      email: req.body?.email?.toLowerCase(),
      username: req.body?.username,
    }),
  }),

  // Post activities
  createPost: activityLogger({
    action: "create_post",
    resource: "post",
    onlyOnSuccess: true,
    getDetails: (req) => ({
      hasImage: !!req.file,
      captionLength: req.body?.caption?.length,
    }),
  }),

  viewPost: activityLogger({
    action: "view_post",
    resource: "post",
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
  }),

  likePost: activityLogger({
    action: "like_post",
    resource: "post",
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
    onlyOnSuccess: true,
  }),

  // Comment activities
  createComment: activityLogger({
    action: "create_comment",
    resource: "comment",
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
  }),

  // Story activities
  viewStory: activityLogger({
    action: "view_story",
    resource: "story",
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
  }),

  // User activities
  follow: activityLogger({
    action: "follow",
    resource: "user",
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
    onlyOnSuccess: true,
  }),

  unfollow: activityLogger({
    action: "unfollow",
    resource: "user",
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
    onlyOnSuccess: true,
  }),
};
