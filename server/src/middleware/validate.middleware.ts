import { ApiError } from "@utils/ApiError";
import type { NextFunction, Request, Response } from "express";
import { validationResult, type ValidationChain } from "express-validator";

/**
 * Validation middleware
 * Checks for validation errors from express-validator and throws formatted error
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // Format validation errors
    const formattedErrors: Record<string, string[]> = {};
    errors.array().forEach((error) => {
      if (error.type === "field") {
        const field = error.path;
        if (!formattedErrors[field]) {
          formattedErrors[field] = [];
        }
        formattedErrors[field].push(error.msg);
      }
    });

    throw ApiError.badRequest("Validation failed", formattedErrors);
  };
};

/**
 * Validate request params middleware
 * Checks if required params are present
 */
export const validateParams = (requiredParams: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const missingParams: string[] = [];

    for (const param of requiredParams) {
      if (!req.params[param]) {
        missingParams.push(param);
      }
    }

    if (missingParams.length > 0) {
      throw ApiError.badRequest(
        `Missing required parameters: ${missingParams.join(", ")}`,
      );
    }

    next();
  };
};

/**
 * Validate request query middleware
 * Checks if required query parameters are present
 */
export const validateQuery = (requiredQueries: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const missingQueries: string[] = [];

    for (const query of requiredQueries) {
      if (!req.query[query]) {
        missingQueries.push(query);
      }
    }

    if (missingQueries.length > 0) {
      throw ApiError.badRequest(
        `Missing required query parameters: ${missingQueries.join(", ")}`,
      );
    }

    next();
  };
};

/**
 * Validate request body middleware
 * Checks if required fields are present in body
 */
export const validateBody = (requiredFields: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const missingFields: string[] = [];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw ApiError.badRequest(
        `Missing required fields: ${missingFields.join(", ")}`,
      );
    }

    next();
  };
};

/**
 * Sanitize request body middleware
 * Removes specified fields from request body
 */
export const sanitizeBody = (fieldsToRemove: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const field of fieldsToRemove) {
      delete req.body[field];
    }
    next();
  };
};
