// Crea segnalazione: scelta categoria (lista chiusa) → conferma punto sulla
// mappa (posizione attuale o pin trascinabile) → nota opzionale → invio.

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker, MapPressEvent } from "react-native-maps";

import { CategoryPicker } from "../../components/CategoryPicker";
import { Disclaimer } from "../../components/Disclaimer";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
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
      await api.createReport(token, {
        category,
        note: note.trim() || null,
        lat: point.lat,
        lon: point.lon,
      });
      router.back();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Invio non riuscito";
      Alert.alert("Errore", msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.label}>Categoria</Text>
        <CategoryPicker
          categories={categories}
          selected={category}
          onSelect={setCategory}
        />

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

        <Text style={styles.label}>Nota (opzionale)</Text>
        <TextInput
          style={styles.note}
          placeholder="Aggiungi un dettaglio utile…"
          value={note}
          onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))}
          multiline
          maxLength={NOTE_MAX}
        />
        <Text style={styles.counter}>
          {note.length}/{NOTE_MAX}
        </Text>

        <Disclaimer compact />

        <Pressable
          style={[styles.button, busy && { opacity: 0.6 }]}
          onPress={submit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Invia segnalazione</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#fff" },
  container: { padding: 18, gap: 10 },
  label: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  hint: { color: "#777", fontSize: 13 },
  mapBox: { height: 240, borderRadius: 12, overflow: "hidden" },
  map: { flex: 1 },
  note: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 15,
  },
  counter: { alignSelf: "flex-end", color: "#999", fontSize: 12 },
  button: {
    backgroundColor: "#3B82C4",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
