# Deploy del backend su DGX dietro Cloudflare Tunnel

Obiettivo: far girare il backend (api + db + proxy) sulla **DGX** ed esporlo su
`https://zone.delibra.info` tramite **Cloudflare Tunnel**, così l'app iPhone
funziona **ovunque** (anche su rete dati), senza il Mac e senza aprire porte
sul firewall.

> Dominio: **delibra.info** → l'API sarà su `https://zone.delibra.info`.
> Sostituisci `<USER>` con il tuo utente sulla DGX e `<TUNNEL_ID>` con l'UUID
> del tunnel (lo ottieni con `cloudflared tunnel list`).

```
iPhone ──HTTPS──> zone.delibra.info ──Cloudflare──> [Tunnel] ──> DGX
                                                                   nginx :8080
                                                                   └─ api :8000 ─ PostGIS
```

---

## 1. Backend sulla DGX

```bash
# sulla DGX
git clone <URL_DEL_REPO> Zone && cd Zone
cp backend/.env.example backend/.env

# genera un JWT_SECRET nuovo e mettilo in backend/.env (campo JWT_SECRET)
openssl rand -hex 32

# avvio con l'override DGX (porte solo su 127.0.0.1, restart automatico)
docker compose -f docker-compose.yml -f docker-compose.dgx.yml up -d --build

# verifica locale
curl http://localhost:8080/health   # -> {"status":"ok"}
```

> Il DB persiste nel volume `pgdata`. Per fermare tutto:
> `docker compose -f docker-compose.yml -f docker-compose.dgx.yml down`
> (aggiungi `-v` solo se vuoi cancellare anche i dati).

---

## 2. Cloudflare Tunnel sulla DGX

Installazione di `cloudflared` (Debian/Ubuntu):

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

Autorizza il tuo dominio e crea il tunnel:

```bash
cloudflared tunnel login                 # apri l'URL e scegli delibra.info
cloudflared tunnel create zone-api        # crea il tunnel + il file credenziali JSON
cloudflared tunnel list                   # annota l'ID del tunnel (UUID)
```

Crea il record DNS (CNAME automatico verso il tunnel):

```bash
cloudflared tunnel route dns zone-api zone.delibra.info
```

Crea il file di config `~/.cloudflared/config.yml`:

```yaml
tunnel: zone-api
credentials-file: /home/<USER>/.cloudflared/<TUNNEL_ID>.json

ingress:
  # tutto ciò che arriva su zone.delibra.info va al proxy nginx locale
  - hostname: zone.delibra.info
    service: http://localhost:8080
  # regola di chiusura obbligatoria
  - service: http_status:404
```

Avvia il tunnel come servizio (parte da solo al boot):

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared        # deve risultare "active (running)"
```

Verifica dall'esterno (da qualsiasi rete):

```bash
curl https://zone.delibra.info/health   # -> {"status":"ok"}
```

---

## 3. Punta l'app al backend pubblico

In `mobile/.env`:

```
EXPO_PUBLIC_API_URL=https://zone.delibra.info
```

Poiché ora è **HTTPS vero**, togli l'eccezione ATS da `mobile/app.json`
(il blocco `NSAppTransportSecurity`/`NSAllowsArbitraryLoads`): non serve più.

Poi ricostruisci con EAS:

```bash
cd mobile
eas build --platform ios --profile preview
```

Da qui l'app installata funziona **ovunque**, indipendente dal Mac.

---

## Note / scelte

- **SSE (aggiornamenti live):** il proxy nginx ha già `proxy_buffering off` su
  `/reports/stream`; Cloudflare di norma lascia passare lo streaming. In più
  l'app ha il fallback a polling ogni ~20s, quindi la mappa si riconcilia
  comunque.
- **Esposizione pubblica:** `zone.delibra.info` è raggiungibile da chiunque
  (la `/auth/register` è aperta). Per un test privato si può mettere davanti
  **Cloudflare Access** (login zero-trust) o un token applicativo.
- **Hardening porte:** con `docker-compose.dgx.yml` le porte sono su
  `127.0.0.1`, quindi solo `cloudflared` (sullo stesso host) le raggiunge.
- **GPU:** questo stack non usa la GPU della DGX — è solo API + Postgres,
  carico trascurabile.
