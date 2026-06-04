// src/models/Activity.ts
import mongoose, { Schema, Document } from 'mongoose';
import type { ActivityAction, ResourceType } from '../types/activity.types';
import { env } from '@config/env';

export interface IActivity extends Document {
  user: mongoose.Types.ObjectId;
  action: ActivityAction;
  resource: ResourceType;
  resourceId?: mongoose.Types.ObjectId;
  details: Record<string, any>;
  ip?: string | null;
  userAgent?: string | null;
  status: 'success' | 'failure' | 'pending';
  environment: 'development' | 'production' | 'test';
  metadata: {
    duration?: number;
    batchId?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required for activity log'],
      index: true,
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      enum: [
        // Auth
        'login', 'logout', 'signup', 'refresh_token', 'password_reset', 'change_password',
        // Posts
        'create_post', 'update_post', 'delete_post', 'view_post',
        'like_post', 'unlike_post', 'save_post', 'unsave_post',
        // Comments
        'create_comment', 'delete_comment', 'like_comment', 'unlike_comment',
        // Stories
        'create_story', 'view_story', 'delete_story',
        // Users
        'follow', 'unfollow', 'block_user', 'unblock_user',
        'update_profile', 'update_avatar', 'view_profile',
        // Messages
        'send_message', 'delete_message', 'create_conversation',
        // Feed & Explore
        'refresh_feed', 'explore_content',
        // Interactions
        'search', 'report_content', 'share_post',
      ],
    },
    resource: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: ['user', 'post', 'comment', 'story', 'message', 'notification', 'conversation'],
    },
    resourceId: {
      type: Schema.Types.ObjectId,
      required: false,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: {
      type: String,
      default: null,
    },
    userAgent: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['success', 'failure', 'pending'],
      default: 'success',
    },
    environment: {
      type: String,
      enum: ['development', 'production', 'test'],
      default: env.NODE_ENV || 'development',
    },
    metadata: {
      duration: Number,
      batchId: String,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, any>) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for common queries
ActivitySchema.index({ user: 1, createdAt: -1 });
ActivitySchema.index({ action: 1, createdAt: -1 });
ActivitySchema.index({ resource: 1, resourceId: 1 });
ActivitySchema.index({ environment: 1, createdAt: -1 });

// TTL index: Auto-delete old activities (only in production)
if (env.NODE_ENV === 'production') {
  ActivitySchema.index(
    { createdAt: 1 },
    { 
      expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
      name: 'auto_delete_old_activities'
    }
  );
}

export const Activity = mongoose.model<IActivity>('Activity', ActivitySchema);