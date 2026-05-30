import { body, param, query } from "express-validator";

/**
 * Validation rules for creating a post
 */
export const createPostValidator = [
  body("caption")
    .optional()
    .isLength({ max: 2200 })
    .withMessage("Caption cannot exceed 2200 characters")
    .trim(),

  // Note: File validation is handled by upload middleware
];

/**
 * Validation rules for updating a post
 */
export const updatePostValidator = [
  param("id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid post ID format"),

  body("caption")
    .optional()
    .isLength({ max: 2200 })
    .withMessage("Caption cannot exceed 2200 characters")
    .trim(),
];

/**
 * Validation rules for getting a single post
 */
export const getPostValidator = [
  param("id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid post ID format"),
];

/**
 * Validation rules for deleting a post
 */
export const deletePostValidator = [
  param("id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid post ID format"),
];

/**
 * Validation rules for liking/unliking a post
 */
export const likePostValidator = [
  param("id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid post ID format"),
];

/**
 * Validation rules for adding a comment
 */
export const addCommentValidator = [
  param("postId")
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid post ID format"),

  body("text")
    .notEmpty()
    .withMessage("Comment text is required")
    .isLength({ min: 1, max: 500 })
    .withMessage("Comment must be between 1 and 500 characters")
    .trim(),
];

/**
 * Validation rules for deleting a comment
 */
export const deleteCommentValidator = [
  param("postId")
    .notEmpty()
    .withMessage("Post ID is required")
    .isMongoId()
    .withMessage("Invalid post ID format"),

  param("commentId")
    .notEmpty()
    .withMessage("Comment ID is required")
    .isMongoId()
    .withMessage("Invalid comment ID format"),
];

/**
 * Validation rules for getting posts feed
 */
export const getFeedValidator = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),
];
