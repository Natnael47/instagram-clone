import {
  useGetCurrentUserQuery,
  useLogoutMutation,
} from "@/api/slices/authSlice";
import { useGetUserPostsQuery } from "@/api/slices/postSlice";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/common/Button";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loader } from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import type { Post } from "@/types/post";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const COLUMN_COUNT = 3;
const ITEM_SIZE = width / COLUMN_COUNT;

export default function ProfileScreen() {
  const { user: authUser } = useAuth();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  const { data: userData, isLoading: isUserLoading } = useGetCurrentUserQuery();
  const {
    data: postsData,
    isLoading: isPostsLoading,
    isError,
    error,
    refetch,
  } = useGetUserPostsQuery(
    { userId: authUser?._id || "", page, limit: 12 },
    { skip: !authUser?._id },
  );
  const [logout] = useLogoutMutation();

  const user = userData?.data?.user || authUser;

  React.useEffect(() => {
    if (postsData?.data?.data) {
      if (page === 1) {
        setAllPosts(postsData.data.data);
      } else {
        setAllPosts((prev) => [...prev, ...postsData.data.data]);
      }
    }
  }, [postsData]);

  const handleLogout = async (): Promise<void> => {
    try {
      await logout().unwrap();
    } catch {}
    await useAuth().logout();
  };

  const handleLoadMore = (): void => {
    if (postsData?.data?.pagination?.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <TouchableOpacity
      onPress={() =>
        router.push({
          pathname: ROUTES.MODALS.POST_DETAIL,
          params: { postId: item._id },
        })
      }
    >
      <Image
        source={{ uri: item.imageUrl }}
        style={styles.gridItem}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  if (isUserLoading && !user) return <Loader fullScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.username}>{user?.username}</Text>
          <Button
            title="Logout"
            onPress={handleLogout}
            variant="text"
            size="small"
          />
        </View>

        <View style={styles.profileInfo}>
          <Avatar uri={user?.profilePicture} name={user?.fullName} size={80} />
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user?.postCount || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user?.followerCount || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user?.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.fullName}>{user?.fullName}</Text>
          {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(ROUTES.MODALS.EDIT_PROFILE)}
        >
          <Text style={styles.editButtonText}>Edit Profile</Text>
        </TouchableOpacity>

        {isPostsLoading && page === 1 ? <Loader /> : null}
        {isError ? (
          <ErrorMessage
            message={(error as any)?.data?.message || "Failed to load posts"}
            onRetry={refetch}
          />
        ) : null}

        <FlatList
          data={allPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item._id}
          numColumns={COLUMN_COUNT}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isPostsLoading}
              onRefresh={() => {
                setPage(1);
                refetch();
              }}
            />
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  username: { fontSize: 20, fontWeight: "700", color: colors.text.primary },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 28,
  },
  stats: { flexDirection: "row", gap: 24 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "700", color: colors.text.primary },
  statLabel: { fontSize: 12, color: colors.text.secondary },
  bioSection: { paddingHorizontal: 16, marginTop: 12 },
  fullName: { fontWeight: "600", fontSize: 14, color: colors.text.primary },
  bio: { fontSize: 14, color: colors.text.primary, marginTop: 2 },
  editButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  editButtonText: {
    fontWeight: "600",
    fontSize: 14,
    color: colors.text.primary,
  },
  gridItem: { width: ITEM_SIZE - 2, height: ITEM_SIZE - 2, margin: 1 },
});
