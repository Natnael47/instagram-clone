export interface PostAuthor {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface PostComment {
  _id: string;
  user: PostAuthor;
  text: string;
  createdAt: string;
}

export interface Post {
  _id: string;
  imageUrl: string;
  caption: string;
  author: PostAuthor;
  likes: string[] | PostAuthor[];
  comments: PostComment[];
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  isLikedByCurrentUser?: boolean;
}