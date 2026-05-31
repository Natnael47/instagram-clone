import { AuthController } from "@controllers/auth.controller";
import { protect } from "@middleware/auth.middleware";
import { authLimiter } from "@middleware/rateLimiter";
import { uploadSingle } from "@middleware/upload.middleware";
import { validate } from "@middleware/validate.middleware";
import {
  changePasswordValidator,
  forgotPasswordValidator,
  loginValidator,
  registerValidator,
  resetPasswordValidator,
} from "@validators/auth.validator";
import { Router } from "express";

const router = Router();

// Public routes with strict rate limiting
router.post(
  "/register",
  authLimiter,
  validate(registerValidator),
  AuthController.register,
);
router.post(
  "/login",
  authLimiter,
  validate(loginValidator),
  AuthController.login,
);
router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordValidator),
  AuthController.forgotPassword,
);
router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordValidator),
  AuthController.resetPassword,
);

// Protected routes
router.get("/me", protect, AuthController.getMe);
router.put(
  "/change-password",
  protect,
  validate(changePasswordValidator),
  AuthController.changePassword,
);
router.put("/profile", protect, AuthController.updateProfile);
router.post("/logout", protect, AuthController.logout);

// Profile picture upload
router.post(
  "/profile-picture",
  protect,
  uploadSingle("profilePicture"),
  AuthController.updateProfile,
);
router.post("/refresh", AuthController.refreshToken);

export default router;
