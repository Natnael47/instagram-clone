export interface CommentAuthor {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface Comment {
  _id: string;
  text: string;
  author: CommentAuthor;
  post: string;
  parentComment?: string | null;
  likes: string[] | CommentAuthor[];
  likeCount: number;
  isEdited: boolean;
  replies?: Comment[];
  replyCount?: number;
  createdAt: string;
  updatedAt: string;
}