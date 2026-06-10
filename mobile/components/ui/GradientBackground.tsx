// Sfondo sfumato a tutta schermata. `variant` sceglie la sfumatura del tema.

import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";

import { gradients } from "../../lib/theme";

interface Props {
  children: React.ReactNode;
  variant?: keyof typeof gradients;
  style?: StyleProp<ViewStyle>;
}

export function GradientBackground({
  children,
  variant = "app",
  style,
}: Props) {
  return (
    <LinearGradient
      colors={gradients[variant]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
