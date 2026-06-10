// Ponte leggero tra le schermate di azione (Crea / Dettaglio) e la Mappa.
// Le modifiche appena fatte vengono accodate qui e applicate dalla mappa al
// ritorno (inserimento/aggiornamento/rimozione ottimistici), senza aspettare
// l'evento SSE / il polling. Porta anche il messaggio del banner di conferma.

import type { Report } from "./types";

interface Pending {
  upserts: Report[]; // segnalazioni da inserire/aggiornare
  removedIds: number[]; // id da rimuovere
  banner: string | null; // messaggio di conferma (null = nessun banner)
}

let state: Pending = { upserts: [], removedIds: [], banner: null };

export function queueCreated(report: Report): void {
  state.upserts.push(report);
  state.banner = "✓ Segnalazione inviata";
}

export function queueUpdated(report: Report): void {
  state.upserts.push(report); // aggiornamento silenzioso (es. modifica nota)
}

export function queueRemoved(id: number): void {
  state.removedIds.push(id);
  state.banner = "✓ Segnalazione eliminata";
}

export function takePending(): Pending {
  const s = state;
  state = { upserts: [], removedIds: [], banner: null };
  return s;
}
