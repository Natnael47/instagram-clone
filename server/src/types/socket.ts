import type { PostDocument } from "@models/Post";
import type { UserDocument } from "@models/User";
import { Types } from "mongoose";

/**
 * Socket.IO event payload types
 */
export interface AuthenticatePayload {
  token: string;
}

export interface AuthenticatedPayload {
  userId: string;
  username: string;
  fullName: string;
  profilePicture?: string;
}

export interface JoinConversationPayload {
  conversationId: string;
}

export interface SendMessagePayload {
  conversationId: string;
  text: string;
  recipientId?: string;
}

export interface NewMessagePayload {
  conversationId: string;
  message: {
    _id: Types.ObjectId;
    text: string;
    sender: {
      _id: Types.ObjectId;
      username: string;
      fullName: string;
      profilePicture?: string;
    };
    createdAt: Date;
    isRead: boolean;
  };
}

export interface MessageReadPayload {
  conversationId: string;
  messageId: string;
}

export interface TypingPayload {
  conversationId: string;
  isTyping: boolean;
}

export interface UserTypingPayload {
  userId: string;
  username: string;
  isTyping: boolean;
}

export interface NewPostPayload {
  author: {
    id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  post: Partial<PostDocument>;
}

export interface NewStoryPayload {
  author: {
    id: string;
    username: string;
    fullName: string;
    profilePicture?: string;
  };
  story: {
    _id: Types.ObjectId;
    imageUrl: string;
    createdAt: Date;
    expiresAt: Date;
  };
}

export interface PostLikedPayload {
  likerId: string;
  postId: string;
}

export interface PostCommentedPayload {
  commenterId: string;
  postId: string;
  commentId: string;
}

export interface UserStatusChangePayload {
  userId: string;
  isOnline: boolean;
}

export interface NewFollowerPayload {
  followerId: string;
}

export interface NewNotificationPayload {
  notification: {
    _id: Types.ObjectId;
    type: string;
    message: string;
    sender: {
      _id: Types.ObjectId;
      username: string;
      fullName: string;
      profilePicture?: string;
    };
    createdAt: Date;
  };
}

/**
 * Socket.IO server interface with authentication data
 */
export interface AuthenticatedSocket {
  userId: string;
  user: UserDocument;
}

/**
 * Socket.IO room types
 */
export type SocketRoom = `user:${string}` | `conversation:${string}`;
