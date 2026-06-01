import { Types } from 'mongoose';

/**
 * Sample story data for testing
 * These match the IStory interface from src/models/Story.ts
 */

export const testStory = {
  _id: new Types.ObjectId('707f1f77bcf86cd799439031'),
  imageUrl: 'https://example.com/story1.jpg',
  author: new Types.ObjectId('507f1f77bcf86cd799439011'), // testUser
  viewers: [] as Types.ObjectId[],
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const secondStory = {
  _id: new Types.ObjectId('707f1f77bcf86cd799439032'),
  imageUrl: 'https://example.com/story2.jpg',
  author: new Types.ObjectId('507f1f77bcf86cd799439012'), // jane
  viewers: [] as Types.ObjectId[],
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const expiredStory = {
  _id: new Types.ObjectId('707f1f77bcf86cd799439033'),
  imageUrl: 'https://example.com/expired-story.jpg',
  author: new Types.ObjectId('507f1f77bcf86cd799439011'),
  viewers: [],
  expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (expired)
  createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
  updatedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
};

/**
 * Story creation data
 */
export const validStoryData = {
  imageUrl: 'https://example.com/new-story.jpg',
};