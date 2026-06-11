// Elenco delle segnalazioni attive vicine. Tap su una riga → dettaglio.
// Le segnalazioni dell'utente (is_mine) mostrano un cestino per eliminarle.

import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Countdown } from "../../components/Countdown";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { DEFAULT_RADIUS_M } from "../../lib/config";
import { queueRemoved } from "../../lib/pendingReport";
import { colors, font, radius, shadow, spacing } from "../../lib/theme";
import type { Category, Report } from "../../lib/types";

export default function ActiveList() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams<{ lat?: string; lon?: string }>();
  const lat = params.lat ? parseFloat(params.lat) : 45.4642;
  const lon = params.lon ? parseFloat(params.lon) : 9.19;

  const [items, setItems] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const catFor = useMemo(() => {
    const m = new Map(categories.map((c) => [c.key, c]));
    return (key: string) => m.get(key);
  }, [categories]);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [list, cats] = await Promise.all([
        api.getNearby(token, lat, lon, DEFAULT_RADIUS_M),
        api.getCategories(),
      ]);
      setItems(list);
      setCategories(cats);
    } catch {
      // silenzioso
    } finally {
      setLoading(false);
    }
  }, [token, lat, lon]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = (item: Report) => {
    Alert.alert(
      "Eliminare la segnalazione?",
      "L'azione è definitiva: sparirà dalla mappa per tutti.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: () => doDelete(item.id),
        },
      ],
    );
  };

  const doDelete = async (id: number) => {
    if (!token) return;
    try {
      await api.deleteReport(token, id);
      setItems((prev) => prev.filter((r) => r.id !== id));
      queueRemoved(id); // la mappa toglie il marker al ritorno
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Eliminazione non riuscita";
      Alert.alert("Errore", msg);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(r) => String(r.id)}
      ListEmptyComponent={
        <Text style={styles.empty}>Nessuna segnalazione attiva qui intorno.</Text>
      }
      renderItem={({ item }) => {
        const cat = catFor(item.category);
        return (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/report/${item.id}`)}
          >
            <View style={[styles.dot, { backgroundColor: cat?.color ?? colors.textMuted }]} />
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{cat?.label ?? item.category}</Text>
              <Text style={styles.rowNote} numberOfLines={1}>
                {item.note || "Nessuna nota"}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Countdown style={styles.ttl} secondsLeft={item.seconds_left} />
              <View style={styles.stats}>
                <Text style={styles.statOk}>👍 {item.confirms}</Text>
                <Text style={styles.statNo}>🚫 {item.denials}</Text>
              </View>
            </View>
            {item.is_mine ? (
              <Pressable
                style={styles.trash}
                hitSlop={10}
                onPress={() => confirmDelete(item)}
              >
                <Feather name="trash-2" size={20} color={colors.danger} />
              </Pressable>
            ) : (
              <Feather name="chevron-right" size={20} color={colors.textFaint} />
            )}
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg,
  },
  list: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  empty: {
    textAlign: "center",
    color: colors.textMuted,
    marginTop: spacing.xxxl,
    fontSize: font.body,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow.card,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: font.h3, fontWeight: "700", color: colors.text },
  rowNote: { fontSize: font.small, color: colors.textMuted },
  rowRight: { alignItems: "flex-end", gap: 4 },
  ttl: { fontSize: font.small, fontWeight: "700", color: colors.primaryDark },
  stats: { flexDirection: "row", gap: spacing.sm },
  statOk: { fontSize: font.tiny, color: colors.success },
  statNo: { fontSize: font.tiny, color: colors.danger },
  trash: { padding: spacing.xs },
});
