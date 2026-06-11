// Ponte per il selettore di posizione a tutto schermo: la mappa-picker
// deposita qui il punto scelto, la schermata "Crea" lo ritira al ritorno.

export interface PickedPoint {
  lat: number;
  lon: number;
}

let picked: PickedPoint | null = null;

export function setPickedLocation(p: PickedPoint): void {
  picked = p;
}

export function takePickedLocation(): PickedPoint | null {
  const p = picked;
  picked = null;
  return p;
}
