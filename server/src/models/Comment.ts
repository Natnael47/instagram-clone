import { Schema, model, type Document } from "mongoose";
import type { PostDocument } from "./Post";
import type { UserDocument } from "./User";

/**
 * Interface for Comment document (standalone collection)
 * Note: This is for if you want comments in their own collection.
 * For embedded comments in Post model, you don't need this.
 * This is provided for scalability when comments grow large.
 */
export interface IComment {
  text: string;
  author: Schema.Types.ObjectId | UserDocument;
  post: Schema.Types.ObjectId | PostDocument;
  parentComment?: Schema.Types.ObjectId | CommentDocument;
  likes: Schema.Types.ObjectId[] | UserDocument[];
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentDocument extends Document, IComment {}

const commentSchema = new Schema<CommentDocument>(
  {
    text: {
      type: String,
      required: [true, "Comment text is required"],
      trim: true,
      maxlength: [500, "Comment cannot exceed 500 characters"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for like count
commentSchema.virtual("likeCount").get(function (this: CommentDocument) {
  return this.likes.length;
});

// Indexes
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

export const Comment = model<CommentDocument>("Comment", commentSchema);
