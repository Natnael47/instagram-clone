import { UserController } from "@controllers/user.controller";
import { activityLogger } from "@middleware/activityLogger.middleware";
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
  activityLogger({
    action: "search",
    resource: "user",
    getDetails: (req) => ({
      searchQuery: req.query.q,
      page: req.query.page || 1,
    }),
  }),
  UserController.searchUsers,
);

router.get("/suggestions", protect, UserController.getSuggestedUsers);

// Protected POST routes with activity logging
router.post(
  "/:id/follow",
  protect,
  validate(followUserValidator),
  activityLogger({
    action: "follow",
    resource: "user",
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
  }),
  UserController.followUser,
);

router.post(
  "/:id/unfollow",
  protect,
  validate(unfollowUserValidator),
  activityLogger({
    action: "unfollow",
    resource: "user",
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
  }),
  UserController.unfollowUser,
);

// Dynamic :id routes
router.get(
  "/:id",
  validate(getUserProfileValidator),
  activityLogger({
    action: "view_profile",
    resource: "user",
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
  }),
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
