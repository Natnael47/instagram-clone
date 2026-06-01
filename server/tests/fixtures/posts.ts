import { Types } from 'mongoose';

/**
 * Sample post data for testing
 * These match the IPost interface from src/models/Post.ts
 */

export const testPost = {
  _id: new Types.ObjectId('607f1f77bcf86cd799439021'),
  imageUrl: 'https://example.com/image1.jpg',
  caption: 'Beautiful sunset! 🌅',
  author: new Types.ObjectId('507f1f77bcf86cd799439011'), // testUser
  likes: [] as Types.ObjectId[],
  comments: [],
  createdAt: new Date('2024-06-01'),
  updatedAt: new Date('2024-06-01'),
};

export const secondPost = {
  _id: new Types.ObjectId('607f1f77bcf86cd799439022'),
  imageUrl: 'https://example.com/image2.jpg',
  caption: 'My artwork 🎨',
  author: new Types.ObjectId('507f1f77bcf86cd799439012'), // jane
  likes: [] as Types.ObjectId[],
  comments: [],
  createdAt: new Date('2024-06-02'),
  updatedAt: new Date('2024-06-02'),
};

export const thirdPost = {
  _id: new Types.ObjectId('607f1f77bcf86cd799439023'),
  imageUrl: 'https://example.com/image3.jpg',
  caption: 'Travel adventures ✈️',
  author: new Types.ObjectId('507f1f77bcf86cd799439013'), // bob
  likes: [] as Types.ObjectId[],
  comments: [],
  createdAt: new Date('2024-06-03'),
  updatedAt: new Date('2024-06-03'),
};

/**
 * Sample comment embedded in a post
 */
export const sampleComment = {
  user: new Types.ObjectId('507f1f77bcf86cd799439011'),
  text: 'Great post!',
  createdAt: new Date('2024-06-04'),
};

/**
 * Post creation data (no ID, will be assigned by database)
 */
export const validPostData = {
  imageUrl: 'https://example.com/new-image.jpg',
  caption: 'My new post',
};

export const postWithoutCaption = {
  imageUrl: 'https://example.com/photo.jpg',
};