export type AuthStackParamList = {
  "/(auth)/login": undefined;
  "/(auth)/register": undefined;
  "/(auth)/forgot-password": undefined;
};

export type TabParamList = {
  "/(tabs)/feed": undefined;
  "/(tabs)/search": undefined;
  "/(tabs)/create": undefined;
  "/(tabs)/notifications": undefined;
  "/(tabs)/profile": undefined;
};

export type ProfileStackParamList = {
  "/(tabs)/profile/index": undefined;
  "/(tabs)/profile/[userId]": { userId: string };
};

export type ModalStackParamList = {
  "/modals/comments/[postId]": { postId: string };
  "/modals/post-detail/[postId]": { postId: string };
  "/modals/edit-profile": undefined;
};