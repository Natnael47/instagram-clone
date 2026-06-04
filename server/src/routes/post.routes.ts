import { Router } from "express";
import { PostController } from "@controllers/post.controller";
import { protect } from "@middleware/auth.middleware";
import { activityLogger } from "@middleware/activityLogger.middleware";
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

// Protected routes with activity logging
router.post(
  "/", 
  protect, 
  uploadSingle("image"), 
  validate(createPostValidator), 
  activityLogger({
    action: 'create_post',
    resource: 'post',
    onlyOnSuccess: true,
    getDetails: (req) => ({
      hasImage: !!req.file,
      captionLength: req.body?.caption?.length || 0
    })
  }),
  PostController.createPost
);

router.get(
  "/feed", 
  protect, 
  validate(getFeedValidator), 
  activityLogger({
    action: 'refresh_feed',
    resource: 'post',
    getDetails: (req) => ({
      feedType: 'personalized',
      page: req.query.page || 1
    })
  }),
  PostController.getPersonalizedFeed
);

router.get(
  "/:id", 
  protect, 
  validate(getPostValidator), 
  activityLogger({
    action: 'view_post',
    resource: 'post',
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    }
  }),
  PostController.getPost
);

router.delete(
  "/:id", 
  protect, 
  validate(deletePostValidator), 
  activityLogger({
    action: 'delete_post',
    resource: 'post',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    }
  }),
  PostController.deletePost
);

router.post(
  "/:id/like", 
  protect, 
  validate(likePostValidator), 
  activityLogger({
    action: 'like_post',
    resource: 'post',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    }
  }),
  PostController.likePost
);

router.post(
  "/:id/unlike", 
  protect, 
  validate(likePostValidator), 
  activityLogger({
    action: 'unlike_post',
    resource: 'post',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    }
  }),
  PostController.unlikePost
);

router.put(
  "/:id/caption", 
  protect, 
  validate(deletePostValidator), 
  activityLogger({
    action: 'update_post',
    resource: 'post',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.id;
      return Array.isArray(id) ? id[0] : id;
    },
    getDetails: (req) => ({
      updatedField: 'caption',
      newCaptionLength: req.body?.caption?.length || 0
    })
  }),
  PostController.updatePostCaption
);

// Comments
router.post(
  "/:postId/comments", 
  protect, 
  validate(addCommentValidator), 
  activityLogger({
    action: 'create_comment',
    resource: 'post',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.postId;
      return Array.isArray(id) ? id[0] : id;
    },
    getDetails: (req) => ({
      textLength: req.body?.text?.length || 0
    })
  }),
  PostController.addComment
);

router.delete(
  "/:postId/comments/:commentId", 
  protect, 
  validate(deleteCommentValidator), 
  activityLogger({
    action: 'delete_comment',
    resource: 'post',
    onlyOnSuccess: true,
    getResourceId: (req) => {
      const id = req.params.postId;
      return Array.isArray(id) ? id[0] : id;
    },
    getDetails: (req) => ({
      commentId: req.params.commentId
    })
  }),
  PostController.deleteComment
);

// User posts
router.get(
  "/user/:userId", 
  protect, 
  PostController.getUserPosts
);

export default router;