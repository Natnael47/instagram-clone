// src/types/activity.types.ts
import type { Request } from 'express';

export type ActivityAction =
  // Auth
  | 'login' | 'logout' | 'signup' | 'refresh_token' | 'password_reset'
  | 'change_password'
  // Posts
  | 'create_post' | 'update_post' | 'delete_post' | 'view_post'
  | 'like_post' | 'unlike_post' | 'save_post' | 'unsave_post'
  // Comments
  | 'create_comment' | 'delete_comment' | 'like_comment' | 'unlike_comment'
  // Stories
  | 'create_story' | 'view_story' | 'delete_story'
  // Users
  | 'follow' | 'unfollow' | 'block_user' | 'unblock_user'
  | 'update_profile' | 'update_avatar' | 'view_profile'
  // Messages
  | 'send_message' | 'delete_message' | 'create_conversation'
  // Feed & Explore
  | 'refresh_feed' | 'explore_content'
  // Interactions
  | 'search' | 'report_content' | 'share_post';

export type ResourceType =
  | 'user' | 'post' | 'comment' | 'story' 
  | 'message' | 'notification' | 'conversation';

export interface ActivityLogParams {
  user: string;
  action: ActivityAction;
  resource: ResourceType;
  resourceId?: string;
  details?: Record<string, any>;
  status?: 'success' | 'failure' | 'pending';
  req?: Request;
  metadata?: {
    duration?: number;
    batchId?: string;
  };
}

export interface ActivityQuery {
  page?: number;
  limit?: number;
  action?: ActivityAction;
  resource?: ResourceType;
  startDate?: Date;
  endDate?: Date;
  status?: 'success' | 'failure';
}

export interface ActivityStats {
  totalActivities: number;
  lastActivity?: Date;
  actionBreakdown: Record<string, number>;
  dailyActivity: Array<{
    date: string;
    count: number;
  }>;
}