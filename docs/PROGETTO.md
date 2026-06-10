# Zone — Segnalazioni Live geolocalizzate

Documento unico di progetto: cos'è, com'è fatto, cosa fa, dove gira.

---

## 1. Cos'è

App di **segnalazioni geolocalizzate "live"**: gli utenti creano segnalazioni
(un punto sulla mappa + una categoria + nota opzionale), le vedono sulla mappa
nelle vicinanze, le **confermano** o **smentiscono**, e ogni segnalazione
**nasce, vive un TTL e scade**. La mappa è sempre aggiornata in tempo reale —
nessun archivio statico: ciò che non è più confermato sparisce.

Concetti chiave:
- **Live / TTL**: ogni segnalazione ha una scadenza dinamica; i voti la
  allungano o accorciano.
- **Crowd validation**: conferme/smentite pesate per la reputazione del votante.
- **Realtime**: la mappa si aggiorna da sola via Server-Sent Events (SSE).
- **Geo-first**: tutto ruota attorno a posizione e raggio (PostGIS).
- **Privacy by design**: dati minimizzati, posizione facoltativa e sovrascritta,
  retention con cancellazione automatica.

---

## 2. Architettura (produzione attuale)

```
  iPhone (app via TestFlight)
        │  HTTPS
        ▼
  zone.delibra.info ──► Cloudflare (HTTPS, edge)
        │  Cloudflare Tunnel (cloudflared, tunnel "delibra")
        ▼
   DGX "spark-94e2" (ARM64, Linux)
        │  Docker Compose
        ├── proxy  (nginx)      127.0.0.1:18080 → :80   [SSE-friendly]
        ├── api    (FastAPI)    127.0.0.1:18000 → :8000
        └── db     (PostGIS)    interno alla rete compose
```

- Il backend gira **sulla DGX** in Docker, esposto su `https://zone.delibra.info`
  tramite **Cloudflare Tunnel** (nessuna porta aperta sul firewall, HTTPS
  automatico). Il tunnel `delibra` serve anche altri host (es. `api.delibra.info`
  = altro servizio); Zone è aggiunto come regola di ingress dedicata.
- Le porte locali sono legate a `127.0.0.1` (`docker-compose.dgx.yml`): solo
  `cloudflared` sullo stesso host le raggiunge.
- L'app iPhone è distribuita via **TestFlight** e punta a `https://zone.delibra.info`,
  quindi funziona **ovunque** (anche rete dati), indipendente da qualsiasi Mac.

> Sviluppo locale: lo stesso stack gira sul Mac con `docker compose up` e l'app
> via Expo Go / EAS puntando all'IP LAN. Vedi §10.

---

## 3. Stack tecnologico

### Backend
| Livello     | Tecnologia                                  | Versione |
|-------------|---------------------------------------------|----------|
| Linguaggio  | Python                                      | 3.12     |
| Web framework | FastAPI (async)                           | 0.115    |
| ASGI server | Uvicorn                                     | 0.34     |
| Database    | PostgreSQL + PostGIS                         | 16 / 3.4 |
| ORM         | SQLAlchemy 2.x async + GeoAlchemy2          | 2.0 / 0.16 |
| Driver DB   | asyncpg                                      | 0.30     |
| Migrazioni  | Alembic (async)                              | 1.14     |
| Validazione | Pydantic + pydantic-settings                 | 2.10     |
| Auth        | PyJWT + bcrypt                               | 2.10 / 4.2 |
| Scheduler   | APScheduler (scadenza + retention)           | 3.11     |
| Realtime    | Server-Sent Events + broker in-memory        | —        |
| HTTP client | httpx (push Expo)                            | 0.28     |
| Test        | pytest + pytest-asyncio                      | 8.3      |

### Mobile
| Livello       | Tecnologia                | Versione |
|---------------|---------------------------|----------|
| Framework     | React Native + Expo (SDK) | RN 0.81 / SDK 54 |
| Linguaggio    | TypeScript                | 5.x      |
| UI runtime    | React                     | 19.1     |
| Routing       | expo-router               | 6.x      |
| Mappa         | react-native-maps         | 1.20     |
| Posizione     | expo-location             | 19.x     |
| Notifiche     | expo-notifications        | 0.32     |
| Storage sicuro| expo-secure-store (JWT)   | 15.x     |
| SSE client    | react-native-sse          | 1.2      |
| Build/deploy  | EAS Build + TestFlight    | —        |

