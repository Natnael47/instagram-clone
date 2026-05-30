import { User, type UserDocument } from "@models/User";
import { ApiError } from "@utils/ApiError";
import { generateToken, verifyToken } from "@utils/generateToken";
import { logger } from "@utils/logger";

/**
 * Authentication Service
 * Handles user registration, login, and password management
 */
export class AuthService {
  /**
   * Register a new user
   * @param userData - User registration data
   * @returns Created user object (without password) and JWT token
   */
  static async register(userData: {
    username: string;
    email: string;
    password: string;
    fullName: string;
    bio?: string;
  }): Promise<{ user: Partial<UserDocument>; token: string }> {
    // Check if user already exists
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

    // Create user
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

    // Generate token
    const token = generateToken(user._id.toString());

    // Return user without password
    const userWithoutPassword = user.toObject();
    // Use type assertion to safely delete password
    const { password, ...userWithoutPass } = userWithoutPassword;

    return { user: userWithoutPass, token };
  }

  /**
   * Login user
   * @param emailOrUsername - Email or username
   * @param password - User password
   * @returns User object and JWT token
   */
  static async login(
    emailOrUsername: string,
    password: string,
  ): Promise<{ user: Partial<UserDocument>; token: string }> {
    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    }).select("+password");

    if (!user) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    // Check password
    const isPasswordMatch = await user.matchPassword(password);
    if (!isPasswordMatch) {
      throw ApiError.unauthorized("Invalid credentials");
    }

    // Generate token
    const token = generateToken(user._id.toString());

    logger.info({ userId: user._id, email: user.email }, "User logged in");

    // Return user without password
    const userObject = user.toObject();
    const { password: _, ...userWithoutPassword } = userObject;

    return { user: userWithoutPassword, token };
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
      throw ApiError.badRequest("Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save();

    logger.info({ userId }, "User changed password");
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
      return "If an account exists, a reset link will be sent";
    }

    // Generate reset token (using JWT)
    const resetToken = generateToken(user._id.toString());

    logger.info({ userId: user._id, email }, "Password reset token generated");

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

    return user;
  }
}
