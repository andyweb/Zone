---
marp: true
theme: default
paginate: true
size: 16:9
math: false
style: |
  :root {
    --blu: #2563eb;
    --blu-scuro: #0b1120;
    --verde: #16a34a;
    --ambra: #f59e0b;
    --grigio: #64748b;
    --chiaro: #f5f8fc;
  }
  section {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 26px;
    color: #0f172a;
    background: var(--chiaro);
    padding: 60px 70px;
  }
  h1 { color: var(--blu-scuro); font-size: 52px; line-height: 1.1; letter-spacing: -0.5px; }
  h2 { color: var(--blu); font-size: 38px; letter-spacing: -0.3px; }
  h3 { color: var(--grigio); font-weight: 700; }
  strong { color: var(--blu); }
  a { color: var(--blu); }
  ul, ol { line-height: 1.5; }
  blockquote {
    border-left: 6px solid var(--blu);
    background: #eaf1fe; padding: 14px 22px; color: #1e293b; font-style: normal;
    border-radius: 0 10px 10px 0;
  }
  table { font-size: 22px; }
  th { background: var(--blu-scuro); color: #fff; }
  code { background: #e6edfa; color: #1d4ed8; padding: 2px 7px; border-radius: 5px; }
  /* Slide "lead": copertina e divisori, sfondo scuro */
  section.lead {
    background: radial-gradient(1200px 600px at 20% 0%, #16233f 0%, var(--blu-scuro) 60%);
    color: #e6edf7; justify-content: center;
  }
  section.lead h1 { color: #ffffff; font-size: 64px; }
  section.lead h2 { color: #7fb0ff; }
  section.lead h3 { color: #93a1b8; }
  section.lead strong { color: #7fb0ff; }
  section.lead blockquote { background: rgba(127,176,255,.12); border-color: #7fb0ff; color: #dbe6ff; }
  /* Badge verificata */
  .badge { background: rgba(22,163,74,.16); color: #16a34a; font-weight: 800;
           font-size: 18px; padding: 4px 12px; border-radius: 999px; }
  .kpi { font-size: 64px; font-weight: 800; color: var(--blu); line-height: 1; }
  .muted { color: var(--grigio); }
  footer { color: var(--grigio); font-size: 14px; }
  section::after { color: var(--grigio); font-size: 14px; }
---

<!-- _class: lead -->
<!-- _paginate: false -->

# Zone
## La mappa live dell'emergenza

### Situational awareness in tempo reale per la Protezione Civile

<br>

**Cittadini e volontari diventano i sensori del territorio.**
La sala operativa vede cosa succede — *ora* e *dove*.

<br>

`https://zone.delibra.info`

---

<!-- _class: lead -->

# Durante un'emergenza,
# l'informazione è **caos**

- Telefonate che intasano il centralino
- Segnalazioni su WhatsApp, social, passaparola — **frammentate**
- Mappe e fogli che invecchiano nel giro di minuti
- La sala operativa fatica a rispondere a **una sola domanda:**

> *"Cosa sta succedendo, adesso, e dove?"*

---

## L'idea

# Una mappa **viva**, alimentata dal territorio

- Cittadini e volontari segnalano in **3 tap**: un punto, una categoria, una foto
- Tutto compare **in tempo reale** sulla mappa della sala operativa
- Ogni segnalazione **nasce, viene validata, e scade da sola**

> Niente archivio statico. La mappa mostra **solo ciò che è vero ora**.

---

# Il meccanismo che cambia tutto

Le app di segnalazione tradizionali diventano **discariche** di roba vecchia.
Zone no — per costruzione:

| | |
|---|---|
| 🟢 **Nasce** | il cittadino segnala (allagamento, frana, strada interrotta…) |
| 👥 **Validata** | la community conferma o smentisce |
| ⏱️ **Vive un TTL** | le conferme la allungano, le smentite la accorciano |
| ⚪ **Scade** | quando non è più confermata, **sparisce da sola** |

> Una mappa che si **auto-pulisce**: sempre affidabile, senza un esercito di moderatori.

---

# Distinguere il **segnale** dal rumore

### Fonti accreditate

- Volontari e operatori si registrano con un **codice di accreditamento**
- Le loro segnalazioni portano il badge <span class="badge">✔ VERIFICATA</span>
- I loro contributi **pesano di più** nella validazione

<br>

**Risultato:** la sala operativa riconosce a colpo d'occhio le informazioni
provenienti dai propri volontari sul campo.

---

# La Sala Operativa
## Tutto il quadro, in un cruscotto web

- 🗺️ Mappa di **tutte** le segnalazioni attive, in tempo reale
- 🔎 Filtri per categoria, **solo fonti verificate**, ricerca
- 📷 Foto sul posto, voti della community, **countdown** di ogni evento
- 📊 Statistiche live · aggiornamento automatico

> Nessuna installazione: si apre in un browser. `zone.delibra.info/dashboard`

---

# Sul campo
## L'app per cittadini e volontari

- **Segnala in 3 tap**: posizione sulla mappa + categoria + (foto)
- **Foto geolocalizzata** dell'evento, allegata alla segnalazione
- **Notifiche di zona**: avvisa chi è fisicamente vicino a un evento
- Funziona **ovunque** — anche su rete dati, fuori dal Wi-Fi comunale

---

# Privacy e **sovranità del dato**

Per un ente pubblico non è un dettaglio: è un requisito.

- 🔒 **Self-hosted**: gira su un vostro server, **non** su un cloud estero
- 🧹 **Dati minimizzati**: posizione facoltativa, sovrascritta, cancellata al logout
- 🗑️ **Retention automatica**: le segnalazioni scadute vengono cancellate
- 🛡️ **Moderazione e anti-abuso** integrati · diritto all'oblio (GDPR)
- 📸 Le foto vengono ripulite dai **metadati** (niente GPS nascosto)

---

<!-- _class: lead -->

# Non è un prototipo.
# È **già in produzione.**

<br>

<span class="kpi">✓</span>

App su iPhone · Cruscotto web · Backend live h24

> Possiamo mostrarlo **dal vivo, adesso.**

---

# Demo dal vivo

### Cruscotto sala operativa
**`https://zone.delibra.info/dashboard`**

### App sul campo
Distribuita via TestFlight · segnalazione con foto in tempo reale

<br>

> Una segnalazione fatta dall'app compare sul cruscotto **in pochi secondi**.

---

# Il modo più semplice per provarlo
## Una vostra **esercitazione**

L'esercitazione è lo scenario perfetto:

- **Delimitata** nello spazio e nel tempo
- **A rischio zero** — nulla di critico dipende dal sistema
- Mette alla prova il valore reale: i volontari come **sensori**, la sala
  operativa che vede tutto in tempo reale

> Se funziona lì, avete un caso concreto e referenze vostre.

---

# Piano del pilota

| Fase | Cosa |
|---|---|
| **Setup** | Istanza dedicata, categorie e codici di accreditamento per i vostri volontari |
| **Pre-esercitazione** | Brief di 1 ora, installazione app, prova del cruscotto |
| **Esercitazione** | Cittadini/volontari segnalano · la sala operativa monitora dal vivo |
| **Debrief** | Analisi dei dati raccolti, feedback, valutazione |

**Voi:** scenario, volontari, un referente di sala operativa.
**Noi:** piattaforma configurata, formazione, supporto durante l'evento.

---

# Onestà, perché ci tenete (e noi anche)

Zone **non sostituisce** le centrali operative né i numeri di emergenza
(112 / 115 / NUE).

> È uno strumento di **situational awareness complementare**: aggrega ciò che
> arriva dal territorio per dare alla sala operativa un quadro vivo e
> geolocalizzato. Le decisioni restano sempre vostre.

---

<!-- _class: lead -->
<!-- _paginate: false -->

# Proviamolo alla
# **vostra prossima esercitazione.**

<br>

### Zone — la mappa live dell'emergenza

`https://zone.delibra.info`

<br>

**[ Nome · contatto · ente ]**
