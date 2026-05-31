export interface MessageSender {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export interface Message {
  _id: string;
  conversation: string;
  sender: MessageSender;
  text: string;
  isRead: boolean;
  readAt?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  _id: string;
  participants: MessageSender[];
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}