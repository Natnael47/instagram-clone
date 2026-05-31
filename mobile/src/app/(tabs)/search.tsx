import { useSearchUsersQuery } from "@/api/slices/userSlice";
import { Avatar } from "@/components/common/Avatar";
import { EmptyState } from "@/components/common/EmptyState";
import { Loader } from "@/components/common/Loader";
import { colors } from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import type { User } from "@/types/user";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useSearchUsersQuery(
    { q: searchQuery, page: 1, limit: 20 },
    { skip: searchQuery.length < 1 },
  );

  const handleSearch = useCallback((text: string): void => {
    setQuery(text);
    if (text.length >= 1) {
      setSearchQuery(text);
    } else {
      setSearchQuery("");
    }
  }, []);

  const renderUser = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() =>
        router.push({
          pathname: ROUTES.PROFILE.USER,
          params: { userId: item._id },
        })
      }
    >
      <Avatar uri={item.profilePicture} name={item.fullName} size={44} />
      <View style={styles.userInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.fullName}>{item.fullName}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={colors.text.tertiary}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {isLoading && <Loader />}
        {!isLoading && searchQuery.length > 0 && data?.data?.data && (
          <FlatList
            data={data.data.data}
            renderItem={renderUser}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
          />
        )}
        {!isLoading && searchQuery.length === 0 && (
          <EmptyState
            icon="🔍"
            title="Search"
            subtitle="Find users by username or full name"
          />
        )}
        {!isLoading &&
          searchQuery.length > 0 &&
          data?.data?.data?.length === 0 && (
            <EmptyState
              icon="😕"
              title="No Results"
              subtitle={`No users found for "${searchQuery}"`}
            />
          )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchInput: {
    margin: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    fontSize: 14,
    color: colors.text.primary,
  },
  userRow: { flexDirection: "row", alignItems: "center", padding: 12 },
  userInfo: { marginLeft: 12, flex: 1 },
  username: { fontWeight: "600", fontSize: 14, color: colors.text.primary },
  fullName: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
});
