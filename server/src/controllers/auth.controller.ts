import { asyncHandler } from "@middleware/asyncHandler";
import { AuthService } from "@services/auth.service";
import { ApiError } from "@utils/ApiError";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

/**
 * Auth Controller
 * Handles authentication-related HTTP requests
 */
export class AuthController {
  /**
   * Register a new user
   * POST /api/v1/auth/register
   */
  static register = asyncHandler(async (req: Request, res: Response) => {
    const { username, email, password, fullName, bio } = req.body;

    const { user, accessToken, refreshToken } = await AuthService.register({
      username,
      email,
      password,
      fullName,
      bio,
    });

    logger.info({ userId: user._id, email }, "User registered successfully");

    res.status(201).json(
      ApiResponse.success("User registered successfully", {
        user,
        accessToken,
        refreshToken,
      }),
    );
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await AuthService.login(email, password);

    logger.info(
      { userId: user._id, email: user.email },
      "User logged in successfully",
    );

    res.status(200).json(
      ApiResponse.success("Login successful", {
        user,
        accessToken,
        refreshToken,
      }),
    );
  });

  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  static getMe = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const user = await AuthService.getCurrentUser(userId);

    res
      .status(200)
      .json(
        ApiResponse.success("Current user retrieved successfully", { user }),
      );
  });

  /**
   * Forgot password - send reset token
   * POST /api/v1/auth/forgot-password
   */
  static forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    const resetToken = await AuthService.forgotPassword(email);

    // In production, this token would be emailed
    // For now, return it in response (remove in production)
    res.status(200).json(
      ApiResponse.success("Password reset token generated", {
        message: "If an account exists, a reset link will be sent",
        ...(process.env.NODE_ENV === "development" && { resetToken }),
      }),
    );
  });

  /**
   * Reset password using token
   * POST /api/v1/auth/reset-password
   */
  static resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    await AuthService.resetPassword(token, password);

    logger.info({ token }, "Password reset successfully");

    res.status(200).json(ApiResponse.success("Password reset successfully"));
  });

  /**
   * Change password (authenticated)
   * PUT /api/v1/auth/change-password
   */
  static changePassword = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { currentPassword, newPassword } = req.body;

    await AuthService.changePassword(userId, currentPassword, newPassword);

    logger.info({ userId }, "Password changed successfully");

    res.status(200).json(ApiResponse.success("Password changed successfully"));
  });

  /**
   * Update profile
   * PUT /api/v1/auth/profile
   */
  static updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { fullName, bio, username, email, profilePicture } = req.body;

    const user = await AuthService.updateProfile(userId, {
      fullName,
      bio,
      username,
      email,
      profilePicture,
    });

    logger.info({ userId }, "Profile updated successfully");

    res
      .status(200)
      .json(ApiResponse.success("Profile updated successfully", { user }));
  });

  /**
 * Logout user
 * POST /api/v1/auth/logout
 */
static logout = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?._id?.toString();
  
  if (userId) {
    // Extract token from header for blacklisting
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") 
      ? authHeader.split(" ")[1] 
      : null;

    if (token) {
      await AuthService.logout(userId, token);
    } else {
      logger.warn({ userId }, "Logout called without token");
    }
  }

  logger.info({ userId }, "User logged out");
  res.status(200).json(ApiResponse.success("Logout successful"));
});

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw ApiError.badRequest("Refresh token is required");
    }

    const result = await AuthService.refreshAccessToken(refreshToken);

    res
      .status(200)
      .json(ApiResponse.success("Token refreshed successfully", result));
  });
}
