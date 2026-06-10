// Disclaimer legale obbligatorio (brief, sezione 8): l'app non sostituisce le
// autorità né i numeri di emergenza. Mostrato in onboarding e in creazione.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, radius, spacing } from "../lib/theme";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.box, compact && styles.compact]}>
      <View style={styles.header}>
        <Text style={styles.badge}>⚠️</Text>
        <Text style={styles.title}>Avviso importante</Text>
      </View>
      <Text style={styles.body}>
        Questa app non sostituisce le autorità né i numeri di emergenza. In caso
        di pericolo reale contatta i canali ufficiali: 112 / 113 / 115.
      </Text>
      {!compact && (
        <Text style={styles.body}>
          Le segnalazioni sono generate dalla community, sono temporanee e non
          verificate. Sei responsabile dei contenuti che invii: vietato l'uso
          per molestie o diffamazione.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  compact: { padding: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  badge: { fontSize: font.body },
  title: { fontWeight: "800", color: colors.warningText, fontSize: font.small },
  body: { color: colors.warningText, fontSize: font.tiny + 1, lineHeight: 19 },
});
