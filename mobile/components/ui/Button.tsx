// Bottone riutilizzabile con varianti (primary / success / danger / ghost).

import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from "react-native";

import { colors, font, radius, shadow, spacing } from "../../lib/theme";

type Variant = "primary" | "success" | "danger" | "ghost" | "light";

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  style?: StyleProp<ViewStyle>;
}

const BG: Record<Variant, string> = {
  primary: colors.primary,
  success: colors.success,
  danger: colors.danger,
  ghost: "transparent",
  light: colors.white,
};

export function Button({
  label,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  icon,
  style,
}: Props) {
  const tintedLabel = variant === "ghost" || variant === "light";
  const blocked = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={blocked}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: BG[variant] },
        variant === "primary" && shadow.button,
        variant === "light" && shadow.card,
        blocked && styles.blocked,
        pressed && !blocked && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tintedLabel ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, tintedLabel && styles.ghostLabel]}>
          {icon ? `${icon}  ${label}` : label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  blocked: { opacity: 0.5 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  label: { color: colors.white, fontWeight: "700", fontSize: font.body },
  ghostLabel: { color: colors.primary },
});
