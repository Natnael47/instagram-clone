import { Schema, Types, model, type Document } from "mongoose";
import type { UserDocument } from "./User";

export interface IStory {
  imageUrl: string;
  author: Types.ObjectId | UserDocument;
  viewers: (Types.ObjectId | UserDocument)[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryDocument extends Document, IStory {}

const storySchema = new Schema<StoryDocument>(
  {
    imageUrl: {
      type: String,
      required: [true, "Image URL is required"],
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    viewers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

storySchema.virtual("viewerCount").get(function (this: StoryDocument) {
  return this.viewers.length;
});

storySchema.virtual("isExpired").get(function (this: StoryDocument) {
  return new Date() > this.expiresAt;
});

storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

storySchema.pre("find", function () {
  this.where({ expiresAt: { $gt: new Date() } });
});

storySchema.pre("findOne", function () {
  this.where({ expiresAt: { $gt: new Date() } });
});

export const Story = model<StoryDocument>("Story", storySchema);
