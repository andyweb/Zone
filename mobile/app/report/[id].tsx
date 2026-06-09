// Dettaglio segnalazione: categoria, nota, tempo residuo, pulsanti
// "Confermo" / "Non c'è più" (voto +1 / -1).

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Countdown } from "../../components/Countdown";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import type { Category, Report } from "../../lib/types";

export default function ReportDetail() {
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = Number(id);

  const [report, setReport] = useState<Report | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    if (!token || Number.isNaN(reportId)) return;
    (async () => {
      try {
        const r = await api.getReport(token, reportId);
        setReport(r);
        const cats = await api.getCategories();
        setCategory(cats.find((c) => c.key === r.category) ?? null);
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : "Caricamento non riuscito";
        Alert.alert("Errore", msg, [{ text: "OK", onPress: () => router.back() }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, reportId]);

  const vote = async (value: 1 | -1) => {
    if (!token || !report) return;
    setVoting(true);
    try {
      const updated = await api.voteReport(token, report.id, value);
      setReport(updated);
      if (updated.status !== "active") {
        Alert.alert(
          "Grazie",
          "La segnalazione è stata rimossa dalla community.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Voto non riuscito";
      Alert.alert("Errore", msg);
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!report) return null;

  const active = report.status === "active";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View
          style={[styles.dot, { backgroundColor: category?.color ?? "#888" }]}
        />
        <Text style={styles.category}>{category?.label ?? report.category}</Text>
      </View>

      {report.note ? (
        <Text style={styles.note}>{report.note}</Text>
      ) : (
        <Text style={styles.noteEmpty}>Nessuna nota.</Text>
      )}

      <View style={styles.row}>
        <Stat label="Conferme" value={report.confirms} color="#2E9E5B" />
        <Stat label="Smentite" value={report.denials} color="#E24B4A" />
      </View>

      {active ? (
        <View style={styles.ttlBox}>
          <Text style={styles.ttlLabel}>Scade tra</Text>
          <Countdown style={styles.ttlValue} secondsLeft={report.seconds_left} />
        </View>
      ) : (
        <Text style={styles.removed}>
          {report.status === "removed"
            ? "Segnalazione rimossa dalla community."
            : "Segnalazione scaduta."}
        </Text>
      )}

      {active && (
        <View style={styles.actions}>
          <Pressable
            style={[styles.btn, styles.confirm, voting && styles.disabled]}
            onPress={() => vote(1)}
            disabled={voting}
          >
            <Text style={styles.btnText}>👍 Confermo</Text>
          </Pressable>
          <Pressable
            style={[styles.btn, styles.deny, voting && styles.disabled]}
            onPress={() => vote(-1)}
            disabled={voting}
          >
            <Text style={styles.btnText}>🚫 Non c'è più</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, backgroundColor: "#fff", padding: 22, gap: 18 },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 16, height: 16, borderRadius: 8 },
  category: { fontSize: 22, fontWeight: "800" },
  note: { fontSize: 16, lineHeight: 23, color: "#222" },
  noteEmpty: { fontSize: 15, color: "#999", fontStyle: "italic" },
  row: { flexDirection: "row", gap: 16 },
  stat: {
    flex: 1,
    backgroundColor: "#F5F6F8",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  statValue: { fontSize: 28, fontWeight: "800" },
  statLabel: { color: "#666", marginTop: 2 },
  ttlBox: {
    backgroundColor: "#EAF3FB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  ttlLabel: { color: "#3B82C4", fontWeight: "600" },
  ttlValue: { fontSize: 24, fontWeight: "800", color: "#1f5e8f", marginTop: 4 },
  removed: { color: "#E24B4A", fontWeight: "600", fontSize: 16 },
  actions: { flexDirection: "row", gap: 14, marginTop: "auto" },
  btn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  confirm: { backgroundColor: "#2E9E5B" },
  deny: { backgroundColor: "#E24B4A" },
  disabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
