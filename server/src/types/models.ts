/**
 * TypeScript interfaces for all database models
 * These are used for type safety across the application
 */

import type { Document } from "mongoose";

import type { CommentDocument } from "@models/Comment";
import type { ConversationDocument } from "@models/Conversation";
import type { MessageDocument } from "@models/Message";
import type { NotificationDocument } from "@models/Notification";
import type { PostDocument } from "@models/Post";
import type { StoryDocument } from "@models/Story";
import type { UserDocument } from "@models/User";

// Re-export all document types
export type {
  CommentDocument,
  ConversationDocument,
  MessageDocument,
  NotificationDocument,
  PostDocument,
  StoryDocument,
  UserDocument,
};

// Utility types
export type PopulatedDocument<T> = T & {
  [K in keyof T]: T[K] extends Array<infer U>
    ? U extends { _id: unknown }
      ? U | string | unknown
      : T[K]
    : T[K] extends { _id: unknown }
      ? T[K] | string | unknown
      : T[K];
};

// Type for document IDs
export type ObjectId = string;

// Type for lean queries (plain JavaScript objects instead of Mongoose documents)
export type LeanUser = Omit<UserDocument, keyof Document> & {
  _id: ObjectId;
};

export type LeanPost = Omit<PostDocument, keyof Document> & {
  _id: ObjectId;
};

export type LeanStory = Omit<StoryDocument, keyof Document> & {
  _id: ObjectId;
};

export type LeanComment = Omit<CommentDocument, keyof Document> & {
  _id: ObjectId;
};

export type LeanConversation = Omit<ConversationDocument, keyof Document> & {
  _id: ObjectId;
};

export type LeanMessage = Omit<MessageDocument, keyof Document> & {
  _id: ObjectId;
};

export type LeanNotification = Omit<NotificationDocument, keyof Document> & {
  _id: ObjectId;
};

// Pagination types
export interface PaginationOptions {
  page: number;
  limit: number;
  sort?: Record<string, 1 | -1>;
  populate?: string | string[];
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Query helpers
export interface SearchQuery {
  search?: string;
  page?: number;
  limit?: number;
}

export interface PostQuery extends SearchQuery {
  author?: string;
  following?: boolean;
}

export interface UserQuery extends SearchQuery {
  followers?: string;
  following?: string;
}
