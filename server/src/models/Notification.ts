import { Schema, model, type Document } from "mongoose";
import type { UserDocument } from "./User";

/**
 * Notification types
 */
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "mention"
  | "story_view";

/**
 * Interface for Notification document
 */
export interface INotification {
  recipient: Schema.Types.ObjectId | UserDocument;
  sender: Schema.Types.ObjectId | UserDocument;
  type: NotificationType;
  entityId: Schema.Types.ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDocument extends Document, INotification {}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["like", "comment", "follow", "mention", "story_view"],
      required: true,
    },
    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
      // Note: This can reference different collections (Post, Comment, User)
    },
    message: {
      type: String,
      required: true,
      maxlength: [200, "Notification message cannot exceed 200 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // Auto-delete after 30 days

// Populate sender by default
notificationSchema.pre("find", function () {
  this.populate("sender", "username fullName profilePicture");
});

notificationSchema.pre("findOne", function () {
  this.populate("sender", "username fullName profilePicture");
});

export const Notification = model<NotificationDocument>(
  "Notification",
  notificationSchema,
);
