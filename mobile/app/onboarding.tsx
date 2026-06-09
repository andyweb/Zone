// Onboarding: disclaimer legale obbligatorio (brief, sezione 8).
// L'utente deve accettare prima di usare la mappa.

import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Disclaimer } from "../components/Disclaimer";
import { setOnboardingDone } from "../lib/onboarding";

export default function Onboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    await setOnboardingDone();
    router.replace("/(app)/map");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Come funziona</Text>
        <Text style={styles.p}>
          Vedi sulla mappa le segnalazioni attive vicino a te. Puoi crearne di
          nuove e confermare o smentire quelle altrui. Le segnalazioni sono
          temporanee: nascono, vivono un tempo limitato e scadono.
        </Text>

        <Disclaimer />

        <Pressable
          style={[styles.button, busy && { opacity: 0.6 }]}
          onPress={accept}
          disabled={busy}
        >
          <Text style={styles.buttonText}>Ho capito, continua</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, gap: 18, flexGrow: 1, justifyContent: "center" },
  title: { fontSize: 26, fontWeight: "800" },
  p: { fontSize: 16, lineHeight: 23, color: "#333" },
  button: {
    backgroundColor: "#3B82C4",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
