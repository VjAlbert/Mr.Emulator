[◀ Home](IT-Home) · **Privacy e note legali**

# 🔒 Privacy e note legali

## ROM, BIOS ed emulatori

**Mr. Emulator non include, non scarica e non distribuisce ROM, BIOS o emulatori.** Funziona con i file che possiedi e che hai ottenuto legalmente — per esempio copie di riserva dei tuoi giochi e delle tue console. Il repository non contiene mai materiale protetto da copyright. Non scarica né avvia altri programmi da solo: RetroArch e MAME li installi tu dai loro siti ufficiali (il programma li trova e apre le loro pagine).

I nomi di sistemi e giochi e le illustrazioni delle console sono marchi dei rispettivi proprietari e servono solo a identificare i sistemi. Gli screenshot di questa wiki usano **giochi inventati**, con copertine disegnate per l'occasione.

## Niente telemetria, niente account

Il programma **non** raccoglie né invia dati d'uso e non richiede un account. Tutto ciò che memorizza sta sul tuo PC.

### Connessioni di rete che fa

| Cosa | Verso | Quando |
|---|---|---|
| Copertine e screenshot | `thumbnails.libretro.com`, `raw.githubusercontent.com` (libretro-thumbnails) e il suo indice dei file tramite `api.github.com` | Quando apri un gioco / premi *Cerca copertine* (si può spegnere). |
| Core | `buildbot.libretro.com` (archivio ufficiale di libretro) | Quando scegli di installare un core. |
| Database dei trucchi | `buildbot.libretro.com` | Quando premi *Scarica i trucchi*. |
| Elenco dei titoli arcade | `raw.githubusercontent.com` (libretro-database) | Per dare il nome ai giochi arcade. |
| Controllo nuova versione | `api.github.com` (le release di questo repository) | Al massimo una volta al giorno; si può spegnere nelle Impostazioni. Non si invia nulla di tuo. |
| Trofei | RetroAchievements, **tramite RetroArch** | Solo se attivi i trofei. |

I pulsanti «Sito ufficiale» aprono solo il browser.

## I tuoi dati

- Le **impostazioni** stanno nella cartella dei dati utente (`%APPDATA%\Mr. Emulator`). La **password di RetroAchievements è salvata lì in chiaro** e scritta nel file di configurazione che legge RetroArch — non lascia il PC se non per accedere tramite RetroArch. Usa una password che non riutilizzi, oppure lascia spenti i trofei.
- I **salvataggi** stanno nella cartella che scegli; le **copertine** nella cartella della cache che scegli.
- Disinstallare non cancella i tuoi giochi, salvataggi o cache.

## Firma digitale

L'installer non è ancora firmato. Quando lo sarà, verrà firmato tramite il programma open source di SignPath Foundation, solo dal flusso GitHub ufficiale. Dettagli: la [politica di firma](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/CODE_SIGNING_POLICY.md) (in inglese).

## Licenza

Mr. Emulator è rilasciato con [licenza MIT](https://github.com/VjAlbert/Mr.Emulator/blob/main/LICENSE). RetroArch, i core libretro e MAME hanno le loro licenze — controllale sui loro siti.

[◀ Problemi comuni](IT-Problemi-Comuni) · [Avanti: Sotto il cofano ▶](IT-Sotto-il-Cofano)
