import {
  useAddCommentMutation,
  useDeleteCommentMutation,
  useGetPostCommentsQuery,
} from "@/api/slices/commentSlice";
import { useGetPostQuery } from "@/api/slices/postSlice";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loader } from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import type { Comment } from "@/types/comment";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CommentsModal() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [page, setPage] = useState(1);
  const [allComments, setAllComments] = useState<Comment[]>([]);

  const { data: postData } = useGetPostQuery(postId);
  const {
    data: commentsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetPostCommentsQuery({ postId, page, limit: 20 });
  const [addComment, { isLoading: isAdding }] = useAddCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();

  React.useEffect(() => {
    if (commentsData?.data?.data) {
      if (page === 1) {
        setAllComments(commentsData.data.data);
      } else {
        setAllComments((prev) => [...prev, ...commentsData.data.data]);
      }
    }
  }, [commentsData]);

  const handleAddComment = async (): Promise<void> => {
    if (!text.trim()) return;
    try {
      await addComment({ postId, text: text.trim() }).unwrap();
      setText("");
      setPage(1);
      refetch();
    } catch (error) {
      console.error("Add comment error:", error);
    }
  };

  const handleDeleteComment = async (commentId: string): Promise<void> => {
    try {
      await deleteComment(commentId).unwrap();
      refetch();
    } catch (error) {
      console.error("Delete comment error:", error);
    }
  };

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={styles.commentRow}>
      <Avatar
        uri={item.author.profilePicture}
        name={item.author.fullName}
        size={32}
      />
      <View style={styles.commentContent}>
        <Text style={styles.commentUsername}>{item.author.username}</Text>
        <Text style={styles.commentText}>{item.text}</Text>
        {item.author._id === user?._id && (
          <TouchableOpacity onPress={() => handleDeleteComment(item._id)}>
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Comments</Text>
          <Text style={styles.count}>
            {postData?.data?.post?.commentCount || 0} comments
          </Text>
        </View>

        {isLoading && page === 1 ? <Loader /> : null}
        {isError ? (
          <ErrorMessage
            message={(error as any)?.data?.message || "Failed to load comments"}
            onRetry={refetch}
          />
        ) : null}
        {!isLoading && allComments.length === 0 ? (
          <EmptyState
            icon="💬"
            title="No Comments"
            subtitle="Be the first to comment"
          />
        ) : null}

        <FlatList
          data={allComments}
          renderItem={renderComment}
          keyExtractor={(item) => item._id}
          onEndReached={() => {
            if (commentsData?.data?.pagination?.hasNext) setPage((p) => p + 1);
          }}
        />

        <View style={styles.inputRow}>
          <Avatar uri={user?.profilePicture} name={user?.fullName} size={32} />
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={colors.text.tertiary}
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            onPress={handleAddComment}
            disabled={!text.trim() || isAdding}
            style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
          >
            <Text style={styles.sendText}>Post</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text.primary },
  count: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  commentRow: { flexDirection: "row", padding: 12, gap: 10 },
  commentContent: { flex: 1 },
  commentUsername: {
    fontWeight: "700",
    fontSize: 13,
    color: colors.text.primary,
  },
  commentText: {
    fontSize: 14,
    color: colors.text.primary,
    marginTop: 2,
    lineHeight: 20,
  },
  deleteText: { fontSize: 12, color: colors.error, marginTop: 4 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.border,
    gap: 10,
  },
  input: { flex: 1, fontSize: 14, color: colors.text.primary, maxHeight: 80 },
  sendButton: {},
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
});
