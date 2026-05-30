import { Schema, model, type Document } from "mongoose";
import type { UserDocument } from "./User";

/**
 * Interface for comment subdocument
 */
export interface IComment {
  user: Schema.Types.ObjectId | UserDocument;
  text: string;
  createdAt: Date;
}

/**
 * Interface for Post document
 */
export interface IPost {
  imageUrl: string;
  caption?: string;
  author: Schema.Types.ObjectId | UserDocument;
  likes: Schema.Types.ObjectId[] | UserDocument[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PostDocument extends Document, IPost {}

// Comment subdocument schema
const commentSchema = new Schema<IComment>({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  text: {
    type: String,
    required: [true, "Comment text is required"],
    trim: true,
    maxlength: [500, "Comment cannot exceed 500 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const postSchema = new Schema<PostDocument>(
  {
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },
    caption: {
      type: String,
      maxlength: [2200, "Caption cannot exceed 2200 characters"],
      default: "",
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    comments: [commentSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtuals for computed counts
postSchema.virtual("likeCount").get(function (this: PostDocument) {
  return this.likes.length;
});

postSchema.virtual("commentCount").get(function (this: PostDocument) {
  return this.comments.length;
});

// Indexes for efficient queries
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: 1 });

// Populate author by default
postSchema.pre("find", function () {
  this.populate("author", "username fullName profilePicture");
});

postSchema.pre("findOne", function () {
  this.populate("author", "username fullName profilePicture");
});

export const Post = model<PostDocument>("Post", postSchema);
