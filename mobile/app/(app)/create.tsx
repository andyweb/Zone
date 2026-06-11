// Crea segnalazione: scelta categoria (lista chiusa) → scelta punto sulla mappa
// (anteprima → selettore a tutto schermo) → nota opzionale → invio.

import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";

import { CategoryPicker } from "../../components/CategoryPicker";
import { Disclaimer } from "../../components/Disclaimer";
import { Button } from "../../components/ui/Button";
import { GradientBackground } from "../../components/ui/GradientBackground";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { takePickedLocation } from "../../lib/locationPicker";
import { queueCreated } from "../../lib/pendingReport";
import { colors, font, radius, shadow, spacing } from "../../lib/theme";
import type { Category } from "../../lib/types";

const NOTE_MAX = 280;

export default function CreateReport() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();
  const insets = useSafeAreaInsets();

  const initialLat = params.lat ? parseFloat(params.lat) : 45.4642;
  const initialLon = params.lon ? parseFloat(params.lon) : 9.19;

  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [point, setPoint] = useState({ lat: initialLat, lon: initialLon });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  // Al ritorno dal selettore a tutto schermo: applica il punto scelto.
  useFocusEffect(
    useCallback(() => {
      const picked = takePickedLocation();
      if (picked) setPoint(picked);
    }, []),
  );

  const openPicker = () => {
    router.push({
      pathname: "/(app)/pick-location",
      params: { lat: String(point.lat), lon: String(point.lon) },
    });
  };

  const submit = async () => {
    if (!token) return;
    if (!category) {
      Alert.alert("Categoria mancante", "Scegli una categoria.");
      return;
    }
    setBusy(true);
    try {
      const created = await api.createReport(token, {
        category,
        note: note.trim() || null,
        lat: point.lat,
        lon: point.lon,
      });
      // Deposita la segnalazione: la mappa la mostra subito al ritorno.
      queueCreated(created);
      router.back();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Invio non riuscito";
      Alert.alert("Errore", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <GradientBackground variant="soft">
      {/* Barra superiore: maniglia (trascina per chiudere) + titolo */}
      <View style={styles.topBar}>
        <View style={styles.grabber} />
        <Text style={styles.title}>Nuova segnalazione</Text>
        <Text style={styles.subtitle}>Segnala cosa succede qui intorno</Text>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Categoria</Text>
          <CategoryPicker
            categories={categories}
            selected={category}
            onSelect={setCategory}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Punto sulla mappa</Text>
          <Text style={styles.hint}>
            Tocca l'anteprima per scegliere il punto sulla mappa.
          </Text>
          <Pressable style={styles.mapBox} onPress={openPicker}>
            <MapView
              style={styles.map}
              pointerEvents="none"
              region={{
                latitude: point.lat,
                longitude: point.lon,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={{ latitude: point.lat, longitude: point.lon }} />
            </MapView>
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>Tocca per scegliere</Text>
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Nota (opzionale)</Text>
          <TextInput
            style={styles.note}
            placeholder="Aggiungi un dettaglio utile…"
            placeholderTextColor={colors.textFaint}
            value={note}
            onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))}
            multiline
            maxLength={NOTE_MAX}
          />
          <Text style={styles.counter}>
            {note.length}/{NOTE_MAX}
          </Text>
        </View>

        <Disclaimer compact />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label="Invia segnalazione"
          icon="📍"
          onPress={submit}
          loading={busy}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(15,23,41,0.18)",
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: font.title,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: font.small,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: "center",
  },
  container: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing.xxxl },
  section: { gap: spacing.sm },
  label: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  hint: { color: colors.textMuted, fontSize: font.small },
  mapBox: {
    height: 220,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  map: { flex: 1 },
  mapOverlay: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadow.card,
  },
  mapOverlayText: { color: colors.primary, fontWeight: "700", fontSize: font.small },
  note: {
    backgroundColor: colors.glassInput,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    minHeight: 96,
    textAlignVertical: "top",
    fontSize: font.body,
    color: colors.text,
  },
  counter: {
    alignSelf: "flex-end",
    color: colors.textMuted,
    fontSize: font.tiny,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
