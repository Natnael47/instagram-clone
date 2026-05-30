import { body, param, query } from "express-validator";

/**
 * Validation rules for getting user profile
 */
export const getUserProfileValidator = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),
];

/**
 * Validation rules for updating user profile
 */
export const updateProfileValidator = [
  body("fullName")
    .optional()
    .isLength({ max: 50 })
    .withMessage("Full name cannot exceed 50 characters")
    .trim(),

  body("bio")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Bio cannot exceed 160 characters")
    .trim(),

  body("username")
    .optional()
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .trim()
    .toLowerCase(),

  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .trim()
    .toLowerCase(),
];

/**
 * Validation rules for following a user
 */
export const followUserValidator = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),
];

/**
 * Validation rules for unfollowing a user
 */
export const unfollowUserValidator = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),
];

/**
 * Validation rules for searching users
 */
export const searchUsersValidator = [
  query("q")
    .notEmpty()
    .withMessage("Search query is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Search query must be between 1 and 50 characters")
    .trim(),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),
];

/**
 * Validation rules for getting user's followers
 */
export const getFollowersValidator = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),
];

/**
 * Validation rules for getting user's following
 */
export const getFollowingValidator = [
  param("id")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),

  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),
];
