// Selettore di posizione a tutto schermo: mappa libera (pan/zoom/tap/drag),
// anche per punti lontani. Conferma → deposita il punto e torna a "Crea".

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { MapPressEvent, Marker } from "react-native-maps";

import { Button } from "../../components/ui/Button";
import { setPickedLocation } from "../../lib/locationPicker";
import { colors, font, radius, shadow, spacing } from "../../lib/theme";

export default function PickLocation() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();

  const lat0 = params.lat ? parseFloat(params.lat) : 45.4642;
  const lon0 = params.lon ? parseFloat(params.lon) : 9.19;
  const [point, setPoint] = useState({ lat: lat0, lon: lon0 });

  const onMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPoint({ lat: latitude, lon: longitude });
  };

  const confirm = () => {
    setPickedLocation(point);
    router.back();
  };

  return (
    <View style={styles.flex}>
      <MapView
        style={styles.flex}
        initialRegion={{
          latitude: lat0,
          longitude: lon0,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onPress={onMapPress}
        showsUserLocation
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

      <View style={[styles.hint, { top: insets.top + spacing.md }]} pointerEvents="none">
        <Text style={styles.hintText}>
          Tocca o trascina il pin per scegliere il punto
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button label="Conferma punto" icon="📍" onPress={confirm} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hint: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    alignItems: "center",
  },
  hintText: {
    backgroundColor: "rgba(255,255,255,0.92)",
    color: colors.text,
    fontSize: font.small,
    fontWeight: "600",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    overflow: "hidden",
    ...shadow.card,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
