import { AuthController } from "@controllers/auth.controller";
import { protect } from "@middleware/auth.middleware";
import { activityLogger } from "@middleware/activityLogger.middleware";
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
  activityLogger({
    action: 'signup',
    resource: 'user',
    onlyOnSuccess: true,
    getDetails: (req) => ({
      email: req.body?.email,
      username: req.body?.username
    })
  }),
  AuthController.register,
);

router.post(
  "/login",
  authLimiter,
  validate(loginValidator),
  activityLogger({
    action: 'login',
    resource: 'user',
    getDetails: (req) => ({
      emailOrUsername: req.body?.emailOrUsername
    })
  }),
  AuthController.login,
);

router.post(
  "/forgot-password",
  authLimiter,
  validate(forgotPasswordValidator),
  activityLogger({
    action: 'password_reset',
    resource: 'user',
    getDetails: (req) => ({
      email: req.body?.email
    })
  }),
  AuthController.forgotPassword,
);

router.post(
  "/reset-password",
  authLimiter,
  validate(resetPasswordValidator),
  activityLogger({
    action: 'password_reset',
    resource: 'user',
    onlyOnSuccess: true
  }),
  AuthController.resetPassword,
);

// Protected routes
router.get(
  "/me", 
  protect, 
  activityLogger({
    action: 'view_profile',
    resource: 'user'
  }),
  AuthController.getMe
);

router.put(
  "/change-password",
  protect,
  validate(changePasswordValidator),
  activityLogger({
    action: 'change_password',
    resource: 'user',
    onlyOnSuccess: true
  }),
  AuthController.changePassword,
);

router.put(
  "/profile", 
  protect, 
  activityLogger({
    action: 'update_profile',
    resource: 'user',
    getDetails: (req) => ({
      updatedFields: Object.keys(req.body || {})
    })
  }),
  AuthController.updateProfile
);

router.post(
  "/logout", 
  protect, 
  activityLogger({
    action: 'logout',
    resource: 'user'
  }),
  AuthController.logout
);

// Profile picture upload
router.post(
  "/profile-picture",
  protect,
  uploadSingle("profilePicture"),
  activityLogger({
    action: 'update_avatar',
    resource: 'user',
    onlyOnSuccess: true
  }),
  AuthController.updateProfile,
);

router.post(
  "/refresh", 
  activityLogger({
    action: 'refresh_token',
    resource: 'user',
    onlyOnSuccess: true
  }),
  AuthController.refreshToken
);

export default router;