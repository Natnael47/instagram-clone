import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

interface UseImagePickerReturn {
  image: ImagePicker.ImagePickerAsset | null;
  pickImage: () => Promise<ImagePicker.ImagePickerAsset | null>;
  takePhoto: () => Promise<ImagePicker.ImagePickerAsset | null>;
  clearImage: () => void;
  isLoading: boolean;
}

export const useImagePicker = (): UseImagePickerReturn => {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const requestPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please grant camera roll permissions to use this feature.");
      return false;
    }
    return true;
  };

  const pickImage = useCallback(async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    setIsLoading(true);
    try {
      const hasPermission = await requestPermission();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0]);
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error("Error picking image:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const takePhoto = useCallback(async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    setIsLoading(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission required", "Please grant camera permissions to use this feature.");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0]);
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error("Error taking photo:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearImage = useCallback((): void => {
    setImage(null);
  }, []);

  return { image, pickImage, takePhoto, clearImage, isLoading };
};