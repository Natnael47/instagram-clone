import { Server, Socket } from "socket.io";
import { SocketEvents } from "@config/socket";
import { logger } from "@utils/logger";

/**
 * Feed event handlers
 */
export const feedHandler = (io: Server, socket: Socket, userId: string) => {
  /**
   * Notify followers when user creates a post
   * This is called from the post controller
   */
  socket.on(SocketEvents.NEW_POST, (data: { authorId: string; post: any }) => {
    // This is typically emitted from the service, not received from client
    // But we handle it here for completeness
    logger.info({ userId, postId: data.post._id }, "New post event received");
  });

  /**
   * Notify followers when user creates a story
   * This is called from the story controller
   */
  socket.on(SocketEvents.NEW_STORY, (data: { authorId: string; story: any }) => {
    logger.info({ userId, storyId: data.story._id }, "New story event received");
  });
};

/**
 * Emit new post notification to followers
 * @param io - Socket.IO server instance
 * @param userId - User ID who created the post
 * @param post - Post data
 * @param followers - Array of follower IDs
 */
export const emitNewPost = (io: Server, userId: string, post: any, followers: string[]): void => {
  for (const followerId of followers) {
    io.to(`user:${followerId}`).emit(SocketEvents.NEW_POST, {
      authorId: userId,
      post,
    });
  }
};

/**
 * Emit new story notification to followers
 * @param io - Socket.IO server instance
 * @param userId - User ID who created the story
 * @param story - Story data
 * @param followers - Array of follower IDs
 */
export const emitNewStory = (io: Server, userId: string, story: any, followers: string[]): void => {
  for (const followerId of followers) {
    io.to(`user:${followerId}`).emit(SocketEvents.NEW_STORY, {
      authorId: userId,
      story,
    });
  }
};

/**
 * Emit post liked notification
 * @param io - Socket.IO server instance
 * @param postAuthorId - Post author ID
 * @param likerId - User ID who liked
 * @param postId - Post ID
 */
export const emitPostLiked = (io: Server, postAuthorId: string, likerId: string, postId: string): void => {
  io.to(`user:${postAuthorId}`).emit(SocketEvents.POST_LIKED, {
    likerId,
    postId,
  });
};

/**
 * Emit post commented notification
 * @param io - Socket.IO server instance
 * @param postAuthorId - Post author ID
 * @param commenterId - User ID who commented
 * @param postId - Post ID
 * @param commentId - Comment ID
 */
export const emitPostCommented = (
  io: Server,
  postAuthorId: string,
  commenterId: string,
  postId: string,
  commentId: string
): void => {
  io.to(`user:${postAuthorId}`).emit(SocketEvents.POST_COMMENTED, {
    commenterId,
    postId,
    commentId,
  });
};