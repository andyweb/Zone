// Campo di testo con etichetta, icona a linea (Feather) e stato di focus.

import { Feather } from "@expo/vector-icons";
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
  icon?: React.ComponentProps<typeof Feather>["name"];
  inputStyle?: StyleProp<TextStyle>;
}

export function TextField({ label, icon, inputStyle, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon ? (
          <Feather
            name={icon}
            size={18}
            color={focused ? colors.primary : colors.textFaint}
          />
        ) : null}
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
  input: {
    flex: 1,
    paddingVertical: 15,
    fontSize: font.body,
    color: colors.text,
  },
});
