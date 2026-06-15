// Client REST + SSE verso il backend FastAPI.
//
// REST: wrapper su fetch con header Authorization Bearer.
// SSE: subscribeStream() apre /reports/stream (react-native-sse) e, in caso
// di errore, espone un fallback a polling di /reports/nearby (vedi config).

import EventSource from "react-native-sse";

import { API_URL, POLL_INTERVAL_MS } from "./config";
import type {
  Category,
  FlagReason,
  FlagResult,
  Report,
  SSEEventType,
  SSEReportEvent,
  User,
  Vote,
} from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data?.detail ?? detail;
    } catch {
      // corpo non JSON
    }
    throw new ApiError(res.status, typeof detail === "string" ? detail : "Errore");
  }
  // 204 No Content
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// --- Auth ---
export function register(email: string, password: string): Promise<User> {
  return request<User>("/auth/register", {
    method: "POST",
    body: { email, password },
  });
}

export async function login(email: string, password: string): Promise<string> {
  const data = await request<{ access_token: string }>("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  return data.access_token;
}

// --- Categorie / Reports ---
export function getCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export function createReport(
  token: string,
  input: { category: string; note?: string | null; lat: number; lon: number },
): Promise<Report> {
  return request<Report>("/reports", { method: "POST", body: input, token });
}

export function getNearby(
  token: string,
  lat: number,
  lon: number,
  radiusM: number,
): Promise<Report[]> {
  const q = `lat=${lat}&lon=${lon}&radius_m=${Math.round(radiusM)}`;
  return request<Report[]>(`/reports/nearby?${q}`, { token });
}

export function getReport(token: string, reportId: number): Promise<Report> {
  return request<Report>(`/reports/${reportId}`, { token });
}

export function voteReport(
  token: string,
  reportId: number,
  vote: Vote,
): Promise<Report> {
  return request<Report>(`/reports/${reportId}/vote`, {
    method: "POST",
    body: { vote },
    token,
  });
}

// Modifica della nota (solo autore). Categoria/posizione/voti/TTL invariati.
export function updateReportNote(
  token: string,
  reportId: number,
  note: string | null,
): Promise<Report> {
  return request<Report>(`/reports/${reportId}`, {
    method: "PATCH",
    body: { note },
    token,
  });
}

// Eliminazione definitiva (solo autore).
export function deleteReport(token: string, reportId: number): Promise<void> {
  return request<void>(`/reports/${reportId}`, { method: "DELETE", token });
}

// Segnala un abuso su una segnalazione altrui (moderazione community).
export function flagReport(
  token: string,
  reportId: number,
  reason: FlagReason,
): Promise<FlagResult> {
  return request<FlagResult>(`/reports/${reportId}/flag`, {
    method: "POST",
    body: { reason },
    token,
  });
}

// Cancella l'account e tutti i dati collegati (diritto all'oblio, GDPR).
export function deleteAccount(token: string): Promise<void> {
  return request<void>("/users/me", { method: "DELETE", token });
}

export function setPushToken(token: string, expoPushToken: string): Promise<User> {
  return request<User>("/users/push-token", {
    method: "PUT",
    body: { expo_push_token: expoPushToken },
    token,
  });
}

// Disattiva le push e azzera l'ultima posizione nota (es. al logout).
export function clearPushToken(token: string): Promise<void> {
  return request<void>("/users/push-token", { method: "DELETE", token });
}

// Aggiorna l'ultima posizione nota lato server (solo per filtrare le push).
export function updateLocation(
  token: string,
  lat: number,
  lon: number,
): Promise<void> {
  return request<void>("/users/location", {
    method: "PUT",
    body: { lat, lon },
    token,
  });
}

// --- Realtime (SSE) con fallback polling ---
export interface StreamHandlers {
  onEvent: (event: SSEReportEvent) => void;
  onError?: (err: unknown) => void;
}

export interface StreamSubscription {
  close: () => void;
}

/**
 * Apre lo stream SSE per l'area indicata. Se la connessione fallisce,
 * passa automaticamente al polling di /reports/nearby ogni POLL_INTERVAL_MS,
 * emettendo eventi sintetici "created"/"updated"/"removed" per riconciliare
 * lo stato lato client (fallback documentato dal brief).
 */
export function subscribeStream(
  token: string,
  lat: number,
  lon: number,
  radiusM: number,
  handlers: StreamHandlers,
): StreamSubscription {
  const url =
    `${API_URL}/reports/stream?lat=${lat}&lon=${lon}` +
    `&radius_m=${Math.round(radiusM)}&token=${encodeURIComponent(token)}`;

  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let known = new Map<number, Report>();
  let closed = false;

  const startPolling = () => {
    if (pollTimer || closed) return;
    const tick = async () => {
      try {
        const reports = await getNearby(token, lat, lon, radiusM);
        const next = new Map(reports.map((r) => [r.id, r]));
        // nuovi / aggiornati
        for (const r of reports) {
          const prev = known.get(r.id);
          if (!prev) handlers.onEvent({ type: "created", report: r });
          else if (
            prev.confirms !== r.confirms ||
            prev.denials !== r.denials ||
            prev.seconds_left !== r.seconds_left
          ) {
            handlers.onEvent({ type: "updated", report: r });
          }
        }
        // rimossi (non più presenti)
        for (const id of known.keys()) {
          if (!next.has(id)) handlers.onEvent({ type: "removed", report_id: id });
        }
        known = next;
      } catch (err) {
        handlers.onError?.(err);
      }
    };
    void tick();
    pollTimer = setInterval(tick, POLL_INTERVAL_MS);
  };

  const es = new EventSource<SSEEventType>(url, { pollingInterval: 0 });

  const forward = (type: SSEEventType) => (event: any) => {
    try {
      const data: SSEReportEvent = JSON.parse(event.data);
      if (data.report) known.set(data.report.id, data.report);
      if (type === "removed" && data.report_id != null) known.delete(data.report_id);
      handlers.onEvent(data);
    } catch (err) {
      handlers.onError?.(err);
    }
  };

  es.addEventListener("created", forward("created"));
  es.addEventListener("updated", forward("updated"));
  es.addEventListener("removed", forward("removed"));
  es.addEventListener("error", (e) => {
    handlers.onError?.(e);
    // fallback: se l'SSE non regge, passa al polling
    startPolling();
  });

  return {
    close: () => {
      closed = true;
      es.removeAllEventListeners();
      es.close();
      if (pollTimer) clearInterval(pollTimer);
    },
  };
}
