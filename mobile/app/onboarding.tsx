// Onboarding: come funziona + disclaimer legale obbligatorio (brief, sezione 8).
// L'utente deve accettare prima di usare la mappa.

import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Disclaimer } from "../components/Disclaimer";
import { Button } from "../components/ui/Button";
import { GlassCard } from "../components/ui/GlassCard";
import { GradientBackground } from "../components/ui/GradientBackground";
import { setOnboardingDone } from "../lib/onboarding";
import { colors, font, radius, spacing } from "../lib/theme";

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: "🗺️",
    title: "Vicino a te",
    body: "Vedi sulla mappa le segnalazioni attive intorno alla tua posizione.",
  },
  {
    icon: "➕",
    title: "Crea e vota",
    body: "Aggiungi nuove segnalazioni e conferma o smentisci quelle degli altri.",
  },
  {
    icon: "⏳",
    title: "Sempre attuali",
    body: "Le segnalazioni sono temporanee: nascono, vivono e scadono da sole.",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    await setOnboardingDone();
    router.replace("/(app)/map");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.hero}>
            <Text style={styles.kicker}>BENVENUTO</Text>
            <Text style={styles.title}>Come funziona</Text>
          </View>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <GlassCard key={f.title} style={styles.feature} padded={false}>
                <View style={styles.featureInner}>
                  <View style={styles.iconBadge}>
                    <Text style={styles.icon}>{f.icon}</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureBody}>{f.body}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </View>

          <Disclaimer />

          <Button label="Ho capito, continua" onPress={accept} loading={busy} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    padding: spacing.xxl,
    gap: spacing.xl,
    flexGrow: 1,
    justifyContent: "center",
  },
  hero: { gap: spacing.xs },
  kicker: {
    fontSize: font.tiny,
    fontWeight: "800",
    color: colors.primary,
    letterSpacing: 1.5,
  },
  title: { fontSize: font.display, fontWeight: "800", color: colors.text },
  features: { gap: spacing.md },
  feature: { borderRadius: radius.lg },
  featureInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: { fontSize: 24 },
  featureText: { flex: 1, gap: 2 },
  featureTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  featureBody: { fontSize: font.small, color: colors.textMuted, lineHeight: 20 },
});
