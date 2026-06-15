// Dettaglio segnalazione: categoria, nota, tempo residuo.
// - Altri utenti: votano (Confermo / Non c'è più).
// - Autore: modifica la nota o elimina la segnalazione.

import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Countdown } from "../../components/Countdown";
import { Button } from "../../components/ui/Button";
import { GlassCard } from "../../components/ui/GlassCard";
import { GradientBackground } from "../../components/ui/GradientBackground";
import * as api from "../../lib/api";
import { ApiError } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { queueRemoved, queueUpdated } from "../../lib/pendingReport";
import { colors, font, radius, spacing } from "../../lib/theme";
import type { Category, FlagReason, Report } from "../../lib/types";

const NOTE_MAX = 280;

export default function ReportDetail() {
  const { token } = useAuth();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reportId = Number(id);

  const [report, setReport] = useState<Report | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const [editing, setEditing] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [flagging, setFlagging] = useState(false);

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
        Alert.alert("Grazie", "La segnalazione è stata rimossa dalla community.", [
          { text: "OK", onPress: () => router.back() },
        ]);
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Voto non riuscito";
      Alert.alert("Errore", msg);
    } finally {
      setVoting(false);
    }
  };

  const startEdit = () => {
    setNoteText(report?.note ?? "");
    setEditing(true);
  };

  const saveNote = async () => {
    if (!token || !report) return;
    setSaving(true);
    try {
      const updated = await api.updateReportNote(token, report.id, noteText.trim() || null);
      setReport(updated);
      setEditing(false);
      queueUpdated(updated); // la mappa rifletterà la nota aggiornata al ritorno
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Salvataggio non riuscito";
      Alert.alert("Errore", msg);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Eliminare la segnalazione?",
      "L'azione è definitiva: la segnalazione sparirà dalla mappa per tutti.",
      [
        { text: "Annulla", style: "cancel" },
        { text: "Elimina", style: "destructive", onPress: removeReport },
      ],
    );
  };

  const removeReport = async () => {
    if (!token || !report) return;
    setDeleting(true);
    try {
      await api.deleteReport(token, report.id);
      queueRemoved(report.id); // la mappa toglie subito il marker al ritorno
      router.back();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Eliminazione non riuscita";
      Alert.alert("Errore", msg);
      setDeleting(false);
    }
  };

  const reportAbuse = () => {
    Alert.alert("Segnala abuso", "Perché vuoi segnalare questa segnalazione?", [
      { text: "Spam o pubblicità", onPress: () => sendFlag("spam") },
      { text: "Contenuto offensivo", onPress: () => sendFlag("offensivo") },
      { text: "Falsa o fuorviante", onPress: () => sendFlag("falso") },
      { text: "Altro", onPress: () => sendFlag("altro") },
      { text: "Annulla", style: "cancel" },
    ]);
  };

  const sendFlag = async (reason: FlagReason) => {
    if (!token || !report) return;
    setFlagging(true);
    try {
      const res = await api.flagReport(token, report.id, reason);
      if (res.removed) {
        queueRemoved(report.id); // soglia raggiunta: via dalla mappa al ritorno
        Alert.alert(
          "Grazie",
          "La segnalazione è stata rimossa per le troppe segnalazioni ricevute.",
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else {
        Alert.alert("Grazie", "Segnalazione inviata: la esamineremo.");
      }
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : "Invio non riuscito";
      Alert.alert("Errore", msg);
    } finally {
      setFlagging(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground variant="soft">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }
  if (!report) return null;

  const active = report.status === "active";
  const mine = report.is_mine === true;
  const accent = category?.color ?? colors.textMuted;

  return (
    <GradientBackground variant="soft">
      <View style={styles.container}>
        <View style={styles.content}>
          <GlassCard strong>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={[styles.dot, { backgroundColor: accent }]} />
                <Text style={styles.category}>
                  {category?.label ?? report.category}
                </Text>
                {report.verified ? (
                  <View style={styles.verifiedPill}>
                    <Text style={styles.verifiedText}>✔ Verificata</Text>
                  </View>
                ) : null}
              </View>
              {active ? (
                <View style={styles.livePill}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              ) : null}
            </View>

            {editing ? (
              <View style={styles.editBox}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Aggiungi un dettaglio utile…"
                  placeholderTextColor={colors.textFaint}
                  value={noteText}
                  onChangeText={(t) => setNoteText(t.slice(0, NOTE_MAX))}
                  multiline
                  maxLength={NOTE_MAX}
                  autoFocus
                />
                <Text style={styles.counter}>
                  {noteText.length}/{NOTE_MAX}
                </Text>
                <View style={styles.editActions}>
                  <Button
                    label="Annulla"
                    variant="ghost"
                    onPress={() => setEditing(false)}
                    style={styles.editBtn}
                  />
                  <Button
                    label="Salva"
                    onPress={saveNote}
                    loading={saving}
                    style={styles.editBtn}
                  />
                </View>
              </View>
            ) : (
              <>
                {report.note ? (
                  <Text style={styles.note}>{report.note}</Text>
                ) : (
                  <Text style={styles.noteEmpty}>Nessuna nota.</Text>
                )}
                {active && mine ? (
                  <Pressable onPress={startEdit} style={styles.editLink}>
                    <Text style={styles.editLinkText}>✏️ Modifica nota</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </GlassCard>

          {api.photoUrl(report.photo_url) ? (
            <Image
              source={{ uri: api.photoUrl(report.photo_url)! }}
              style={styles.photo}
              resizeMode="cover"
            />
          ) : null}

          <View style={styles.row}>
            <Stat label="Conferme" value={report.confirms} color={colors.success} />
            <Stat label="Smentite" value={report.denials} color={colors.danger} />
          </View>

          {active ? (
            <GlassCard strong padded={false}>
              <View style={styles.ttlInner}>
                <Text style={styles.ttlLabel}>SCADE TRA</Text>
                <Countdown style={styles.ttlValue} secondsLeft={report.seconds_left} />
              </View>
            </GlassCard>
          ) : (
            <View style={styles.removedBox}>
              <Text style={styles.removed}>
                {report.status === "removed"
                  ? "Segnalazione rimossa dalla community."
                  : "Segnalazione scaduta."}
              </Text>
            </View>
          )}

          {active && !mine && !editing ? (
            <Pressable
              onPress={reportAbuse}
              disabled={flagging}
              style={styles.flagLink}
            >
              <Text style={styles.flagLinkText}>🚩 Segnala abuso</Text>
            </Pressable>
          ) : null}
        </View>

        {active && !editing && (
          <View style={styles.actions}>
            {mine ? (
              <Button
                label="Elimina segnalazione"
                icon="🗑️"
                variant="danger"
                onPress={confirmDelete}
                loading={deleting}
                style={styles.actionBtn}
              />
            ) : (
              <>
                <Button
                  label="Confermo"
                  icon="👍"
                  variant="success"
                  onPress={() => vote(1)}
                  disabled={voting}
                  style={styles.actionBtn}
                />
                <Button
                  label="Non c'è più"
                  icon="🚫"
                  variant="danger"
                  onPress={() => vote(-1)}
                  disabled={voting}
                  style={styles.actionBtn}
                />
              </>
            )}
          </View>
        )}
      </View>
    </GradientBackground>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <GlassCard strong style={styles.stat} padded={false}>
      <View style={styles.statInner}>
        <Text style={[styles.statValue, { color }]}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { flex: 1, padding: spacing.xl },
  content: { gap: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: { width: 16, height: 16, borderRadius: 8 },
  category: { fontSize: font.title, fontWeight: "800", color: colors.text },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
  liveText: {
    fontSize: font.tiny,
    fontWeight: "800",
    color: colors.success,
    letterSpacing: 0.5,
  },
  note: { fontSize: font.body, lineHeight: 23, color: colors.text },
  noteEmpty: { fontSize: font.small, color: colors.textFaint, fontStyle: "italic" },
  editLink: { marginTop: spacing.md, alignSelf: "flex-start" },
  editLinkText: { color: colors.primary, fontWeight: "700", fontSize: font.small },
  editBox: { gap: spacing.sm },
  noteInput: {
    backgroundColor: colors.glassInput,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.glassBorder,
    padding: spacing.lg,
    minHeight: 90,
    textAlignVertical: "top",
    fontSize: font.body,
    color: colors.text,
  },
  counter: { alignSelf: "flex-end", color: colors.textMuted, fontSize: font.tiny },
  editActions: { flexDirection: "row", gap: spacing.md },
  editBtn: { flex: 1 },
  photo: {
    width: "100%",
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.glassInput,
  },
  row: { flexDirection: "row", gap: spacing.lg },
  stat: { flex: 1 },
  statInner: { paddingVertical: spacing.xl, alignItems: "center" },
  statValue: { fontSize: 32, fontWeight: "800" },
  statLabel: { color: colors.textMuted, marginTop: 2, fontSize: font.small },
  ttlInner: { padding: spacing.xl, alignItems: "center", gap: spacing.xs },
  ttlLabel: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: font.tiny,
    letterSpacing: 1,
  },
  ttlValue: { fontSize: 30, fontWeight: "800", color: colors.primaryDark },
  removedBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
  },
  removed: { color: colors.danger, fontWeight: "700", fontSize: font.body },
  flagLink: { alignSelf: "center", paddingVertical: spacing.sm },
  flagLinkText: { color: colors.textMuted, fontWeight: "700", fontSize: font.small },
  verifiedPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  verifiedText: {
    fontSize: font.tiny,
    fontWeight: "800",
    color: colors.success,
    letterSpacing: 0.3,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: "auto",
    paddingTop: spacing.lg,
  },
  actionBtn: { flex: 1 },
});
