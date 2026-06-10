// Contenitore "card": superficie bianca con bordo morbido e ombra leggera.

import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, shadow, spacing } from "../../lib/theme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  flat?: boolean; // senza ombra
}

export function Card({ children, style, flat = false }: Props) {
  return (
    <View style={[styles.card, !flat && shadow.card, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
});
