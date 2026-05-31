import { Comment, type CommentDocument } from "@models/Comment";
import { Post } from "@models/Post";
import { getIO } from "@socket/index";
import { ApiError } from "@utils/ApiError";
import { logger } from "@utils/logger";
import {
  formatPaginatedResult,
  parsePaginationParams,
} from "@utils/pagination";
import { Types } from "mongoose";

export class CommentService {
  static async addComment(
    postId: string,
    authorId: string,
    text: string,
    parentCommentId?: string,
  ): Promise<CommentDocument> {
    const post = await Post.findById(postId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }

    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment) {
        throw ApiError.notFound("Parent comment not found");
      }
    }

    const comment = await Comment.create({
      text,
      author: new Types.ObjectId(authorId),
      post: new Types.ObjectId(postId),
      parentComment: parentCommentId
        ? new Types.ObjectId(parentCommentId)
        : undefined,
      likes: [],
      isEdited: false,
    });

    await comment.populate("author", "username fullName profilePicture");

    logger.info({ commentId: comment._id, postId, authorId }, "Comment added");

    return comment;
  }

  static async getPostComments(
    postId: string,
    page?: string | number,
    limit?: string | number,
  ) {
    const {
      page: pageNum,
      limit: limitNum,
      skip,
    } = parsePaginationParams(page, limit);

    const postObjectId = new Types.ObjectId(postId);

    const filter = {
      post: postObjectId,
      parentComment: null as unknown as undefined,
    };

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate("author", "username fullName profilePicture")
        .populate("likes", "username fullName profilePicture")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Comment.countDocuments(filter),
    ]);

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentComment: comment._id,
        })
          .populate("author", "username fullName profilePicture")
          .populate("likes", "username fullName profilePicture")
          .sort({ createdAt: 1 });

        const commentObj = comment.toObject();
        (commentObj as any).replies = replies;
        (commentObj as any).replyCount = replies.length;

        return commentObj;
      }),
    );

    logger.info({ postId, total }, "Post comments retrieved");

    return formatPaginatedResult(commentsWithReplies, pageNum, limitNum, total);
  }

  static async updateComment(
    commentId: string,
    userId: string,
    text: string,
  ): Promise<CommentDocument> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    if (comment.author.toString() !== userId) {
      throw ApiError.forbidden("You can only edit your own comments");
    }

    comment.text = text;
    comment.isEdited = true;
    await comment.save();

    await comment.populate("author", "username fullName profilePicture");

    logger.info({ commentId, userId }, "Comment updated");

    return comment;
  }

  static async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    const post = await Post.findById(comment.post);
    if (!post) {
      throw ApiError.notFound("Associated post not found");
    }

    if (
      comment.author.toString() !== userId &&
      post.author.toString() !== userId
    ) {
      throw ApiError.forbidden("You can only delete your own comments");
    }

    await Comment.deleteMany({ parentComment: comment._id });

    await comment.deleteOne();

    logger.info({ commentId, userId }, "Comment deleted");
  }

  static async likeComment(commentId: string, userId: string): Promise<void> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    const userObjectId = new Types.ObjectId(userId);

    const alreadyLiked = comment.likes.some(
      (like) => like.toString() === userId,
    );

    if (alreadyLiked) {
      throw ApiError.badRequest("Comment already liked");
    }

    comment.likes.push(userObjectId);
    await comment.save();

    // Socket: Notify comment author about like
    try {
      const commentAuthorId = comment.author.toString();
      if (commentAuthorId !== userId) {
        const io = getIO();
        io.to(`user:${commentAuthorId}`).emit("new-notification", {
          notification: {
            _id: comment._id,
            type: "comment_like",
            message: "Someone liked your comment",
            sender: {
              _id: userId,
              username: "",
              fullName: "",
            },
            createdAt: new Date(),
          },
        });
      }
    } catch (socketError) {
      logger.error(socketError, "Failed to emit comment-like socket event");
    }

    logger.info({ commentId, userId }, "Comment liked");
  }

  static async unlikeComment(commentId: string, userId: string): Promise<void> {
    const comment = await Comment.findById(commentId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    comment.likes = comment.likes.filter((like) => like.toString() !== userId);
    await comment.save();

    logger.info({ commentId, userId }, "Comment unliked");
  }

  static async getCommentById(commentId: string): Promise<CommentDocument> {
    const comment = await Comment.findById(commentId)
      .populate("author", "username fullName profilePicture")
      .populate("likes", "username fullName profilePicture");

    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }

    return comment;
  }
}
