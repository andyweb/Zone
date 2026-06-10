// Layout radice: provider auth + Stack expo-router con gating.
// Finché lo stato auth è in caricamento mostra uno spinner; poi instrada
// verso login o area autenticata.

import {
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../lib/auth";
import { colors, font } from "../lib/theme";

const headerStyle = {
  headerShown: true,
  headerStyle: { backgroundColor: colors.surface },
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text, fontWeight: "800" as const, fontSize: font.h3 },
};

function RootNavigator() {
  const { token, loading } = useAuth();
  const [fontsLoaded] = useFonts({ SpaceGrotesk_700Bold });
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";

    if (!token && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (token && inAuthGroup) {
      router.replace("/(app)/map");
    }
  }, [token, loading, segments, router]);

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(auth)/login" />
      <Stack.Screen name="onboarding" options={{ presentation: "modal" }} />
      <Stack.Screen name="(app)/map" />
      <Stack.Screen
        name="(app)/create"
        options={{ ...headerStyle, presentation: "modal", title: "Nuova segnalazione" }}
      />
      <Stack.Screen
        name="report/[id]"
        options={{ ...headerStyle, presentation: "modal", title: "Dettaglio" }}
      />
    </Stack>
  );
}

const styles = {
  loading: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: colors.bg,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
