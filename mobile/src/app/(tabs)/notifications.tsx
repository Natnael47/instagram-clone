import {
  useGetNotificationsQuery,
  useMarkAllAsReadMutation,
  useMarkAsReadMutation,
} from "@/api/slices/notificationSlice";
import { Avatar } from "@/components/common/Avatar";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorMessage } from "@/components/common/ErrorMessage";
import { Loader } from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import { useSocket } from "@/hooks/useSocket";
import type { Notification } from "@/types/notification";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationsScreen() {
  const { socket } = useSocket();
  const [page, setPage] = useState(1);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  const { data, isLoading, isError, error, refetch } = useGetNotificationsQuery(
    { page, limit: 20 },
  );
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  React.useEffect(() => {
    if (data?.data?.data) {
      if (page === 1) {
        setAllNotifications(data.data.data);
      } else {
        setAllNotifications((prev) => [...prev, ...data.data.data]);
      }
    }
  }, [data]);

  React.useEffect(() => {
    if (!socket) return;
    socket.on("new-notification", () => refetch());
    return () => {
      socket.off("new-notification");
    };
  }, [socket]);

  const handlePress = async (notification: Notification): Promise<void> => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    if (notification.type === "like" || notification.type === "comment") {
      router.push({
        pathname: ROUTES.MODALS.POST_DETAIL,
        params: { postId: notification.entityId },
      });
    } else if (notification.type === "follow") {
      router.push({
        pathname: ROUTES.PROFILE.USER,
        params: { userId: notification.sender._id },
      });
    }
  };

  const handleMarkAllRead = async (): Promise<void> => {
    await markAllAsRead().unwrap();
    refetch();
  };

  const handleLoadMore = (): void => {
    if (data?.data?.pagination?.hasNext) {
      setPage((prev) => prev + 1);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationRow, !item.isRead && styles.unread]}
      onPress={() => handlePress(item)}
    >
      <Avatar
        uri={item.sender.profilePicture}
        name={item.sender.fullName}
        size={44}
      />
      <View style={styles.notificationInfo}>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.time}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading && page === 1) return <Loader fullScreen />;
  if (isError)
    return (
      <ErrorMessage
        message={
          (error as any)?.data?.message || "Failed to load notifications"
        }
        onRetry={refetch}
      />
    );
  if (allNotifications.length === 0)
    return (
      <EmptyState
        icon="🔔"
        title="No Notifications"
        subtitle="You're all caught up!"
      />
    );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notifications</Text>
          <Button
            title="Mark All Read"
            onPress={handleMarkAllRead}
            variant="text"
            size="small"
          />
        </View>
        <FlatList
          data={allNotifications}
          renderItem={renderNotification}
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
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: "700", color: colors.text.primary },
  notificationRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  unread: { backgroundColor: "#EDF2FF" },
  notificationInfo: { marginLeft: 12, flex: 1 },
  message: { fontSize: 14, color: colors.text.primary, lineHeight: 20 },
  time: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
});
