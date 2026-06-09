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
}

export interface User {
  id: number;
  email: string;
  trust_score: number;
}

export type Vote = 1 | -1;

// Eventi SSE da /reports/stream.
export type SSEEventType = "created" | "updated" | "removed";

export interface SSEReportEvent {
  type: SSEEventType;
  report?: Report;
  report_id?: number;
}
