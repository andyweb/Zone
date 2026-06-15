// Schermata Auth: login / registrazione email+password.

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Disclaimer } from "../../components/Disclaimer";
import { Button } from "../../components/ui/Button";
import { GlassCard } from "../../components/ui/GlassCard";
import { GradientBackground } from "../../components/ui/GradientBackground";
import { TextField } from "../../components/ui/TextField";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { isOnboardingDone } from "../../lib/onboarding";
import { colors, font, radius, shadow, spacing } from "../../lib/theme";

type Mode = "login" | "register";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [enrollmentCode, setEnrollmentCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await signIn(email.trim(), password);
      else await signUp(email.trim(), password, enrollmentCode.trim() || null);
      if (!(await isOnboardingDone())) router.replace("/onboarding");
    } catch (e) {
      const msg =
        e instanceof ApiError ? e.message : "Connessione al server non riuscita";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.brand}>
              <View style={styles.logo}>
                <Text style={styles.logoMark}>📍</Text>
              </View>
              <Text style={styles.appName}>Zone</Text>
              <Text style={styles.tagline}>
                Cosa succede intorno a te, adesso.
              </Text>
            </View>

            <GlassCard strong style={styles.card}>
              <View style={styles.segment}>
                {(["login", "register"] as Mode[]).map((m) => {
                  const active = mode === m;
                  return (
                    <Pressable
                      key={m}
                      style={[styles.segmentItem, active && styles.segmentActive]}
                      onPress={() => {
                        setError(null);
                        setMode(m);
                      }}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          active && styles.segmentTextActive,
                        ]}
                      >
                        {m === "login" ? "Accedi" : "Registrati"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.form}>
                <TextField
                  label="Email"
                  icon="mail"
                  placeholder="nome@email.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextField
                  label="Password"
                  icon="lock"
                  placeholder="Almeno 8 caratteri"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                {mode === "register" ? (
                  <TextField
                    label="Codice di accreditamento (opzionale)"
                    icon="shield"
                    placeholder="Solo per volontari / operatori PC"
                    autoCapitalize="characters"
                    value={enrollmentCode}
                    onChangeText={setEnrollmentCode}
                  />
                ) : null}

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Button
                  label={mode === "login" ? "Accedi" : "Crea account"}
                  onPress={submit}
                  loading={busy}
                  style={styles.submit}
                />
              </View>
            </GlassCard>

            <Disclaimer compact />
          </ScrollView>
        </KeyboardAvoidingView>
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
  brand: { alignItems: "center", gap: spacing.sm },
  logo: {
    width: 80,
    height: 80,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  logoMark: { fontSize: 40 },
  appName: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 44,
    color: colors.onGradient,
    letterSpacing: 1,
  },
  tagline: { fontSize: font.body, color: colors.onGradientMuted },
  card: { gap: spacing.xl },
  segment: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: radius.md,
    padding: 4,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: colors.surface, ...shadow.card },
  segmentText: {
    fontSize: font.small,
    fontWeight: "700",
    color: colors.textMuted,
  },
  segmentTextActive: { color: colors.primary },
  form: { gap: spacing.lg },
  submit: { marginTop: spacing.xs },
  error: {
    color: colors.danger,
    textAlign: "center",
    fontSize: font.small,
    fontWeight: "600",
  },
});
