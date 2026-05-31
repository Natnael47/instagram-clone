import { Router } from "express";
import { StoryController } from "@controllers/story.controller";
import { protect } from "@middleware/auth.middleware";
import { uploadSingle } from "@middleware/upload.middleware";

const router = Router();

// All story routes are protected
router.post("/", protect, uploadSingle("image"), StoryController.createStory);
router.get("/", protect, StoryController.getFollowedStories);
router.get("/my", protect, StoryController.getMyStories);
router.get("/user/:userId", protect, StoryController.getUserStories);
router.post("/:storyId/view", protect, StoryController.viewStory);
router.delete("/:storyId", protect, StoryController.deleteStory);

export default router;