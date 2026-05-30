import { asyncHandler } from "@middleware/asyncHandler";
import { protect } from "@middleware/auth.middleware";
import { validate } from "@middleware/validate.middleware";
import { ApiResponse } from "@utils/ApiResponse";
import {
  changePasswordValidator,
  forgotPasswordValidator,
  loginValidator,
  registerValidator,
  resetPasswordValidator,
} from "@validators/auth.validator";
import { Router, type Request, type Response } from "express";

const router = Router();

// Placeholder controller functions (will be replaced in Phase 6)
const register = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Register endpoint - Controller coming soon", {
      message:
        "This is a placeholder. Controller will be implemented in Phase 6",
      receivedData: req.body,
    }),
  );
});

const login = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Login endpoint - Controller coming soon", {
      message:
        "This is a placeholder. Controller will be implemented in Phase 6",
      receivedData: req.body,
    }),
  );
});

const getMe = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Get current user endpoint - Controller coming soon", {
      user: req.user,
      message:
        "This is a placeholder. Controller will be implemented in Phase 6",
    }),
  );
});

const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Forgot password endpoint - Controller coming soon", {
      message:
        "This is a placeholder. Controller will be implemented in Phase 6",
      email: req.body.email,
    }),
  );
});

const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Reset password endpoint - Controller coming soon", {
      message:
        "This is a placeholder. Controller will be implemented in Phase 6",
    }),
  );
});

const changePassword = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Change password endpoint - Controller coming soon", {
      message:
        "This is a placeholder. Controller will be implemented in Phase 6",
    }),
  );
});

const logout = asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json(
    ApiResponse.success("Logout successful", {
      message:
        "This is a placeholder. Controller will be implemented in Phase 6",
    }),
  );
});

// Routes
router.post("/register", validate(registerValidator), register);
router.post("/login", validate(loginValidator), login);
router.get("/me", protect, getMe);
router.post(
  "/forgot-password",
  validate(forgotPasswordValidator),
  forgotPassword,
);
router.post("/reset-password", validate(resetPasswordValidator), resetPassword);
router.put(
  "/change-password",
  protect,
  validate(changePasswordValidator),
  changePassword,
);
router.post("/logout", protect, logout);

export default router;
