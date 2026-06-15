---
pdf_options:
  format: A4
  margin: "16mm 16mm"
  printBackground: true
css: |
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a; font-size: 12.5px; line-height: 1.5; margin: 0;
  }
  h1, h2, h3 { margin: 0 0 4px; }
  .head {
    background: linear-gradient(110deg, #0b1120 0%, #16233f 100%);
    color: #fff; padding: 18px 22px; border-radius: 12px; margin-bottom: 16px;
  }
  .head h1 { font-size: 24px; letter-spacing: -.3px; }
  .head .sub { color: #9db8ff; font-weight: 600; font-size: 13px; margin-top: 2px; }
  .head .tag { color: #cdd8ee; font-size: 12px; margin-top: 8px; }
  h2 { color: #2563eb; font-size: 15px; border-bottom: 2px solid #e6edfa;
       padding-bottom: 3px; margin-top: 16px; }
  ul { margin: 6px 0; padding-left: 18px; }
  li { margin: 2px 0; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 9px; text-align: left; vertical-align: top; }
  th { background: #0b1120; color: #fff; font-weight: 700; }
  .cols { display: flex; gap: 16px; }
  .cols > div { flex: 1; }
  .price { background: #eaf1fe; border: 1px solid #c7d8fb; border-radius: 10px;
           padding: 12px 16px; margin: 6px 0; }
  .price b { color: #1d4ed8; }
  .note { color: #64748b; font-size: 11px; }
  .foot { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0;
          color: #475569; font-size: 11.5px; display: flex; justify-content: space-between; }
  strong { color: #1d4ed8; }
  .pill { background: #dcfce7; color: #16a34a; font-weight: 700; font-size: 11px;
          padding: 2px 8px; border-radius: 999px; }
---

<div class="head">
  <h1>Zone — Proposta di progetto pilota</h1>
  <div class="sub">La mappa live dell'emergenza · per la Protezione Civile</div>
  <div class="tag">Situational awareness in tempo reale: cittadini e volontari segnalano dal territorio, la sala operativa vede tutto su un'unica mappa.</div>
</div>

Proponiamo un **pilota sulla vostra prossima esercitazione**: uno scenario delimitato e a basso rischio per validare sul campo il valore di Zone, senza che nulla di critico dipenda dal sistema.

## Obiettivo del pilota

Dimostrare, durante un'esercitazione reale, come Zone trasformi i **volontari in sensori del territorio** e dia alla **sala operativa** un quadro vivo e geolocalizzato di ciò che accade, momento per momento.

## Cosa mettiamo a disposizione

- **App** per cittadini e volontari: segnalazione in 3 tap con **foto geolocalizzata**.
- **Fonti accreditate**: volontari/operatori con badge <span class="pill">✔ Verificata</span>; i loro contributi pesano di più.
- **Cruscotto web sala operativa**: mappa di tutte le segnalazioni attive, filtri, foto, voti, statistiche, **aggiornamento in tempo reale**.
- **Mappa che si auto-pulisce**: ogni segnalazione vive e scade da sola → sempre affidabile.

## Durata e fasi (≈ 4 settimane)

| Fase | Durata | Contenuto |
|---|---|---|
| Setup | 1 sett. | Istanza dedicata, categorie d'emergenza, codici di accreditamento |
| Preparazione | 1 sett. | Brief di 1 ora, installazione app, prova del cruscotto |
| Esercitazione | 1 giornata | Cittadini/volontari segnalano · sala operativa monitora dal vivo |
| Debrief | 1 sett. | Analisi dei dati raccolti, feedback, valutazione |

<div class="cols">
<div>

### Cosa mettete voi
- Scenario dell'esercitazione
- Volontari partecipanti
- Un referente di sala operativa
- Feedback finale

</div>
<div>

### Cosa mettiamo noi
- Piattaforma configurata e operativa
- Formazione (1 ora)
- Supporto durante l'evento
- Report finale del pilota

</div>
</div>

## Investimento

<div class="price">
<b>Setup pilota:</b> € 1.500 una tantum — <span class="note">interamente scalato dal primo canone annuo in caso di adozione.</span><br>
<b>Canone annuo (post-pilota):</b> da € 4.800/anno — <span class="note">hosting, manutenzione, aggiornamenti e supporto.</span>
</div>

<span class="note">Importi sotto la soglia di <strong>affidamento diretto</strong> (servizi): assegnabile senza gara. Fatturazione elettronica, CIG e determina di affidamento.</span>

## Perché è a rischio zero

- **Complementare**, non sostitutivo: Zone non rimpiazza le centrali operative né i numeri di emergenza (112 / 115 / NUE). Le decisioni restano vostre.
- **Sovranità del dato**: piattaforma **self-hosted**, conforme **GDPR**, dati minimizzati e cancellati automaticamente. Nessun cloud estero, nessun lock-in.
- **Circoscritto**: il pilota vive su un'istanza dedicata, attivata e spenta con l'esercitazione.

<div class="foot">
  <div><strong>Zone</strong> · zone.delibra.info/dashboard</div>
  <div>[ Nome · contatto · P. IVA ]</div>
</div>
