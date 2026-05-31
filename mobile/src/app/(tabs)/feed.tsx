import {
  useGetFeedQuery,
  useLikePostMutation,
  useUnlikePostMutation,
} from "@/api/slices/postSlice";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loader } from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { useSocket } from "@/hooks/useSocket";
import type { Post } from "@/types/post";
import { router } from "expo-router";
import { useEffect, useState } from "react";
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

export default function FeedScreen() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [page, setPage] = useState(1);
  const [allPosts, setAllPosts] = useState<Post[]>([]);

  const { data, isLoading, isError, error, refetch } = useGetFeedQuery({
    page,
    limit: 10,
  });
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();

  useEffect(() => {
    if (data?.data?.data) {
      if (page === 1) {
        setAllPosts(data.data.data);
      } else {
        setAllPosts((prev) => [...prev, ...data.data.data]);
      }
    }
  }, [data]);

  useEffect(() => {
    if (!socket) return;
    socket.on("new-post", () => refetch());
    return () => {
      socket.off("new-post");
    };
  }, [socket]);

  const handleLike = async (
    postId: string,
    isLiked: boolean,
  ): Promise<void> => {
    try {
      if (isLiked) {
        await unlikePost(postId).unwrap();
      } else {
        await likePost(postId).unwrap();
      }
      setAllPosts((prev) =>
        prev.map((p) =>
          p._id === postId
            ? {
                ...p,
                isLikedByCurrentUser: !isLiked,
                likeCount: isLiked ? p.likeCount - 1 : p.likeCount + 1,
              }
            : p,
        ),
      );
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleLoadMore = (): void => {
    if (data?.data?.pagination?.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={styles.postCard}>
      <TouchableOpacity
        style={styles.postHeader}
        onPress={() =>
          router.push({
            pathname: ROUTES.PROFILE.USER,
            params: { userId: item.author._id },
          })
        }
      >
        <Avatar
          uri={item.author.profilePicture}
          name={item.author.fullName}
          size={36}
        />
        <Text style={styles.username}>{item.author.username}</Text>
      </TouchableOpacity>

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
          style={styles.postImage}
          resizeMode="cover"
        />
      </TouchableOpacity>

      <View style={styles.postActions}>
        <TouchableOpacity
          onPress={() => handleLike(item._id, !!item.isLikedByCurrentUser)}
        >
          <Text style={styles.actionIcon}>
            {item.isLikedByCurrentUser ? "❤️" : "🤍"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: ROUTES.MODALS.COMMENTS,
              params: { postId: item._id },
            })
          }
        >
          <Text style={styles.actionIcon}>💬</Text>
        </TouchableOpacity>
        <Text style={styles.actionIcon}>📤</Text>
      </View>

      <Text style={styles.likeCount}>{item.likeCount} likes</Text>

      {item.caption ? (
        <View style={styles.captionRow}>
          <Text style={styles.captionUsername}>{item.author.username}</Text>
          <Text style={styles.captionText} numberOfLines={2}>
            {item.caption}
          </Text>
        </View>
      ) : null}

      {item.commentCount > 0 && (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: ROUTES.MODALS.COMMENTS,
              params: { postId: item._id },
            })
          }
        >
          <Text style={styles.viewComments}>
            View all {item.commentCount} comments
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading && page === 1) return <Loader fullScreen />;
  if (isError)
    return (
      <ErrorMessage
        message={(error as any)?.data?.message || "Failed to load feed"}
        onRetry={refetch}
      />
    );
  if (allPosts.length === 0)
    return (
      <EmptyState
        icon="📷"
        title="No Posts Yet"
        subtitle="Follow users to see their posts here"
      />
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <FlatList
          data={allPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item._id}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                setPage(1);
                refetch();
              }}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  postCard: { marginBottom: 20, backgroundColor: colors.white },
  postHeader: { flexDirection: "row", alignItems: "center", padding: 12 },
  username: {
    marginLeft: 10,
    fontWeight: "600",
    fontSize: 14,
    color: colors.text.primary,
  },
  postImage: { width, height: width, backgroundColor: colors.surface },
  postActions: { flexDirection: "row", padding: 12, gap: 16 },
  actionIcon: { fontSize: 24 },
  likeCount: {
    fontWeight: "700",
    fontSize: 14,
    paddingHorizontal: 12,
    color: colors.text.primary,
  },
  captionRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 4,
    flexWrap: "wrap",
  },
  captionUsername: {
    fontWeight: "700",
    fontSize: 14,
    marginRight: 6,
    color: colors.text.primary,
  },
  captionText: { fontSize: 14, color: colors.text.primary, flex: 1 },
  viewComments: {
    paddingHorizontal: 12,
    marginTop: 4,
    fontSize: 14,
    color: colors.text.secondary,
  },
});
