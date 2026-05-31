import bcrypt from "bcryptjs";
import { Schema, Types, model, type Document, type Model } from "mongoose";

export interface IUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
  bio?: string;
  profilePicture?: string;
  followers: Types.ObjectId[];
  following: Types.ObjectId[];
  posts: Types.ObjectId[];
  stories: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserMethods {
  matchPassword(enteredPassword: string): Promise<boolean>;
}

export interface UserDocument extends Document, IUser, IUserMethods {}

interface UserVirtuals {
  followerCount: number;
  followingCount: number;
  postCount: number;
}

const userSchema = new Schema<
  UserDocument,
  Model<UserDocument>,
  IUserMethods,
  UserVirtuals
>(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Username can only contain letters, numbers, and underscores",
      ],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },

    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      maxlength: [50, "Full name cannot exceed 50 characters"],
    },

    bio: {
      type: String,
      maxlength: [160, "Bio cannot exceed 160 characters"],
      default: "",
    },

    profilePicture: {
      type: String,
      default: "",
    },

    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    posts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Post",
      },
    ],

    stories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
    },
    toObject: {
      virtuals: true,
    },
  },
);

userSchema.virtual("followerCount").get(function (this: UserDocument) {
  return this.followers?.length || 0;
});

userSchema.virtual("followingCount").get(function (this: UserDocument) {
  return this.following?.length || 0;
});

userSchema.virtual("postCount").get(function (this: UserDocument) {
  return this.posts?.length || 0;
});

userSchema.index({ createdAt: -1 });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (
  enteredPassword: string,
): Promise<boolean> {
  return bcrypt.compare(enteredPassword, this.password);
};

export const User = model<UserDocument>("User", userSchema);
