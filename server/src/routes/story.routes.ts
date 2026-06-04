import { Router } from "express";
import { StoryController } from "@controllers/story.controller";
import { protect } from "@middleware/auth.middleware";
import { activityLogger } from "@middleware/activityLogger.middleware";
import { uploadSingle } from "@middleware/upload.middleware";

const router = Router();

// All story routes are protected with activity logging
router.post(
  "/", 
  protect, 
  uploadSingle("image"), 
  activityLogger({
    action: 'create_story',
    resource: 'story',
    onlyOnSuccess: true,
    getDetails: (req) => ({
      hasImage: !!req.file
    })
  }),
  StoryController.createStory
);

router.get(
  "/", 
  protect, 
  StoryController.getFollowedStories
);

router.get(
  "/my", 
  protect, 
  StoryController.getMyStories
);

router.get(
  "/user/:userId", 
  protect, 
  StoryController.getUserStories
);

router.post(
  "/:storyId/view", 
  protect, 
  activityLogger({
    action: 'view_story',
    resource: 'story',
    getResourceId: (req) => {
      const id = req.params.storyId;
      return Array.isArray(id) ? id[0] : id;
    }
  }),
  StoryController.viewStory
);

router.delete(
  "/:storyId", 
  protect, 
  activityLogger({
    action: 'delete_story',
    resource: 'story',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.storyId;
      return Array.isArray(id) ? id[0] : id;
    }
  }),
  StoryController.deleteStory
);

export default router;