// Campo di testo con etichetta, icona opzionale e stato di focus.

import React, { useState } from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
} from "react-native";

import { colors, font, radius, spacing } from "../../lib/theme";

interface Props extends TextInputProps {
  label?: string;
  icon?: string;
  inputStyle?: StyleProp<TextStyle>;
}

export function TextField({ label, icon, inputStyle, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={colors.textFaint}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  label: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.glassInput,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  fieldFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.glassInputFocus,
  },
  icon: { fontSize: 17 },
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: font.body,
    color: colors.text,
  },
});
