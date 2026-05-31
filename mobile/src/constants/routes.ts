export const ROUTES = {
  AUTH: {
    LOGIN: "/(auth)/login",
    REGISTER: "/(auth)/register",
    FORGOT_PASSWORD: "/(auth)/forgot-password",
  },
  TABS: {
    FEED: "/(tabs)/feed",
    SEARCH: "/(tabs)/search",
    CREATE: "/(tabs)/create",
    NOTIFICATIONS: "/(tabs)/notifications",
    PROFILE: "/(tabs)/profile",
  },
  PROFILE: {
    INDEX: "/(tabs)/profile/index",
    USER: "/(tabs)/profile/[userId]",
  },
  MODALS: {
    COMMENTS: "/modals/comments/[postId]",
    POST_DETAIL: "/modals/post-detail/[postId]",
    EDIT_PROFILE: "/modals/edit-profile",
  },
} as const;