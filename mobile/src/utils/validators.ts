import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email or username is required")
    .trim()
    .toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .trim()
    .toLowerCase(),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please provide a valid email address")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .regex(
      /^(?=.*[A-Za-z])(?=.*\d)/,
      "Password must contain at least one letter and one number",
    ),
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(50, "Full name cannot exceed 50 characters")
    .trim(),
  bio: z
    .string()
    .max(160, "Bio cannot exceed 160 characters")
    .optional()
    .default(""),
});

export const createPostSchema = z.object({
  caption: z
    .string()
    .max(2200, "Caption cannot exceed 2200 characters")
    .optional()
    .default(""),
});

export const addCommentSchema = z.object({
  text: z
    .string()
    .min(1, "Comment text is required")
    .max(500, "Comment cannot exceed 500 characters"),
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(1, "Full name is required")
    .max(50, "Full name cannot exceed 50 characters")
    .optional(),
  bio: z.string().max(160, "Bio cannot exceed 160 characters").optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username cannot exceed 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
export type CreatePostFormData = z.infer<typeof createPostSchema>;
export type AddCommentFormData = z.infer<typeof addCommentSchema>;
export type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;