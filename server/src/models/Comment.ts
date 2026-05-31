import { model, Schema, Types, type Document } from "mongoose";
import type { PostDocument } from "./Post";
import type { UserDocument } from "./User";

export interface IComment {
  text: string;
  author: Types.ObjectId | UserDocument;
  post: Types.ObjectId | PostDocument;
  parentComment?: Types.ObjectId | CommentDocument;
  likes: (Types.ObjectId | UserDocument)[];
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

commentSchema.virtual("likeCount").get(function (this: CommentDocument) {
  return this.likes.length;
});

commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ author: 1 });
commentSchema.index({ parentComment: 1 });

export const Comment = model<CommentDocument>("Comment", commentSchema);
