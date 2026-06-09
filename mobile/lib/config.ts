// Configurazione client. L'URL del backend viene da EXPO_PUBLIC_API_URL
// (vedi .env.example). Default localhost per lo sviluppo su simulatore.

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

// Raggio di ricerca di default (metri) e fallback polling.
export const DEFAULT_RADIUS_M = 1000;

// Fallback documentato dal brief: se l'SSE non è disponibile, il client fa
// polling di /reports/nearby a questo intervallo.
export const POLL_INTERVAL_MS = 20_000;
