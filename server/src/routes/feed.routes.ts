import { FeedController } from "@controllers/feed.controller";
import { protect } from "@middleware/auth.middleware";
import { activityLogger } from "@middleware/activityLogger.middleware";
import { validate } from "@middleware/validate.middleware";
import { getFeedValidator } from "@validators/post.validator";
import { Router } from "express";

const router = Router();

// All feed routes are protected with activity logging
router.get(
  "/",
  protect,
  validate(getFeedValidator),
  activityLogger({
    action: 'refresh_feed',
    resource: 'post',
    getDetails: (req) => ({
      feedType: 'personalized',
      page: req.query.page || 1,
      limit: req.query.limit || 20
    })
  }),
  FeedController.getPersonalizedFeed,
);

router.get(
  "/global",
  protect,
  validate(getFeedValidator),
  activityLogger({
    action: 'explore_content',
    resource: 'post',
    getDetails: (req) => ({
      feedType: 'global',
      page: req.query.page || 1,
      limit: req.query.limit || 20
    })
  }),
  FeedController.getGlobalFeed,
);

router.get(
  "/trending",
  protect,
  validate(getFeedValidator),
  activityLogger({
    action: 'explore_content',
    resource: 'post',
    getDetails: (req) => ({
      feedType: 'trending',
      page: req.query.page || 1,
      limit: req.query.limit || 20
    })
  }),
  FeedController.getTrendingFeed,
);

router.post(
  "/by-users", 
  protect, 
  activityLogger({
    action: 'explore_content',
    resource: 'user',
    getDetails: (req) => ({
      feedType: 'by-users',
      requestedUserCount: req.body?.userIds?.length || 0
    })
  }),
  FeedController.getFeedByUserIds
);

export default router;