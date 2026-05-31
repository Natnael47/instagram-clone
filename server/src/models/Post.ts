import { model, Schema, Types, type Document } from "mongoose";
import type { UserDocument } from "./User";

export interface IComment {
  user: Types.ObjectId | UserDocument;
  text: string;
  createdAt: Date;
}

export interface IPost {
  imageUrl: string;
  caption?: string;
  author: Types.ObjectId | UserDocument;
  likes: (Types.ObjectId | UserDocument)[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PostDocument extends Document, IPost {}

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

postSchema.virtual("likeCount").get(function (this: PostDocument) {
  return this.likes.length;
});

postSchema.virtual("commentCount").get(function (this: PostDocument) {
  return this.comments.length;
});

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ likes: 1 });

postSchema.pre("find", function () {
  this.populate("author", "username fullName profilePicture");
});

postSchema.pre("findOne", function () {
  this.populate("author", "username fullName profilePicture");
});

export const Post = model<PostDocument>("Post", postSchema);
