import { Types } from 'mongoose';

/**
 * Sample user data for testing
 * These match the IUser interface from src/models/User.ts
 */

export const testUser = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
  username: 'testuser',
  email: 'testuser@example.com',
  password: 'hashedpassword123',
  fullName: 'Test User',
  bio: 'This is a test user',
  profilePicture: '',
  followers: [] as Types.ObjectId[],
  following: [] as Types.ObjectId[],
  posts: [] as Types.ObjectId[],
  stories: [] as Types.ObjectId[],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const secondUser = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
  username: 'janedoe',
  email: 'jane@example.com',
  password: 'hashedpassword456',
  fullName: 'Jane Doe',
  bio: 'Digital artist',
  profilePicture: 'https://example.com/jane.jpg',
  followers: [] as Types.ObjectId[],
  following: [] as Types.ObjectId[],
  posts: [] as Types.ObjectId[],
  stories: [] as Types.ObjectId[],
  createdAt: new Date('2024-02-01'),
  updatedAt: new Date('2024-02-01'),
};

export const thirdUser = {
  _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
  username: 'bobwilson',
  email: 'bob@example.com',
  password: 'hashedpassword789',
  fullName: 'Bob Wilson',
  bio: 'Travel blogger',
  profilePicture: 'https://example.com/bob.jpg',
  followers: [] as Types.ObjectId[],
  following: [] as Types.ObjectId[],
  posts: [] as Types.ObjectId[],
  stories: [] as Types.ObjectId[],
  createdAt: new Date('2024-03-01'),
  updatedAt: new Date('2024-03-01'),
};

/**
 * Create a mock user object that mimics Mongoose document
 * Includes common Mongoose methods used in services
 */
export function createMockUser(overrides: Record<string, unknown> = {}) {
  return {
    ...testUser,
    _id: testUser._id,
    toObject: () => {
      const obj = { ...testUser, ...overrides };
      const { password, ...rest } = obj as any;
      return rest;
    },
    toJSON: () => {
      const obj = { ...testUser, ...overrides };
      const { password, ...rest } = obj as any;
      return rest;
    },
    save: async () => Promise.resolve(),
    populate: () => Promise.resolve(),
    ...overrides,
  };
}

/**
 * Registration data used for testing
 */
export const validRegistrationData = {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'Password123!',
  fullName: 'New User',
  bio: 'New to the platform',
};

export const duplicateEmailRegistration = {
  username: 'differentuser',
  email: 'testuser@example.com', // Same as testUser
  password: 'Password123!',
  fullName: 'Different User',
};

export const duplicateUsernameRegistration = {
  username: 'testuser', // Same as testUser
  email: 'different@example.com',
  password: 'Password123!',
  fullName: 'Different User',
};