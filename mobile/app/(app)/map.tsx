// Schermata Mappa: posizione utente, marker delle segnalazioni colorati per
// categoria, cerchio del raggio di ricerca, aggiornamenti live via SSE
// (con fallback polling). Bottone flottante per creare; tap marker → dettaglio.

import { useRouter } from "expo-router";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Circle, Marker, Region } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

import { Countdown } from "../../components/Countdown";
import * as api from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { DEFAULT_RADIUS_M } from "../../lib/config";
import { registerForPushNotificationsAsync } from "../../lib/push";
import type { Category, Report, SSEReportEvent } from "../../lib/types";

export default function MapScreen() {
  const { token, signOut } = useAuth();
  const router = useRouter();

  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [reports, setReports] = useState<Map<number, Report>>(new Map());
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const subRef = useRef<api.StreamSubscription | null>(null);

  const colorFor = useMemo(() => {
    const m = new Map(categories.map((c) => [c.key, c.color]));
    return (key: string) => m.get(key) ?? "#888";
  }, [categories]);

  // 1) permesso posizione + posizione iniziale
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permesso negato",
          "Senza accesso alla posizione non possiamo mostrarti le segnalazioni vicine.",
        );
        setLoading(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
    })();
  }, []);

  // 2) categorie (una volta)
  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  // 2b) push: registra il token Expo e inoltralo al backend (M5).
  // Best-effort: senza permesso/token l'app resta usabile senza notifiche.
  useEffect(() => {
    if (!token) return;
    (async () => {
      const pushToken = await registerForPushNotificationsAsync();
      if (pushToken) {
        try {
          await api.setPushToken(token, pushToken);
        } catch {
          // niente push: non blocca l'uso dell'app
        }
      }
    })();
  }, [token]);

  // 2c) posizione → backend, solo per filtrare le push per raggio (privacy:
  // singolo punto sovrascritto, azzerato al logout). Best-effort.
  useEffect(() => {
    if (!token || !coords) return;
    api.updateLocation(token, coords.lat, coords.lon).catch(() => {});
  }, [token, coords]);

  // 2d) tap su una notifica push → apri il dettaglio della segnalazione.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const id = resp.notification.request.content.data?.report_id;
      if (id != null) router.push(`/report/${id}`);
    });
    return () => sub.remove();
  }, [router]);

  const applyEvent = useCallback((ev: SSEReportEvent) => {
    setReports((prev) => {
      const next = new Map(prev);
      if (ev.type === "removed") {
        const id = ev.report_id ?? ev.report?.id;
        if (id != null) next.delete(id);
      } else if (ev.report) {
        if (ev.report.status === "active") next.set(ev.report.id, ev.report);
        else next.delete(ev.report.id);
      }
      return next;
    });
  }, []);

  // 3) caricamento iniziale + sottoscrizione live
  const refresh = useCallback(async () => {
    if (!token || !coords) return;
    try {
      const list = await api.getNearby(token, coords.lat, coords.lon, DEFAULT_RADIUS_M);
      setReports(new Map(list.map((r) => [r.id, r])));
    } catch (e) {
      // silenzioso: lo stream/polling riconcilia comunque
    } finally {
      setLoading(false);
    }
  }, [token, coords]);

  useEffect(() => {
    if (!token || !coords) return;
    void refresh();
    subRef.current?.close();
    subRef.current = api.subscribeStream(
      token,
      coords.lat,
      coords.lon,
      DEFAULT_RADIUS_M,
      { onEvent: applyEvent },
    );
    return () => {
      subRef.current?.close();
      subRef.current = null;
    };
  }, [token, coords, refresh, applyEvent]);

  const region: Region | undefined = coords
    ? {
        latitude: coords.lat,
        longitude: coords.lon,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }
    : undefined;

  if (loading || !region) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Individuo la tua posizione…</Text>
      </View>
    );
  }

  const list = Array.from(reports.values());

  return (
    <View style={styles.flex}>
      <MapView style={styles.flex} initialRegion={region} showsUserLocation>
        <Circle
          center={{ latitude: coords!.lat, longitude: coords!.lon }}
          radius={DEFAULT_RADIUS_M}
          strokeColor="rgba(59,130,196,0.5)"
          fillColor="rgba(59,130,196,0.08)"
        />
        {list.map((r) => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat, longitude: r.lon }}
            pinColor={colorFor(r.category)}
            title={categories.find((c) => c.key === r.category)?.label ?? r.category}
            description={r.note ?? undefined}
            onCalloutPress={() => router.push(`/report/${r.id}`)}
          />
        ))}
      </MapView>

      <SafeAreaView style={styles.overlayTop} pointerEvents="box-none">
        <View style={styles.topBar} pointerEvents="box-none">
          <Text style={styles.counter}>{list.length} attive</Text>
          <Pressable onPress={signOut} style={styles.logout}>
            <Text style={styles.logoutText}>Esci</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      <Pressable
        style={styles.fab}
        onPress={() =>
          router.push({
            pathname: "/(app)/create",
            params: { lat: String(coords!.lat), lon: String(coords!.lon) },
          })
        }
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      {/* legenda countdown invisibile finché non c'è hover: il countdown vero
          è nel callout/dettaglio. Qui mostriamo solo il conteggio attive. */}
      {list.length > 0 && (
        <View style={styles.nextExpiry}>
          <Text style={styles.nextExpiryLabel}>Prossima scadenza tra </Text>
          <Countdown
            style={styles.nextExpiryValue}
            secondsLeft={Math.min(...list.map((r) => r.seconds_left))}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  muted: { color: "#666" },
  overlayTop: { position: "absolute", top: 0, left: 0, right: 0 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  counter: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    fontWeight: "700",
    overflow: "hidden",
  },
  logout: {
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logoutText: { color: "#E24B4A", fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 36,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#3B82C4",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontSize: 34, lineHeight: 38, fontWeight: "300" },
  nextExpiry: {
    position: "absolute",
    bottom: 44,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  nextExpiryLabel: { color: "#555", fontSize: 13 },
  nextExpiryValue: { fontWeight: "700", fontSize: 13 },
});
