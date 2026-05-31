import { model, Schema, Types, type Document } from "mongoose";
import type { ConversationDocument } from "./Conversation";
import type { UserDocument } from "./User";

export interface IMessage {
  conversation: Types.ObjectId | ConversationDocument;
  sender: Types.ObjectId | UserDocument;
  text: string;
  isRead: boolean;
  readAt?: Date;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageDocument extends Document, IMessage {}

const messageSchema = new Schema<MessageDocument>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ conversation: 1, isRead: 1 });
messageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export const Message = model<MessageDocument>("Message", messageSchema);
