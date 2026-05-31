import { useUpdateProfileMutation } from "@/api/slices/authSlice";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { colors } from "@/constants/colors";
import { useAuth } from "@/hooks/useAuth";
import {
  updateProfileSchema,
  type UpdateProfileFormData,
} from "@/utils/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

export default function EditProfileModal() {
  const { user, updateUser } = useAuth();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema) as any,
    defaultValues: {
      fullName: user?.fullName || "",
      bio: user?.bio || "",
      username: user?.username || "",
    },
  });

  const onSubmit = async (data: UpdateProfileFormData): Promise<void> => {
    try {
      const result = await updateProfile(data).unwrap();
      if (result.data?.user) {
        updateUser(result.data.user);
      }
      router.back();
    } catch (error: any) {
      Alert.alert("Error", error?.data?.message || "Failed to update profile");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Edit Profile</Text>

        <Controller
          control={control}
          name="fullName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.fullName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Username"
              placeholder="Enter your username"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.username?.message}
              autoCapitalize="none"
            />
          )}
        />

        <Controller
          control={control}
          name="bio"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Bio"
              placeholder="Tell us about yourself"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.bio?.message}
              multiline
              numberOfLines={3}
            />
          )}
        />

        <Button
          title="Save Changes"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          fullWidth
          style={styles.saveButton}
        />

        <Button
          title="Cancel"
          onPress={() => router.back()}
          variant="outline"
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 24 },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: 24,
    textAlign: "center",
  },
  saveButton: { marginTop: 16, marginBottom: 12 },
});
