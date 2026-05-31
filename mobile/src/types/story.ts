export interface StoryAuthor {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface Story {
  _id: string;
  imageUrl: string;
  author: StoryAuthor;
  viewers: string[] | StoryAuthor[];
  viewerCount: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  hasCurrentUserViewed?: boolean;
}

export interface StoryGroup {
  authorId: string;
  author: StoryAuthor;
  stories: Story[];
}