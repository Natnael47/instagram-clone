import { asyncHandler } from "@middleware/asyncHandler";
import { PostService } from "@services/post.service";
import { UploadService } from "@services/upload.service";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

export class PostController {
  /**
   * Create a new post
   * POST /api/v1/posts
   */
  static createPost = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const { caption } = req.body;
    const file = req.file;

    if (!file) {
      throw new Error("Image file is required");
    }

    const imageUrl = await UploadService.uploadImage(file, "posts");

    const post = await PostService.createPost(userId, imageUrl, caption);

    logger.info({ postId: post._id, userId }, "New post created");

    res
      .status(201)
      .json(ApiResponse.success("Post created successfully", { post }));
  });

  /**
   * Get a single post by ID
   * GET /api/v1/posts/:id
   */
  static getPost = asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const userId = req.user?._id.toString();

    const post = await PostService.getPostById(id, userId);

    logger.info({ postId: id, userId }, "Post retrieved");

    res
      .status(200)
      .json(ApiResponse.success("Post retrieved successfully", { post }));
  });

  /**
   * Delete a post
   * DELETE /api/v1/posts/:id
   */
  static deletePost = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const id = req.params.id as string;

    await PostService.deletePost(id, userId);

    logger.info({ postId: id, userId }, "Post deleted");

    res.status(200).json(ApiResponse.success("Post deleted successfully"));
  });

  /**
   * Like a post
   * POST /api/v1/posts/:id/like
   */
  static likePost = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const id = req.params.id as string;

    await PostService.likePost(id, userId);

    logger.info({ postId: id, userId }, "Post liked");

    res.status(200).json(ApiResponse.success("Post liked successfully"));
  });

  /**
   * Unlike a post
   * POST /api/v1/posts/:id/unlike
   */
  static unlikePost = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const id = req.params.id as string;

    await PostService.unlikePost(id, userId);

    logger.info({ postId: id, userId }, "Post unliked");

    res.status(200).json(ApiResponse.success("Post unliked successfully"));
  });

  /**
   * Add a comment to a post
   * POST /api/v1/posts/:postId/comments
   */
  static addComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const postId = req.params.postId as string;
    const { text } = req.body;

    if (!text) {
      throw new Error("Comment text is required");
    }

    const comment = await PostService.addComment(postId, userId, text);

    logger.info(
      { postId, userId, commentId: (comment as any)._id?.toString() },
      "Comment added",
    );

    res
      .status(201)
      .json(ApiResponse.success("Comment added successfully", { comment }));
  });

  /**
   * Delete a comment from a post
   * DELETE /api/v1/posts/:postId/comments/:commentId
   */
  static deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const postId = req.params.postId as string;
    const commentId = req.params.commentId as string;

    await PostService.deleteComment(postId, commentId, userId);

    logger.info({ postId, commentId, userId }, "Comment deleted");

    res.status(200).json(ApiResponse.success("Comment deleted successfully"));
  });

  /**
   * Get user's posts
   * GET /api/v1/posts/user/:userId
   */
  static getUserPosts = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.params.userId as string;
    const page = req.query.page as string;
    const limit = req.query.limit as string;

    const result = await PostService.getUserPosts(userId, page, limit);

    logger.info({ userId, page, limit }, "User posts retrieved");

    res
      .status(200)
      .json(ApiResponse.success("User posts retrieved successfully", result));
  });

  /**
   * Update post caption
   * PUT /api/v1/posts/:id/caption
   */
  static updatePostCaption = asyncHandler(
    async (req: Request, res: Response) => {
      const userId = req.user?._id.toString();
      if (!userId) {
        throw new Error("User not authenticated");
      }

      const id = req.params.id as string;
      const { caption } = req.body;

      if (caption === undefined) {
        throw new Error("Caption is required");
      }

      const post = await PostService.updatePostCaption(id, userId, caption);

      logger.info({ postId: id, userId }, "Post caption updated");

      res
        .status(200)
        .json(
          ApiResponse.success("Post caption updated successfully", { post }),
        );
    },
  );

    /**
   * Get personalized feed for the authenticated user
   * GET /api/v1/posts/feed
   */
  static getPersonalizedFeed = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id.toString();
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const page = req.query.page as string;
    const limit = req.query.limit as string;

    const result = await PostService.getPersonalizedFeed(userId, page, limit);

    logger.info({ userId, page, limit }, "Personalized feed retrieved");

    res
      .status(200)
      .json(ApiResponse.success("Feed retrieved successfully", result));
  });
}
