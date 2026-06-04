import { User, type UserDocument } from "@models/User";
import { ApiError } from "@utils/ApiError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} from "@utils/generateToken";
import { logger } from "@utils/logger";
import { ActivityService } from "./activity.service";

/**
 * Authentication Service
 * Handles user registration, login, and password management
 */
export class AuthService {
  static async register(userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    bio?: string;
  }): Promise<{
    user: Partial<UserDocument>;
    accessToken: string;
    refreshToken: string;
  }> {
    const existingUser = await User.findOne({
      $or: [{ email: userData.email }, { username: userData.username }],
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw ApiError.conflict("Email already registered");
      }
      if (existingUser.username === userData.username) {
        throw ApiError.conflict("Username already taken");
      }
    }

    const user = await User.create({
      username: userData.username,
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      bio: userData.bio || "",
      profilePicture: "",
      followers: [],
      following: [],
      posts: [],
      stories: [],
    });

    logger.info({ userId: user._id, email: user.email }, "New user registered");

    // Log signup activity
    ActivityService.log({
      user: user._id.toString(),
      action: "signup",
      resource: "user",
      resourceId: user._id.toString(),
      details: {
        username: userData.username,
        email: userData.email,
        fullName: userData.fullName,
      },
    }).catch((err) => logger.error({ err }, "Failed to log signup activity"));

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    const userWithoutPassword = user.toObject();
    const { password, ...userWithoutPass } = userWithoutPassword;

    return { user: userWithoutPass, accessToken, refreshToken };
  }

  static async login(
    emailOrUsername: string,
    password: string,
  ): Promise<{
    user: Partial<UserDocument>;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select("+password");

    if (!user) {
      // Log failed login attempt
      ActivityService.log({
        user: "unknown",
        action: "login",
        resource: "user",
        status: "failure",
        details: {
          reason: "user_not_found",
          emailOrUsername,
        },
      }).catch((err) => logger.error({ err }, "Failed to log login activity"));

      throw ApiError.unauthorized("Invalid credentials");
    }

    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      // Log failed login attempt
      ActivityService.log({
        user: user._id.toString(),
        action: "login",
        resource: "user",
        status: "failure",
        details: {
          reason: "invalid_password",
          emailOrUsername,
        },
      }).catch((err) => logger.error({ err }, "Failed to log login activity"));

      throw ApiError.unauthorized("Invalid credentials");
    }

    const accessToken = generateAccessToken(user._id.toString());
    const refreshToken = generateRefreshToken(user._id.toString());

    logger.info({ userId: user._id, email: user.email }, "User logged in");

    // Log successful login
    ActivityService.log({
      user: user._id.toString(),
      action: "login",
      resource: "user",
      status: "success",
      details: {
        method: "password",
      },
    }).catch((err) => logger.error({ err }, "Failed to log login activity"));

    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  static async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    const decoded = verifyToken(refreshToken);

    if (!decoded || decoded.type !== "refresh") {
      throw ApiError.unauthorized("Invalid refresh token");
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized("User not found");
    }

    const accessToken = generateAccessToken(user._id.toString());

    logger.info({ userId: user._id }, "Access token refreshed");

    // Log token refresh
    ActivityService.log({
      user: user._id.toString(),
      action: "refresh_token",
      resource: "user",
    }).catch((err) =>
      logger.error({ err }, "Failed to log refresh token activity"),
    );

    return { accessToken };
  }

  /**
   * Get current user profile
   * @param userId - User ID
   * @returns User object
   */
  static async getCurrentUser(userId: string): Promise<Partial<UserDocument>> {
    const user = await User.findById(userId)
      .select("-password")
      .populate("followers", "username fullName profilePicture")
      .populate("following", "username fullName profilePicture");

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    return user;
  }

  /**
   * Change user password
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await User.findById(userId).select("+password");
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Verify current password
    const isPasswordMatch = await user.matchPassword(currentPassword);
    if (!isPasswordMatch) {
      // Log failed password change
      ActivityService.log({
        user: userId,
        action: "change_password",
        resource: "user",
        status: "failure",
        details: { reason: "incorrect_current_password" },
      }).catch((err) =>
        logger.error({ err }, "Failed to log password change activity"),
      );

      throw ApiError.badRequest("Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info({ userId }, "User changed password");

    // Log successful password change
    ActivityService.log({
      user: userId,
      action: "change_password",
      resource: "user",
      status: "success",
    }).catch((err) =>
      logger.error({ err }, "Failed to log password change activity"),
    );
  }

  /**
   * Forgot password - Generate reset token
   * @param email - User email
   * @returns Reset token (in production, this would be emailed)
   */
  static async forgotPassword(email: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that user doesn't exist for security
      logger.info({ email }, "Password reset requested for non-existent email");

      // Log failed password reset attempt
      ActivityService.log({
        user: "unknown",
        action: "password_reset",
        resource: "user",
        status: "failure",
        details: { reason: "email_not_found", email },
      }).catch((err) =>
        logger.error({ err }, "Failed to log password reset activity"),
      );

      return "If an account exists, a reset link will be sent";
    }

    // Generate reset token (using JWT)
    const resetToken = generateAccessToken(user._id.toString());

    logger.info({ userId: user._id, email }, "Password reset token generated");

    // Log password reset request
    ActivityService.log({
      user: user._id.toString(),
      action: "password_reset",
      resource: "user",
      status: "success",
      details: { method: "email" },
    }).catch((err) =>
      logger.error({ err }, "Failed to log password reset activity"),
    );

    // In production, send email with reset link
    // For now, return token (in real app, this would be emailed)
    return resetToken;
  }

  /**
   * Reset password using token
   * @param token - Reset token
   * @param newPassword - New password
   */
  static async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const decoded = verifyToken(token);

    if (!decoded || !decoded.id) {
      throw ApiError.badRequest("Invalid or expired reset token");
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info({ userId: user._id }, "User reset password");

    // Log successful password reset
    ActivityService.log({
      user: user._id.toString(),
      action: "password_reset",
      resource: "user",
      status: "success",
      details: { method: "token" },
    }).catch((err) =>
      logger.error({ err }, "Failed to log password reset activity"),
    );
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param updateData - Data to update
   * @returns Updated user
   */
  static async updateProfile(
    userId: string,
    updateData: {
      fullName?: string;
      bio?: string;
      username?: string;
      email?: string;
      profilePicture?: string;
    },
  ): Promise<Partial<UserDocument>> {
    // Check if username or email is taken
    if (updateData.username) {
      const existingUser = await User.findOne({
        username: updateData.username,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw ApiError.conflict("Username already taken");
      }
    }

    if (updateData.email) {
      const existingUser = await User.findOne({
        email: updateData.email,
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw ApiError.conflict("Email already registered");
      }
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true },
    ).select("-password");

    if (!user) {
      throw ApiError.notFound("User not found");
    }

    logger.info({ userId }, "User profile updated");

    // Log profile update
    ActivityService.log({
      user: userId,
      action: "update_profile",
      resource: "user",
      resourceId: userId,
      details: {
        updatedFields: Object.keys(updateData),
        hasProfilePicture: !!updateData.profilePicture,
      },
    }).catch((err) =>
      logger.error({ err }, "Failed to log profile update activity"),
    );

    return user;
  }
}
