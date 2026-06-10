# Provare l'app su un telefono (giro completo)

Obiettivo: far girare **backend + app** insieme e verificare l'intero flusso
su un device reale (o emulatore): registrazione → mappa → crea → vota →
aggiornamento live via SSE.

Tempo stimato: ~15 minuti la prima volta.

---

## 0. Prerequisiti

- **Docker** + **Docker Compose** (per il backend).
- **Node.js 18+** e **npm** (per l'app).
- **Expo Go** installato sul telefono ([iOS](https://apps.apple.com/app/expo-go/id982107779)
  / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)).
- **Telefono e computer sulla stessa rete Wi-Fi.** Indispensabile: il telefono
  deve poter raggiungere il backend sul computer.

---

## 1. Avvia il backend

```bash
cd backend
cp .env.example .env

# Genera un JWT_SECRET robusto e mettilo nel .env (campo JWT_SECRET):
openssl rand -hex 32
```

> ⚠️ Modifica **solo** `JWT_SECRET` nel `.env`. Lascia le credenziali del DB
> ai valori di default (`app/app/segnalazioni`): il container Postgres usa
> quei default e devono combaciare con `DATABASE_URL`.

Poi, dalla **cartella radice** del progetto:

```bash
docker compose up --build
```

Al primo avvio scarica PostGIS, applica le migrazioni e avvia l'API.
Quando vedi `Application startup complete`, verifica da un altro terminale:

```bash
curl http://localhost:8000/health        # -> {"status":"ok"}
```

API su `:8000`, reverse proxy su `:8080`, docs interattive su
`http://localhost:8000/docs`.

---

## 2. Trova l'IP del computer sulla LAN

Il telefono non può usare `localhost` (quello è il telefono stesso): gli serve
l'indirizzo del computer sulla rete.

```bash
# macOS
ipconfig getifaddr en0          # Wi-Fi; prova en1 se vuoto

# Linux
hostname -I | awk '{print $1}'

# Windows (PowerShell)
ipconfig | findstr IPv4
```

Ottieni qualcosa tipo `192.168.1.42`. **Test rapido:** apri dal browser del
*telefono* `http://192.168.1.42:8000/health`. Se vedi `{"status":"ok"}`, sei a
posto. Se non carica → vedi [Problemi comuni](#problemi-comuni).

---

## 3. Configura e avvia l'app

```bash
cd mobile
npm install
cp .env.example .env
```

Nel `mobile/.env` imposta l'IP trovato:

```
EXPO_PUBLIC_API_URL=http://192.168.1.42:8000
```

Avvia Expo:

```bash
npm run start
```

Si apre un QR code. Aprilo con:
- **iOS:** app Fotocamera → tocca il banner Expo Go.
- **Android:** app Expo Go → "Scan QR code".

(In alternativa, premi `i` per il simulatore iOS o `a` per l'emulatore
Android se li hai installati.)

> 📍 **Mappa su Android:** i marker di `react-native-maps` su Android usano
> Google Maps e richiedono una API key in `app.json`
> (`android.config.googleMaps.apiKey`). Senza key la mappa può apparire
> grigia/vuota. Per la prima prova il percorso più semplice è **iOS** (usa
> Apple Maps, nessuna key). Su Android, [crea una key Maps SDK](https://docs.expo.dev/versions/latest/sdk/map-view/#deploy-app-with-google-maps)
> e incollala in `app.json`.

---

## 4. Il giro completo da provare

1. **Registrati** con un'email e una password (min 8 caratteri).
2. Accetta il **disclaimer** nell'onboarding.
3. Concedi il **permesso di posizione** quando richiesto. La mappa si centra
   su di te con il cerchio del raggio di ricerca.
4. Tocca il **+** in basso a destra → scegli una categoria → sistema il pin
   (tap o trascinamento) → scrivi una nota → **Invia**.
5. Torni alla mappa: dovresti vedere il **marker** appena creato, colorato per
   categoria.
6. Tocca il marker → apri il **dettaglio** → vedi conferme/smentite e il
   countdown del TTL.

### Vedere l'aggiornamento LIVE (SSE)

Il bello è vedere un cambiamento arrivare **senza ricaricare**. Dal computer,
simula un secondo utente che crea/vota vicino a te. Sostituisci `LAT`/`LON`
con la tua posizione (la leggi dal report appena creato in `/docs`, oppure usa
le coordinate che hai usato per il pin):

```bash
BASE=http://localhost:8000
# secondo utente
curl -s -X POST $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"tester2@example.com","password":"password123"}' >/dev/null
TOKEN=$(curl -s -X POST $BASE/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"tester2@example.com","password":"password123"}' \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')

# crea una segnalazione vicino a te -> appare sulla mappa in tempo reale
curl -s -X POST $BASE/reports -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"category":"incidente","note":"arrivata via SSE!","lat":LAT,"lon":LON}'
```

Sul telefono il nuovo marker deve comparire **da solo**. Se invece voti una
tua segnalazione esistente da un secondo account, vedrai il contatore
conferme/smentite aggiornarsi live nel dettaglio.

> Lo smoke test automatico `./scripts/smoke_test.sh` (dalla radice) fa lo
> stesso giro via curl, utile per validare il backend in isolamento.

---

## Problemi comuni

| Sintomo | Causa probabile / soluzione |
|---|---|
| **"Network request failed"** nell'app | L'IP è sbagliato, o telefono/PC non sono sulla stessa Wi-Fi, o un firewall blocca la :8000. Verifica aprendo `http://<IP>:8000/health` dal browser del telefono. Su macOS controlla che il firewall non blocchi Docker. |
| **Mappa grigia/vuota su Android** | Manca la Google Maps API key in `app.json`. Usa iOS per la prova rapida o aggiungi la key. |
| **La mappa non si centra / posizione assente (simulatore)** | Imposta una posizione fittizia: iOS Simulator → Features → Location → Custom; Android Emulator → ⋮ → Location. |
| **401 / "token non valido" dopo un po'** | Il JWT scade (default 24h). Esci e rientra. |
| **`docker compose` non parte sul DB** | La porta 5432 è già occupata da un Postgres locale. Ferma quello o cambia il mapping porta in `docker-compose.yml`. |
| **Expo: "Metro" non raggiungibile** | Telefono e PC su reti diverse (es. Wi-Fi ospiti). Stessa rete, oppure avvia con `npx expo start --tunnel`. |
| **I report creati via curl non si vedono** | Sono fuori dal raggio: le coordinate `LAT/LON` devono essere vicine alla tua posizione (entro ~1 km, il raggio di default). |

---

## Note

- Il client SSE (`mobile/lib/api.ts`) ha **fallback automatico a polling** di
  `/reports/nearby` ogni ~20s se lo stream non regge: anche senza realtime
  perfetto, la mappa si riconcilia.
- Le categorie (Incidente, Traffico, Lavori, Pericolo, Strada chiusa, Evento,
  Allerta meteo) si cambiano in `backend/app/categories.py` (un solo file).
- Per fermare tutto: `Ctrl-C` nel terminale di `docker compose` e in quello di
  Expo; poi `docker compose down` per liberare le risorse.
