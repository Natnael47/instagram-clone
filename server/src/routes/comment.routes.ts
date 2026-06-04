import { CommentController } from "@controllers/comment.controller";
import { activityLogger } from "@middleware/activityLogger.middleware";
import { protect } from "@middleware/auth.middleware";
import { Router } from "express";

const router = Router();

// Comment routes with activity logging
router.post(
  "/:postId",
  protect,
  activityLogger({
    action: "create_comment",
    resource: "comment",
    onlyOnSuccess: true,
    getDetails: (req) => ({
      postId: req.params.postId,
      isReply: !!req.body?.parentCommentId,
      textLength: req.body?.text?.length,
    }),
  }),
  CommentController.addComment,
);

router.get("/:postId", protect, CommentController.getPostComments);

router.put(
  "/:commentId",
  protect,
  activityLogger({
    action: "create_comment",
    resource: "comment",
    onlyOnSuccess: true,
    getDetails: (req) => ({
      operation: "update",
      textLength: req.body?.text?.length,
    }),
    getResourceId: (req) => {
      const id = req.params.commentId;
      return Array.isArray(id) ? id[0] : id;
    },
  }),
  CommentController.updateComment,
);

router.delete(
  "/:commentId",
  protect,
  activityLogger({
    action: "delete_comment",
    resource: "comment",
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.commentId;
      return Array.isArray(id) ? id[0] : id;
    },
  }),
  CommentController.deleteComment,
);

router.post(
  "/:commentId/like",
  protect,
  activityLogger({
    action: "like_comment",
    resource: "comment",
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.commentId;
      return Array.isArray(id) ? id[0] : id;
    },
  }),
  CommentController.likeComment,
);

router.post(
  "/:commentId/unlike",
  protect,
  activityLogger({
    action: "unlike_comment",
    resource: "comment",
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.commentId;
      return Array.isArray(id) ? id[0] : id;
    },
  }),
  CommentController.unlikeComment,
);

export default router;
