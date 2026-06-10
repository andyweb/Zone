// Crea segnalazione: scelta categoria (lista chiusa) → conferma punto sulla
// mappa (posizione attuale o pin trascinabile) → nota opzionale → invio.

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { MapPressEvent, Marker } from "react-native-maps";

import { CategoryPicker } from "../../components/CategoryPicker";
import { Disclaimer } from "../../components/Disclaimer";
import { Button } from "../../components/ui/Button";
import { GradientBackground } from "../../components/ui/GradientBackground";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { queueCreated } from "../../lib/pendingReport";
import { colors, font, radius, shadow, spacing } from "../../lib/theme";
import type { Category } from "../../lib/types";

const NOTE_MAX = 280;

export default function CreateReport() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();

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

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPoint({ lat: latitude, lon: longitude });
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.container}>
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
              Tocca la mappa o trascina il pin per spostare il punto.
            </Text>
            <View style={styles.mapBox}>
              <MapView
                style={styles.map}
                initialRegion={{
                  latitude: initialLat,
                  longitude: initialLon,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                onPress={onMapPress}
              >
                <Marker
                  coordinate={{ latitude: point.lat, longitude: point.lon }}
                  draggable
                  onDragEnd={(e) =>
                    setPoint({
                      lat: e.nativeEvent.coordinate.latitude,
                      lon: e.nativeEvent.coordinate.longitude,
                    })
                  }
                />
              </MapView>
            </View>
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

          <Button
            label="Invia segnalazione"
            icon="📍"
            onPress={submit}
            loading={busy}
            style={styles.submit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { padding: spacing.xl, gap: spacing.xl },
  section: { gap: spacing.sm },
  label: { fontSize: font.h3, fontWeight: "800", color: colors.text },
  hint: { color: colors.textMuted, fontSize: font.small },
  mapBox: {
    height: 240,
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.glassBorder,
    ...shadow.card,
  },
  map: { flex: 1 },
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
  submit: { marginTop: spacing.xs },
});
