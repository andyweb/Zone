// Schermata Auth: login / registrazione email+password.

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Disclaimer } from "../../components/Disclaimer";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { isOnboardingDone } from "../../lib/onboarding";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
      // Dopo l'accesso, se l'onboarding non è stato fatto mostralo.
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Segnalazioni Live</Text>
          <Text style={styles.subtitle}>
            {mode === "login" ? "Accedi al tuo account" : "Crea un account"}
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password (min 8 caratteri)"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={[styles.button, busy && styles.buttonDisabled]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {mode === "login" ? "Accedi" : "Registrati"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              setError(null);
              setMode(mode === "login" ? "register" : "login");
            }}
          >
            <Text style={styles.switch}>
              {mode === "login"
                ? "Non hai un account? Registrati"
                : "Hai già un account? Accedi"}
            </Text>
          </Pressable>

          <View style={{ marginTop: 24 }}>
            <Disclaimer />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 24, gap: 14, flexGrow: 1, justifyContent: "center" },
  title: { fontSize: 30, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 16, color: "#666", textAlign: "center", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#3B82C4",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  switch: { color: "#3B82C4", textAlign: "center", marginTop: 4 },
  error: { color: "#E24B4A", textAlign: "center" },
});