### Infrastruttura
- **Docker Compose** (api + db PostGIS + proxy nginx).
- **Cloudflare Tunnel** (`cloudflared`) per l'esposizione HTTPS.
- **DGX** (ARM64) come host di produzione → immagine PostGIS arm64
  (`imresamu/postgis`).

---

## 4. Funzionalità

- **Registrazione / login** email+password → JWT.
- **Onboarding** con **disclaimer** (l'app non sostituisce le autorità / 112-113-115).
- **Mappa** centrata sulla posizione utente, con cerchio del raggio di ricerca,
  **marker colorati per categoria** e **countdown del TTL** su ciascuno.
- **Creazione segnalazione**: scelta categoria (lista chiusa), pin
  trascinabile/tap per posizionare, nota libera (≤280 char), invio.
- **Dettaglio** segnalazione: conferme/smentite, countdown, voto
  ("confermo" / "non c'è più").
- **Voto**: +1 conferma / −1 smentita (uno per utente per segnalazione; non si
  vota la propria).
- **Aggiornamenti live**: nuove segnalazioni / voti / rimozioni arrivano in
  tempo reale via SSE, con **fallback automatico a polling** (~20s).
- **Push geolocalizzate** (dietro flag): notifica gli utenti vicini quando nasce
  una segnalazione nel loro raggio; il tap apre il dettaglio.
- **Scadenza automatica** e **retention**: le segnalazioni scadute/rimosse
  vengono cancellate definitivamente dopo una finestra (default 24h).

---

## 5. Modello dati

**users**
| Campo | Tipo | Note |
|---|---|---|
| id | bigint PK | |
| email | varchar(255) unique | |
| password_hash | varchar(255) | bcrypt |
| created_at | timestamptz | |
| trust_score | numeric (def 1.0) | reputazione: pesa i voti |
| expo_push_token | varchar(255) null | per le push |
| last_location | geography(Point,4326) null | **solo** filtro push, sovrascritta |
| last_location_at | timestamptz null | freschezza posizione |

**reports**
| Campo | Tipo | Note |
|---|---|---|
| id | bigint PK | |
| user_id | bigint FK→users | autore |
| category | varchar(40) | chiave da lista chiusa |
| note | varchar(280) null | testo libero |
| geom | geography(Point,4326) | posizione (GIST index) |
| created_at | timestamptz | |
| expires_at | timestamptz | **cuore del "live"** |
| confirms / denials | int | contatori voto |
| status | varchar(12) | `active` \| `expired` \| `removed` |

Indici: `(status, expires_at)` per le query attive, GIST su `geom` per le
query spaziali.

**report_votes**
| Campo | Tipo | Note |
|---|---|---|
| report_id | bigint FK→reports (ON DELETE CASCADE) | PK composta |
| user_id | bigint FK→users | PK composta → 1 voto/utente |
| vote | smallint | +1 / −1 |
| created_at | timestamptz | |

---

## 6. API REST

Base: `https://zone.delibra.info` (prod) — auth via header
`Authorization: Bearer <jwt>`. Docs interattive su `/docs`.

| Metodo | Endpoint | Descrizione |
|--------|----------|-------------|
| POST | `/auth/register` | Registrazione email/password |
| POST | `/auth/login` | Login → JWT |
| GET | `/categories` | Lista chiusa categorie (chiave, label, colore, TTL) |
| POST | `/reports` | Crea segnalazione (`category, note?, lat, lon`) |
| GET | `/reports/nearby` | Segnalazioni attive (`lat, lon, radius_m`) |
| GET | `/reports/{id}` | Dettaglio (deep link) |
| POST | `/reports/{id}/vote` | Vota (`+1` / `-1`) |
| GET | `/reports/stream` | SSE: `created` / `updated` / `removed` |
| PUT | `/users/push-token` | Registra Expo push token |
| DELETE | `/users/push-token` | Disattiva push + azzera posizione (logout) |
| PUT | `/users/location` | Aggiorna ultima posizione (solo filtro push) |
| GET | `/health` | Healthcheck → `{"status":"ok"}` |

### SSE — `/reports/stream`
```
GET /reports/stream?lat=&lon=&radius_m=&token=<jwt>
```
Tiene la connessione aperta e invia solo gli eventi che cadono nel raggio del
subscriber. Il token può arrivare via header o via query `token` (per
`EventSource`). **Broker pub/sub in-memory** con filtro geografico
(`app/broker.py`): lo stato vive nel processo → per multi-istanza si sostituisce
con Redis o Postgres LISTEN/NOTIFY mantenendo l'interfaccia `publish/subscribe`.

---

## 7. Logiche di business

Tutti i parametri sono centralizzati in `backend/app/config.py` (nessun valore
magico nel codice).

- **TTL dinamico**: alla creazione `expires_at = now() + ttl_base(category)`.
  Ogni conferma estende (`+30 min` base), ogni smentita accorcia (`−45 min`
  base); il delta è pesato per il `trust_score` del votante e **clampato** tra
  `ttl_floor` (15 min) e `ttl_ceiling` (12 h).
- **Anti-abuso**:
  - rimozione automatica quando `denials >= 3` **e** `denials > confirms`;
  - rate limit: max 5 segnalazioni/ora per utente;
  - anti-spam di prossimità: stessa categoria entro 100 m e 30 min → bloccata;
  - un voto per utente per segnalazione; non si vota la propria.
- **Job di scadenza** (APScheduler, ogni 5 min): marca `expired` le attive
  scadute ed emette l'evento SSE `removed`. Le letture filtrano comunque per
  `status='active' AND expires_at > now()`.
- **Retention / GDPR** (job ogni 60 min): **cancella definitivamente** i report
  `expired`/`removed` più vecchi di 24h; i voti spariscono per `ON DELETE
  CASCADE`. Minimizzazione dei dati.
- **Push geolocalizzate** (dietro `PUSH_ENABLED`): alla creazione notifica via
  Expo **solo** gli utenti la cui ultima posizione è entro `PUSH_RADIUS_M`
  (1500 m) ed è recente (≤60 min); l'autore è escluso. La posizione è un
  **singolo punto sovrascritto**, facoltativa, azzerata al logout.

---

## 8. App mobile — struttura

```
mobile/
  app/
    _layout.tsx          # root: provider auth, router
    index.tsx            # redirect iniziale (auth/onboarding/mappa)
    onboarding.tsx       # disclaimer
    (auth)/login.tsx     # login + registrazione
    (app)/map.tsx        # mappa: marker, raggio, SSE live
    (app)/create.tsx     # creazione: categoria + pin + nota
    report/[id].tsx      # dettaglio + voto (deep-linkabile)
  components/
    CategoryPicker.tsx   # scelta categoria
    Countdown.tsx        # countdown TTL
    Disclaimer.tsx       # testo legale
  lib/
    api.ts               # client REST + SSE (con fallback polling)
    auth.tsx             # React Context stato auth, JWT in secure-store
    config.ts            # EXPO_PUBLIC_API_URL
    push.ts              # permesso notifiche + registrazione token
    types.ts             # tipi allineati agli schema backend
    format.ts, onboarding.ts
```

- Stato di auth via **React Context**; JWT persistito in `expo-secure-store`.
- Mappa: `react-native-maps` (iOS → Apple Maps, nessuna API key; Android →
  richiede Google Maps key in `app.json`).
- SSE in `lib/api.ts` con **fallback automatico a polling** di `/reports/nearby`.
- Push: all'avvio chiede permesso, ottiene il token Expo, lo registra; il tap
  sulla notifica apre il dettaglio.

---

## 9. Struttura backend

```
backend/
  app/
    main.py            # FastAPI app, router, lifespan (scheduler)
    config.py          # TUTTI i parametri (TTL, soglie, raggi, rate limit)
    categories.py      # lista CHIUSA categorie (PLACEHOLDER — vedi §12)
    db.py              # engine async, sessione
    models.py          # SQLAlchemy + GeoAlchemy2
    schemas.py         # Pydantic
    auth.py            # JWT, hashing bcrypt
    broker.py          # broker SSE in-memory (pub/sub per area)
    jobs.py            # APScheduler: scadenza + retention
    routers/           # auth, reports, stream (SSE), users
    services/
      reports.py       # TTL, voto, anti-abuso, query PostGIS
      notify.py        # push Expo (dietro flag)
  alembic/             # migrazioni (0001_init, 0002_user_location_retention)
  Dockerfile
  entrypoint.sh        # attende DB, applica migrazioni, avvia API
proxy/nginx.conf       # reverse proxy SSE-friendly (/reports/stream)
docker-compose.yml         # api + postgis + proxy (dev/base)
docker-compose.dgx.yml     # override produzione DGX (arm64, porte 127.0.0.1)
scripts/smoke_test.sh      # smoke test end-to-end via curl
```

---

## 10. Deploy & ambienti

### Produzione (DGX + Cloudflare)
Guida operativa completa: [DEPLOY_DGX_CLOUDFLARE.md](DEPLOY_DGX_CLOUDFLARE.md).
```bash
# sulla DGX
docker compose -f docker-compose.yml -f docker-compose.dgx.yml up -d --build
# tunnel: regola ingress zone.delibra.info → http://127.0.0.1:18080 nel
# file ~/.cloudflared/delibra.yml, poi: systemctl restart cloudflared-delibra
curl https://zone.delibra.info/health   # {"status":"ok"}
```

### App iPhone (TestFlight)
```bash
cd mobile
eas build --platform ios --profile production   # build cloud store-signed
eas submit --platform ios --latest              # upload ad App Store Connect
# poi: App Store Connect → TestFlight → Internal Testing → install via app TestFlight
```
Config: `EXPO_PUBLIC_API_URL=https://zone.delibra.info` in `mobile/.env`,
`bundleIdentifier = com.andydiego.segnalazionilive`, `ITSAppUsesNonExemptEncryption=false`.

### Sviluppo locale (Mac)
```bash
cp backend/.env.example backend/.env   # JWT_SECRET: openssl rand -hex 32
docker compose up --build              # api :8000, proxy :8080, docs /docs
cd mobile && npm install && npm run start   # Expo Go / EAS, punta all'IP LAN
```
Vedi [PROVA_SU_DEVICE.md](PROVA_SU_DEVICE.md) per il giro end-to-end.

---

## 11. Configurazione (env)

`backend/.env` (template in `.env.example`):
| Variabile | Descrizione |
|---|---|
| `DATABASE_URL` | URL async (`postgresql+asyncpg://…`) |
| `JWT_SECRET` | **Obbligatorio cambiare** — firma i JWT |
| `JWT_ACCESS_TTL_MINUTES` | scadenza token (default 24h) |
| `PUSH_ENABLED` | abilita le push Expo (default `false`) |
| `PUSH_RADIUS_M` | raggio (m) per notificare gli utenti vicini |
| `RETENTION_DELETE_AFTER_MINUTES` | finestra prima della cancellazione (def 24h) |
| `DEBUG` | log SQL verboso |

> `.env` è in `.gitignore` dal primo commit. Nessun segreto hard-coded nel codice.

`mobile/.env`: `EXPO_PUBLIC_API_URL` (l'URL del backend, "congelato" nella build).

---

## 12. Stato e cosa manca prima del rilascio pubblico

Milestone implementate:
- ✅ **M1** — Backend core: PostGIS, modelli, migrazioni, auth JWT, `POST /reports`,
  `GET /reports/nearby` (`ST_DWithin`).
- ✅ **M2** — Voto, TTL dinamico, soglia smentite, rate limit, anti-spam, job scadenza.
- ✅ **M3** — SSE `/reports/stream` con broker in-memory; fallback polling.
- ✅ **M4** — Mobile Expo (auth, mappa, creazione, voto, disclaimer).
- ✅ **M5** — Push Expo con filtro geografico server-side, storage posizione,
  retention/cancellazione dati.
- 🟡 **Deploy** — Backend in produzione su DGX/Cloudflare; app su TestFlight.
- ⬜ **M6** — Pre-rilascio (sotto).

### ⚠️ Da completare prima della pubblicazione sugli store
- **Categorie** (`backend/app/categories.py`): i valori attuali
  (`esempio_a/b/c`) sono **placeholder fittizi**. La lista definitiva è una
  decisione di prodotto con implicazioni legali; il sistema regge qualunque set
  purché resti una lista chiusa (basta editare quel file).
- **Conformità legale / moderazione** (non opzionale per app pubblica):
  - GDPR: informativa privacy, base giuridica, ToS; **cancellazione account**
    su richiesta (la minimizzazione/retention è già attiva).
  - Sistema di segnalazione abusi (report di un report) e moderazione.
  - Moderazione/filtro del testo libero (`note`).
  - Disclaimer in-app obbligatorio (già presente in onboarding — verificare i
    requisiti definitivi).
- **Mappa Android**: Google Maps API key in `app.json` (iOS usa Apple Maps).

> Far validare categorie + privacy + ToS a un legale prima della pubblicazione:
> Apple e Google rifiutano in review le app di "segnalazione community" prive di
> moderazione e anti-abuso.

---

## 13. Riferimenti rapidi

- Backend prod: `https://zone.delibra.info` (`/health`, `/docs`)
- Repo: `github.com/andyweb/Zone`
- Bundle id iOS: `com.andydiego.segnalazionilive`
- Progetto EAS: `@andydiego/segnalazioni-live`
- Doc deploy: [DEPLOY_DGX_CLOUDFLARE.md](DEPLOY_DGX_CLOUDFLARE.md) ·
  prova locale: [PROVA_SU_DEVICE.md](PROVA_SU_DEVICE.md)
