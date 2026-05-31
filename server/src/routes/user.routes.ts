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

// Static routes (must be before dynamic :id routes)
router.get(
  "/search",
  validate(searchUsersValidator),
  UserController.searchUsers,
);
router.get("/suggestions", protect, UserController.getSuggestedUsers);

// Protected POST routes
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

// Dynamic :id routes
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

export default router;
