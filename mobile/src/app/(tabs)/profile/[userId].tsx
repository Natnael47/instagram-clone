import { useGetUserPostsQuery } from "@/api/slices/postSlice";
import {
  useFollowUserMutation,
  useGetUserProfileQuery,
  useUnfollowUserMutation,
} from "@/api/slices/userSlice";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/common/Button";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loader } from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import type { Post } from "@/types/post";
import { router, useLocalSearchParams } from "expo-router";
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

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  const { data: userData, isLoading: isUserLoading } =
    useGetUserProfileQuery(userId);
  const {
    data: postsData,
    isLoading: isPostsLoading,
    refetch: refetchPosts,
  } = useGetUserPostsQuery({ userId, page, limit: 12 });
  const [followUser, { isLoading: isFollowing }] = useFollowUserMutation();
  const [unfollowUser] = useUnfollowUserMutation();

  const user = userData?.data?.user;

  React.useEffect(() => {
    if (postsData?.data?.data) {
      if (page === 1) {
        setAllPosts(postsData.data.data);
      } else {
        setAllPosts((prev) => [...prev, ...postsData.data.data]);
      }
    }
  }, [postsData]);

  const handleFollow = async (): Promise<void> => {
    if (!user) return;
    try {
      if (user.isFollowedByCurrentUser) {
        await unfollowUser(userId).unwrap();
      } else {
        await followUser(userId).unwrap();
      }
    } catch (error) {
      console.error("Follow error:", error);
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
  if (!user) return <ErrorMessage message="User not found" />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.profileInfo}>
          <Avatar uri={user.profilePicture} name={user.fullName} size={80} />
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.postCount || 0}</Text>
              <Text style={styles.statLabel}>Posts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followerCount || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{user.followingCount || 0}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>

        <View style={styles.bioSection}>
          <Text style={styles.fullName}>{user.fullName}</Text>
          {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        </View>

        <View style={styles.actionButtons}>
          <Button
            title={user.isFollowedByCurrentUser ? "Following" : "Follow"}
            onPress={handleFollow}
            loading={isFollowing}
            variant={user.isFollowedByCurrentUser ? "secondary" : "primary"}
            fullWidth
          />
        </View>

        <FlatList
          data={allPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item._id}
          numColumns={COLUMN_COUNT}
          onEndReached={() => {
            if (postsData?.data?.pagination?.hasNext) setPage((p) => p + 1);
          }}
          refreshControl={
            <RefreshControl
              refreshing={isPostsLoading}
              onRefresh={() => {
                setPage(1);
                refetchPosts();
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
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 28,
  },
  stats: { flexDirection: "row", gap: 24 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "700", color: colors.text.primary },
  statLabel: { fontSize: 12, color: colors.text.secondary },
  bioSection: { paddingHorizontal: 16 },
  fullName: { fontWeight: "600", fontSize: 14, color: colors.text.primary },
  bio: { fontSize: 14, color: colors.text.primary, marginTop: 2 },
  actionButtons: { padding: 16 },
  gridItem: { width: ITEM_SIZE - 2, height: ITEM_SIZE - 2, margin: 1 },
});
