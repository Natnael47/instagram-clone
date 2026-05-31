export interface NotificationSender {
  _id: string;
  username: string;
  fullName: string;
  profilePicture: string;
}

export type NotificationType = "like" | "comment" | "follow" | "story_view";

export interface Notification {
  _id: string;
  recipient: string;
  sender: NotificationSender;
  type: NotificationType;
  entityId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}