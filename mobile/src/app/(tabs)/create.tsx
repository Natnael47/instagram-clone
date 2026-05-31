import { useCreatePostMutation } from "@/api/slices/postSlice";
import { Button } from "@/components/common/Button";
import { colors } from "@/constants/colors";
import { ROUTES } from "@/constants/routes";
import { useImagePicker } from "@/hooks/useImagePicker";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateScreen() {
  const { image, pickImage, takePhoto, clearImage } = useImagePicker();
  const [caption, setCaption] = useState("");
  const [createPost, { isLoading }] = useCreatePostMutation();

  const handleShare = async (): Promise<void> => {
    if (!image) {
      Alert.alert("No Image", "Please select an image first");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("image", {
        uri: image.uri,
        type: image.mimeType || "image/jpeg",
        name: image.fileName || "photo.jpg",
      } as any);
      formData.append("caption", caption);

      await createPost(formData).unwrap();
      clearImage();
      setCaption("");
      router.replace(ROUTES.TABS.FEED);
    } catch (error: any) {
      Alert.alert("Error", error?.data?.message || "Failed to create post");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.title}>New Post</Text>
          <Button
            title="Share"
            onPress={handleShare}
            loading={isLoading}
            disabled={!image}
            size="small"
          />
        </View>

        {image ? (
          <View>
            <Image
              source={{ uri: image.uri }}
              style={styles.preview}
              resizeMode="cover"
            />
            <TouchableOpacity style={styles.changePhoto} onPress={clearImage}>
              <Text style={styles.changePhotoText}>Remove</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.captionInput}
              placeholder="Write a caption..."
              placeholderTextColor={colors.text.tertiary}
              value={caption}
              onChangeText={setCaption}
              multiline
              maxLength={2200}
            />
          </View>
        ) : (
          <View style={styles.options}>
            <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
              <Text style={styles.optionIcon}>🖼️</Text>
              <Text style={styles.optionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
              <Text style={styles.optionIcon}>📷</Text>
              <Text style={styles.optionText}>Take a Photo</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  title: { fontSize: 18, fontWeight: "700", color: colors.text.primary },
  preview: { width: "100%", height: 400, backgroundColor: colors.surface },
  changePhoto: { alignItems: "center", padding: 12 },
  changePhotoText: { color: colors.primary, fontWeight: "600" },
  captionInput: {
    padding: 16,
    fontSize: 14,
    color: colors.text.primary,
    minHeight: 100,
  },
  options: { padding: 24, gap: 16 },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    gap: 16,
  },
  optionIcon: { fontSize: 32 },
  optionText: { fontSize: 16, fontWeight: "500", color: colors.text.primary },
});
