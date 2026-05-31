import { Router } from "express";
import { CommentController } from "@controllers/comment.controller";
import { protect } from "@middleware/auth.middleware";
import { validate } from "@middleware/validate.middleware";

const router = Router();

// Comment routes
router.post("/:postId", protect, CommentController.addComment);
router.get("/:postId", protect, CommentController.getPostComments);
router.put("/:commentId", protect, CommentController.updateComment);
router.delete("/:commentId", protect, CommentController.deleteComment);
router.post("/:commentId/like", protect, CommentController.likeComment);
router.post("/:commentId/unlike", protect, CommentController.unlikeComment);

export default router;