import { Platform } from "react-native";

const getBaseUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:5000/api/v1";
    }
    return "http://localhost:5000/api/v1";
  }
  return (
    process.env.EXPO_PUBLIC_API_URL || "https://your-production-url.com/api/v1"
  );
};

const getSocketUrl = (): string => {
  if (__DEV__) {
    if (Platform.OS === "android") {
      return "http://10.0.2.2:5000";
    }
    return "http://localhost:5000";
  }
  return (
    process.env.EXPO_PUBLIC_SOCKET_URL || "https://your-production-url.com"
  );
};

export const env = {
  API_URL: getBaseUrl(),
  SOCKET_URL: getSocketUrl(),
};
