# App di segnalazione live geolocalizzata

Base eseguibile del backend per un'app di segnalazioni geolocalizzate "live":
gli utenti creano segnalazioni con un punto e una categoria, le vedono sulla
mappa nelle vicinanze, le confermano/smentiscono, e le segnalazioni nascono,
vivono un TTL e scadono (mappa sempre aggiornata, anti-archivio statico).

Questo repository implementa le milestone **M1–M3** del brief tecnico
(backend core + voto/anti-abuso/TTL + realtime SSE). Le milestone M4 (mobile
Expo), M5 (push) e M6 (legale/categorie definitive) sono da completare — vedi
[Stato e prossimi passi](#stato-e-prossimi-passi).

## Stack

| Livello   | Tecnologia                                  |
|-----------|---------------------------------------------|
| Backend   | Python 3.12 + FastAPI (async)               |
| Database  | PostgreSQL 16 + PostGIS                      |
| ORM       | SQLAlchemy 2.x async + GeoAlchemy2           |
| Migrazioni| Alembic (async)                             |
| Realtime  | Server-Sent Events (SSE) + broker in-memory |
| Scheduler | APScheduler (job di scadenza)               |
| Auth      | JWT (access token) + bcrypt                 |
| Deploy    | Docker Compose (api + db PostGIS + proxy)   |

**Gestione dipendenze:** `pip` + `requirements.txt` (scelta documentata come
richiesto dal brief). Tutto async dove possibile.

## Avvio rapido (Docker Compose)

```bash
cp backend/.env.example backend/.env
# IMPORTANTE: in backend/.env imposta un JWT_SECRET robusto:
#   openssl rand -hex 32
docker compose up --build
```

All'avvio il container API attende il DB, applica le migrazioni Alembic
(`alembic upgrade head`, che crea anche l'estensione PostGIS) e lancia Uvicorn.

Endpoint disponibili:

- API diretta: `http://localhost:8000`
- Via reverse proxy nginx (config SSE-friendly): `http://localhost:8080`
- Documentazione interattiva: `http://localhost:8000/docs`

### Test rapido con curl

```bash
BASE_URL=http://localhost:8000 ./scripts/smoke_test.sh
```

Lo script registra un utente, fa login, elenca le categorie, crea una
segnalazione e la rilegge via `nearby`.

## Variabili d'ambiente

Vedi `backend/.env.example`. Le principali:

| Variabile      | Descrizione                                              |
|----------------|---------------------------------------------------------|
| `DATABASE_URL` | URL async (`postgresql+asyncpg://…`)                    |
| `JWT_SECRET`   | **Obbligatorio cambiare.** Firma i token JWT.           |
| `PUSH_ENABLED` | Flag notifiche push Expo (default `false`)              |
| `DEBUG`        | Log SQL verboso                                         |

> **Segreti:** `.env` è in `.gitignore` fin dal primo commit. Non committare
> mai `.env`; usa `.env.example` come template. (Il backend non contiene
> segreti hard-coded.)

## API REST

Tutte le risposte JSON. Auth via header `Authorization: Bearer <jwt>`.

| Metodo | Endpoint               | Descrizione                                   |
|--------|------------------------|-----------------------------------------------|
| POST   | `/auth/register`       | Registrazione email/password                  |
| POST   | `/auth/login`          | Login → JWT                                    |
| GET    | `/categories`          | Lista chiusa categorie (chiave, label, colore, TTL) |
| POST   | `/reports`             | Crea segnalazione (`category, note?, lat, lon`) |
| GET    | `/reports/nearby`      | Segnalazioni attive (`lat, lon, radius_m`)    |
| POST   | `/reports/{id}/vote`   | Vota (`+1` conferma / `-1` smentita)          |
| GET    | `/reports/stream`      | SSE: eventi live (`created`/`updated`/`removed`) |
| PUT    | `/users/push-token`    | Registra l'Expo push token                    |
| GET    | `/health`              | Healthcheck                                   |

### SSE (`/reports/stream`)

```
GET /reports/stream?lat=&lon=&radius_m=&token=<jwt>
```

Mantiene la connessione aperta e invia eventi `created` / `updated` /
`removed` filtrati per area (solo le segnalazioni che cadono nel raggio del
subscriber). Il token può arrivare via header `Authorization` oppure via query
param `token` (necessario per `EventSource` nel browser, che non supporta
header custom).

**Scelta architetturale:** broker pub/sub **in-memory** con filtro geografico
(`app/broker.py`). Lo stato vive nel processo: con più worker/replica gli
eventi non si propagano tra processi. Per il realtime multi-istanza basta
sostituire il broker con un backend condiviso (Redis, Postgres LISTEN/NOTIFY)
mantenendo la stessa interfaccia `publish/subscribe`.
**Fallback documentato** per il primo step: il client può fare polling di
`GET /reports/nearby` ogni ~20s.

## Logiche di business

Tutti i parametri (TTL, soglie, raggi, rate limit) sono centralizzati in
`backend/app/config.py` — nessun valore magico sparso nel codice.

- **TTL dinamico** (`config.py`): alla creazione `expires_at = now() +
  ttl_base(category)`. Ogni conferma estende il TTL, ogni smentita lo
  accorcia; l'effetto è pesato per il `trust_score` del votante e clampato tra
  un minimo (`ttl_floor_minutes`) e un massimo (`ttl_ceiling_minutes`).
- **Anti-abuso**: rimozione automatica quando `denials >= soglia` **e**
  `denials > confirms`; rate limit di N segnalazioni/ora per utente; anti-spam
  di prossimità (stessa categoria entro R metri e finestra T minuti); un voto
  per utente per segnalazione; non si vota la propria segnalazione.
- **Job di scadenza** (`jobs.py`): APScheduler ogni 5 min marca `expired` le
  segnalazioni attive scadute e pubblica l'evento SSE `removed`. Le letture
  filtrano comunque per `status='active' AND expires_at > now()`.

## Test

```bash
cd backend
pip install -r requirements.txt
pytest                 # test unitari delle logiche pure (TTL clamp, broker, categorie)
```

Per i test end-to-end con DB reale serve PostGIS in esecuzione; il modo più
semplice è `docker compose up` e poi `./scripts/smoke_test.sh`.

## Struttura

```
backend/
  app/
    main.py            # FastAPI app, router, lifespan (scheduler)
    config.py          # settings: TTL, soglie, raggi, rate limit (tutto qui)
    categories.py      # lista CHIUSA categorie (PLACEHOLDER, vedi sotto)
    db.py              # engine async, sessione
    models.py          # SQLAlchemy + GeoAlchemy2
    schemas.py         # Pydantic
    auth.py            # JWT, hashing bcrypt
    broker.py          # broker SSE in-memory (pub/sub per area)
    jobs.py            # APScheduler: scadenza
    routers/           # auth, reports, stream (SSE), users
    services/
      reports.py       # logiche TTL, voto, anti-abuso, query PostGIS
      notify.py        # push Expo (dietro flag)
  alembic/             # migrazioni (0001_init)
  requirements.txt
  Dockerfile
  entrypoint.sh        # attende DB, migra, avvia API
proxy/nginx.conf       # reverse proxy SSE-friendly
docker-compose.yml     # api + postgis + proxy
scripts/smoke_test.sh  # smoke test end-to-end via curl
```

## Stato e prossimi passi

- ✅ **M1** — Backend core: PostGIS, modelli, migrazioni, auth JWT,
  `POST /reports`, `GET /reports/nearby` con query PostGIS (`ST_DWithin`).
- ✅ **M2** — Voto, TTL dinamico, soglia smentite, rate limit, anti-spam di
  prossimità, job di scadenza APScheduler.
- ✅ **M3** — SSE `/reports/stream` con broker in-memory; fallback polling
  documentato.
- ⬜ **M4** — Mobile Expo (auth, mappa, marker per categoria, creazione/voto,
  disclaimer onboarding).
- ⬜ **M5** — Push Expo dietro flag, gestione permessi posizione,
  retention/cancellazione dati scaduti.
- ⬜ **M6** — Pre-rilascio: vedi sotto.

## ⚠️ Da completare PRIMA del rilascio pubblico

Queste parti sono **placeholder / decisioni dell'autore** e non sono state
inventate (come da brief, sezioni 7–8):

- **Categorie** (`backend/app/categories.py`): i valori attuali
  (`esempio_a/b/c`) sono **fittizi**. La lista definitiva è una decisione di
  prodotto con implicazioni legali. Il sistema regge qualunque set purché
  resti una lista chiusa: per cambiarle basta modificare quel file.
- **Conformità legale e moderazione** (brief, sezione 8) — **non opzionale**
  per un'app pubblica:
  - GDPR: informativa privacy, base giuridica, minimizzazione e policy di
    retention; le segnalazioni scadute/rimosse andranno **cancellate o
    anonimizzate** (oggi sono solo marcate — da implementare in M5).
  - Sistema di segnalazione abusi ("report" di un report) e moderazione.
  - **Disclaimer in-app obbligatorio**: l'app non sostituisce le autorità né i
    numeri di emergenza (112/113/115) — da mostrare in onboarding e creazione.
  - Moderazione/filtro del testo libero (`note`).
  - Termini di servizio e responsabilità del gestore.

> **Raccomandazione:** far validare categorie + privacy + ToS a un legale
> prima della pubblicazione sugli store. Apple e Google rifiutano in review le
> app di "segnalazione community" prive di moderazione e anti-abuso.
