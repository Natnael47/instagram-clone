import {
  useDeletePostMutation,
  useGetPostQuery,
  useLikePostMutation,
  useUnlikePostMutation,
} from "@/api/slices/postSlice";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/common/Button";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loader } from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/hooks/useAuth";
import { router, useLocalSearchParams } from "expo-router";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

export default function PostDetailModal() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useGetPostQuery(postId);
  const [likePost] = useLikePostMutation();
  const [unlikePost] = useUnlikePostMutation();
  const [deletePost] = useDeletePostMutation();

  const post = data?.data?.post;
  const isOwner = post?.author?._id === user?._id;

  const handleLike = async (): Promise<void> => {
    if (!post) return;
    try {
      if (post.isLikedByCurrentUser) {
        await unlikePost(postId).unwrap();
      } else {
        await likePost(postId).unwrap();
      }
      refetch();
    } catch (err) {
      console.error("Like error:", err);
    }
  };

  const handleDelete = async (): Promise<void> => {
    try {
      await deletePost(postId).unwrap();
      router.back();
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  if (isLoading) return <Loader fullScreen />;
  if (isError || !post)
    return (
      <ErrorMessage
        message={(error as any)?.data?.message || "Post not found"}
        onRetry={refetch}
      />
    );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.authorRow}
          onPress={() =>
            router.push({
              pathname: ROUTES.PROFILE.USER,
              params: { userId: post.author._id },
            })
          }
        >
          <Avatar
            uri={post.author.profilePicture}
            name={post.author.fullName}
            size={36}
          />
          <Text style={styles.username}>{post.author.username}</Text>
        </TouchableOpacity>
        {isOwner && (
          <Button
            title="Delete"
            onPress={handleDelete}
            variant="danger"
            size="small"
          />
        )}
      </View>

      <Image
        source={{ uri: post.imageUrl }}
        style={styles.image}
        resizeMode="contain"
      />

      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike}>
          <Text style={styles.actionIcon}>
            {post.isLikedByCurrentUser ? "❤️" : "🤍"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: ROUTES.MODALS.COMMENTS,
              params: { postId },
            })
          }
        >
          <Text style={styles.actionIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.likeCount}>{post.likeCount} likes</Text>

      {post.caption ? (
        <View style={styles.captionRow}>
          <Text style={styles.captionUsername}>{post.author.username}</Text>
          <Text style={styles.captionText}>{post.caption}</Text>
        </View>
      ) : null}

      <Text style={styles.date}>
        {new Date(post.createdAt).toLocaleDateString()}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  username: { fontWeight: "600", fontSize: 14, color: colors.text.primary },
  image: { width, height: width, backgroundColor: colors.surface },
  actions: { flexDirection: "row", padding: 12, gap: 16 },
  actionIcon: { fontSize: 28 },
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
  date: {
    paddingHorizontal: 12,
    marginTop: 8,
    fontSize: 12,
    color: colors.text.secondary,
  },
});
