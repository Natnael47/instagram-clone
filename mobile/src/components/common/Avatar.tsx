import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { colors } from "@/constants/colors";

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  onPress?: () => void;
  showOnlineDot?: boolean;
  isOnline?: boolean;
  borderWidth?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  uri,
  name,
  size = 40,
  onPress,
  showOnlineDot = false,
  isOnline = false,
  borderWidth = 0,
}) => {
  const getInitials = (fullName?: string): string => {
    if (!fullName) return "?";
    const parts = fullName.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getBackgroundColor = (fullName?: string): string => {
    const colors_list = ["#F58529", "#DD2A7B", "#8134AF", "#0095F6", "#78C257"];
    if (!fullName) return colors_list[0];
    const index = fullName.length % colors_list.length;
    return colors_list[index];
  };

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const Content = (
    <View style={[styles.container, containerStyle]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            containerStyle,
            borderWidth > 0 && { borderWidth, borderColor: colors.white },
          ]}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            containerStyle,
            { backgroundColor: getBackgroundColor(name) },
            borderWidth > 0 && { borderWidth, borderColor: colors.white },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showOnlineDot && (
        <View
          style={[
            styles.onlineDot,
            {
              backgroundColor: isOnline ? colors.online : colors.text.tertiary,
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              borderWidth: 1.5,
              borderColor: colors.white,
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.white,
    fontWeight: "700",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
  },
});