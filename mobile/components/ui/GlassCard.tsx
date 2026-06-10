// Card "vetro smerigliato": blur + overlay traslucido + bordo chiaro.
// L'overlay rgba garantisce comunque una superficie semitrasparente leggibile
// anche dove il blur è limitato (Android).

import { BlurView } from "expo-blur";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors, radius, shadow, spacing } from "../../lib/theme";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  strong?: boolean; // overlay più opaco (più leggibile)
  padded?: boolean;
}

export function GlassCard({
  children,
  style,
  intensity = 40,
  strong = false,
  padded = true,
}: Props) {
  return (
    <View style={[styles.wrap, shadow.card, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFill} />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: strong ? colors.glassFillStrong : colors.glassFill },
        ]}
      />
      <View style={[styles.content, padded && styles.padded]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  content: { backgroundColor: "transparent" },
  padded: { padding: spacing.xl },
});
