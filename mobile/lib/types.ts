// Tipi allineati agli schemi Pydantic del backend (schemas.py).

export interface Category {
  key: string;
  label: string;
  color: string;
  ttl_minutes: number;
}

export interface Report {
  id: number;
  category: string;
  note: string | null;
  lat: number;
  lon: number;
  confirms: number;
  denials: number;
  status: "active" | "expired" | "removed";
  seconds_left: number;
  author_role?: string; // cittadino | volontario | operatore
  verified?: boolean; // true se l'autore è una fonte accreditata (PC)
  is_mine?: boolean; // valorizzato nel dettaglio: true se sono l'autore
}

export type Role = "cittadino" | "volontario" | "operatore";

export interface User {
  id: number;
  email: string;
  trust_score: number;
  role: Role;
}

export type Vote = 1 | -1;

// Motivi di segnalazione abuso (lista chiusa, allineata al backend).
export type FlagReason = "spam" | "offensivo" | "falso" | "altro";

export interface FlagResult {
  report_id: number;
  flags: number; // totale segnalazioni-abuso sulla segnalazione
  removed: boolean; // true se la soglia ha causato l'auto-rimozione
}

// Eventi SSE da /reports/stream.
export type SSEEventType = "created" | "updated" | "removed";

export interface SSEReportEvent {
  type: SSEEventType;
  report?: Report;
  report_id?: number;
}
