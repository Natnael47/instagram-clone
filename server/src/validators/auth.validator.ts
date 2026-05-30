import { body } from "express-validator";

/**
 * Validation rules for user registration
 */
export const registerValidator = [
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 30 })
    .withMessage("Username must be between 3 and 30 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .trim()
    .toLowerCase(),

  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .trim()
    .toLowerCase(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),

  body("fullName")
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ max: 50 })
    .withMessage("Full name cannot exceed 50 characters")
    .trim(),

  body("bio")
    .optional()
    .isLength({ max: 160 })
    .withMessage("Bio cannot exceed 160 characters")
    .trim(),
];

/**
 * Validation rules for user login
 */
export const loginValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email or username is required")
    .trim()
    .toLowerCase(),

  body("password").notEmpty().withMessage("Password is required"),
];

/**
 * Validation rules for forgot password
 */
export const forgotPasswordValidator = [
  body("email")
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail()
    .trim()
    .toLowerCase(),
];

/**
 * Validation rules for reset password
 */
export const resetPasswordValidator = [
  body("token").notEmpty().withMessage("Reset token is required"),

  body("password")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Please confirm your password")
    .custom((value, { req }) => value === req.body.password)
    .withMessage("Passwords do not match"),
];

/**
 * Validation rules for change password (authenticated)
 */
export const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long")
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage("Password must contain at least one letter and one number"),

  body("confirmNewPassword")
    .notEmpty()
    .withMessage("Please confirm your new password")
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage("Passwords do not match"),
];
