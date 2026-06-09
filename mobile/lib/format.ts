// Utility di formattazione condivise.

/** Formatta i secondi residui come "1h 23m" o "12m 05s". */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  return `${m}m ${sec.toString().padStart(2, "0")}s`;
}
