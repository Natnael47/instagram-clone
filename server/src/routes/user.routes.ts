import { UserController } from "@controllers/user.controller";
import { protect } from "@middleware/auth.middleware";
import { validate } from "@middleware/validate.middleware";
import {
  followUserValidator,
  getFollowersValidator,
  getFollowingValidator,
  getUserProfileValidator,
  searchUsersValidator,
  unfollowUserValidator,
} from "@validators/user.validator";
import { Router } from "express";

const router = Router();

// Public routes
router.get(
  "/search",
  validate(searchUsersValidator),
  UserController.searchUsers,
);
router.get(
  "/:id",
  validate(getUserProfileValidator),
  UserController.getUserProfile,
);
router.get(
  "/:id/followers",
  validate(getFollowersValidator),
  UserController.getFollowers,
);
router.get(
  "/:id/following",
  validate(getFollowingValidator),
  UserController.getFollowing,
);

// Protected routes
router.post(
  "/:id/follow",
  protect,
  validate(followUserValidator),
  UserController.followUser,
);
router.post(
  "/:id/unfollow",
  protect,
  validate(unfollowUserValidator),
  UserController.unfollowUser,
);
router.get("/suggestions", protect, UserController.getSuggestedUsers);

export default router;
