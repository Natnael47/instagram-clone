import { Loader } from "@/components/common/Loader";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { useAuth } from "@/hooks/useAuth";
import { store } from "@/store";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader fullScreen message="Loading..." />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="(auth)" />
      )}
      <Stack.Screen
        name="modals/comments/[postId]"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="modals/post-detail/[postId]"
        options={{ presentation: "modal" }}
      />
      <Stack.Screen
        name="modals/edit-profile"
        options={{ presentation: "modal" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <AuthProvider>
          <SocketProvider>
            <StatusBar style="auto" />
            <RootNavigator />
          </SocketProvider>
        </AuthProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
