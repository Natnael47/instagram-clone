import { Router } from "express";
import { PostController } from "@controllers/post.controller";
import { protect } from "@middleware/auth.middleware";
import { validate } from "@middleware/validate.middleware";
import { uploadSingle } from "@middleware/upload.middleware";
import {
  createPostValidator,
  getPostValidator,
  deletePostValidator,
  likePostValidator,
  addCommentValidator,
  deleteCommentValidator,
  getFeedValidator,
} from "@validators/post.validator";

const router = Router();

// Protected routes
router.post("/", protect, uploadSingle("image"), validate(createPostValidator), PostController.createPost);
router.get("/feed", protect, validate(getFeedValidator), PostController.getPersonalizedFeed);
router.get("/:id", protect, validate(getPostValidator), PostController.getPost);
router.delete("/:id", protect, validate(deletePostValidator), PostController.deletePost);
router.post("/:id/like", protect, validate(likePostValidator), PostController.likePost);
router.post("/:id/unlike", protect, validate(likePostValidator), PostController.unlikePost);
router.put("/:id/caption", protect, validate(deletePostValidator), PostController.updatePostCaption);

// Comments
router.post("/:postId/comments", protect, validate(addCommentValidator), PostController.addComment);
router.delete("/:postId/comments/:commentId", protect, validate(deleteCommentValidator), PostController.deleteComment);

// User posts
router.get("/user/:userId", protect, PostController.getUserPosts);

export default router;