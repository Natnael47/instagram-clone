import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/common/Loader";

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader fullScreen message="Loading..." />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Redirect href="/(auth)/login" />;
}