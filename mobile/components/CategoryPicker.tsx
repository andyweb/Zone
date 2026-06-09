// Selettore di categoria dalla lista CHIUSA fornita dal backend.

import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
              { borderColor: c.color },
              active && { backgroundColor: c.color },
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
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { fontSize: 15, fontWeight: "600", color: "#222" },
  labelActive: { color: "#fff" },
});
