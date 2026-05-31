import { FeedController } from "@controllers/feed.controller";
import { protect } from "@middleware/auth.middleware";
import { validate } from "@middleware/validate.middleware";
import { getFeedValidator } from "@validators/post.validator";
import { Router } from "express";

const router = Router();

// All feed routes are protected
router.get(
  "/",
  protect,
  validate(getFeedValidator),
  FeedController.getPersonalizedFeed,
);
router.get(
  "/global",
  protect,
  validate(getFeedValidator),
  FeedController.getGlobalFeed,
);
router.get(
  "/trending",
  protect,
  validate(getFeedValidator),
  FeedController.getTrendingFeed,
);
router.post("/by-users", protect, FeedController.getFeedByUserIds);

export default router;
