// Disclaimer legale obbligatorio (brief, sezione 8): l'app non sostituisce le
// autorità né i numeri di emergenza. Mostrato in onboarding e in creazione.

import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function Disclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.box, compact && styles.compact]}>
      <Text style={styles.title}>⚠️ Avviso importante</Text>
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
    backgroundColor: "#FFF6E5",
    borderColor: "#EF9F27",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  compact: { padding: 10 },
  title: { fontWeight: "700", color: "#8A5A00", fontSize: 15 },
  body: { color: "#5A4500", fontSize: 13, lineHeight: 18 },
});
