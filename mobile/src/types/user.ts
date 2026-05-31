export interface User {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  profilePicture: string;
  followers: string[];
  following: string[];
  posts: string[];
  stories: string[];
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
  isFollowedByCurrentUser?: boolean;
}