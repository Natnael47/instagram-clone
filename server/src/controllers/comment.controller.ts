import { asyncHandler } from "@middleware/asyncHandler";
import { CommentService } from "@services/comment.service";
import { ApiResponse } from "@utils/ApiResponse";
import { logger } from "@utils/logger";
import { Request, Response } from "express";

export class CommentController {
  static addComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const postId = req.params.postId as string;
    const { text, parentCommentId } = req.body;

    if (!text || typeof text !== "string") {
      throw new Error("Comment text is required");
    }

    const userIdStr = userId.toString();
    const comment = await CommentService.addComment(
      postId,
      userIdStr,
      text,
      parentCommentId,
    );

    logger.info(
      { commentId: comment._id, postId, userId: userIdStr },
      "Comment added to post",
    );

    res
      .status(201)
      .json(ApiResponse.success("Comment added successfully", { comment }));
  });

  static getPostComments = asyncHandler(async (req: Request, res: Response) => {
    const postId = req.params.postId as string;
    const page = req.query.page as string;
    const limit = req.query.limit as string;

    const result = await CommentService.getPostComments(postId, page, limit);

    logger.info(
      { postId, total: result.pagination.total },
      "Post comments retrieved",
    );

    res
      .status(200)
      .json(ApiResponse.success("Comments retrieved successfully", result));
  });

  static updateComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const commentId = req.params.commentId as string;
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      throw new Error("Comment text is required");
    }

    const userIdStr = userId.toString();
    const comment = await CommentService.updateComment(
      commentId,
      userIdStr,
      text,
    );

    logger.info({ commentId, userId: userIdStr }, "Comment updated");

    res
      .status(200)
      .json(ApiResponse.success("Comment updated successfully", { comment }));
  });

  static deleteComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const commentId = req.params.commentId as string;

    const userIdStr = userId.toString();
    await CommentService.deleteComment(commentId, userIdStr);

    logger.info({ commentId, userId: userIdStr }, "Comment deleted");

    res.status(200).json(ApiResponse.success("Comment deleted successfully"));
  });

  static likeComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const commentId = req.params.commentId as string;

    const userIdStr = userId.toString();
    await CommentService.likeComment(commentId, userIdStr);

    logger.info({ commentId, userId: userIdStr }, "Comment liked");

    res.status(200).json(ApiResponse.success("Comment liked successfully"));
  });

  static unlikeComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?._id;

    if (!userId) {
      throw new Error("User not authenticated");
    }

    const commentId = req.params.commentId as string;

    const userIdStr = userId.toString();
    await CommentService.unlikeComment(commentId, userIdStr);

    logger.info({ commentId, userId: userIdStr }, "Comment unliked");

    res.status(200).json(ApiResponse.success("Comment unliked successfully"));
  });
}
