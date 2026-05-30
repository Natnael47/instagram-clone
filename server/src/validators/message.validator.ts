import { body, param, query } from "express-validator";

/**
 * Validation rules for sending a message
 */
export const sendMessageValidator = [
  param("conversationId")
    .optional()
    .isMongoId()
    .withMessage("Invalid conversation ID format"),

  param("userId").optional().isMongoId().withMessage("Invalid user ID format"),

  body("text")
    .notEmpty()
    .withMessage("Message text is required")
    .isLength({ min: 1, max: 2000 })
    .withMessage("Message must be between 1 and 2000 characters")
    .trim(),
];

/**
 * Validation rules for getting conversation messages
 */
export const getMessagesValidator = [
  param("conversationId")
    .notEmpty()
    .withMessage("Conversation ID is required")
    .isMongoId()
    .withMessage("Invalid conversation ID format"),

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

/**
 * Validation rules for marking message as read
 */
export const markMessageReadValidator = [
  param("messageId")
    .notEmpty()
    .withMessage("Message ID is required")
    .isMongoId()
    .withMessage("Invalid message ID format"),
];

/**
 * Validation rules for deleting a message
 */
export const deleteMessageValidator = [
  param("messageId")
    .notEmpty()
    .withMessage("Message ID is required")
    .isMongoId()
    .withMessage("Invalid message ID format"),
];

/**
 * Validation rules for getting user conversations
 */
export const getConversationsValidator = [
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
 * Validation rules for starting a new conversation
 */
export const startConversationValidator = [
  body("userId")
    .notEmpty()
    .withMessage("User ID is required")
    .isMongoId()
    .withMessage("Invalid user ID format"),

  body("initialMessage")
    .optional()
    .isLength({ min: 1, max: 2000 })
    .withMessage("Initial message must be between 1 and 2000 characters")
    .trim(),
];
