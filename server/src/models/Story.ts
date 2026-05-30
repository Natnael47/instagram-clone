import { Schema, model, type Document } from "mongoose";
import type { UserDocument } from "./User";

/**
 * Interface for Story document
 */
export interface IStory {
  imageUrl: string;
  author: Schema.Types.ObjectId | UserDocument;
  viewers: Schema.Types.ObjectId[] | UserDocument[];
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
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from creation
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for viewer count
storySchema.virtual("viewerCount").get(function (this: StoryDocument) {
  return this.viewers.length;
});

// Virtual to check if story is expired
storySchema.virtual("isExpired").get(function (this: StoryDocument) {
  return new Date() > this.expiresAt;
});

// Indexes
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Only return non-expired stories by default
storySchema.pre("find", function () {
  this.where({ expiresAt: { $gt: new Date() } });
});

storySchema.pre("findOne", function () {
  this.where({ expiresAt: { $gt: new Date() } });
});

export const Story = model<StoryDocument>("Story", storySchema);
