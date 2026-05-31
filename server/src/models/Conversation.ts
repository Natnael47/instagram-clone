import { model, Schema, Types, type Document } from "mongoose";
import type { UserDocument } from "./User";

export interface IConversation {
  participants: (Types.ObjectId | UserDocument)[];
  lastMessage: string;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDocument extends Document, IConversation {}

const conversationSchema = new Schema<ConversationDocument>(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: String,
      default: "",
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

conversationSchema.virtual("participantCount").get(function (
  this: ConversationDocument,
) {
  return this.participants.length;
});

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ participants: 1, updatedAt: -1 });

export const Conversation = model<ConversationDocument>(
  "Conversation",
  conversationSchema,
);
