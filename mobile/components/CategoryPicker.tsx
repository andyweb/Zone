// Selettore di categoria dalla lista CHIUSA fornita dal backend.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "../lib/theme";
import type { Category } from "../lib/types";

interface Props {
  categories: Category[];
  selected: string | null;
  onSelect: (key: string) => void;
}

export function CategoryPicker({ categories, selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      {categories.map((c) => {
        const active = c.key === selected;
        return (
          <Pressable
            key={c.key}
            onPress={() => onSelect(c.key)}
            style={[
              styles.chip,
              active && { backgroundColor: c.color, borderColor: c.color },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: c.color }]} />
            <Text style={[styles.label, active && styles.labelActive]}>
              {c.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: font.small, fontWeight: "700", color: colors.text },
  labelActive: { color: colors.white },
});
