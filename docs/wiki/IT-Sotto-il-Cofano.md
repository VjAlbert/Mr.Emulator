[◀ Home](IT-Home) · **Sotto il cofano**

# 🛠️ Sotto il cofano

Per chi vuole contribuire e per i curiosi.

## Tecnologie

**Electron + TypeScript + React**, compilato con electron-vite. Windows è la piattaforma di riferimento; il codice tiene percorsi e avvio dei processi dietro piccoli moduli per non rendere impossibili altri sistemi, ma non sono un obiettivo.

```
src/
  main/       Processo principale di Electron: scansione, avvio, profili, salvataggi, copertine, cache, diagnostica
  preload/    Il ponte tipizzato `window.mr`
  renderer/   Interfaccia React (schermate, styles.css, i18n, stili fumetto/palcoscenico)
  shared/     Tipi usati da entrambi (Settings, SystemDef, MrApi…)
tests/        Suite node:test (compilata con tsc, eseguita da tests/run.cjs)
docs/         Roadmap, note di rilascio, questa wiki
```

## Come parte un gioco

1. L'interfaccia chiede al processo principale di avviare un gioco.
2. I **profili** (`profiles.ts` / `optimize.ts`) trasformano *hardware + schermo + sistema + tue impostazioni* in impostazioni di RetroArch: livello, modalità immagine, overlay, shader CRT, nitidezza, run-ahead, frequenza, monitor.
3. I **salvataggi** (`saves.ts`) aggiungono le cartelle di salvataggi/stati e il comportamento di ripresa; **extras** (`extras.ts`) aggiunge trofei e trucchi; gli **input** aggiungono la mappatura dei comandi.
4. Il risultato si scrive in `retroarch-mr.cfg` e RetroArch parte con `-L <core> <gioco> --appendconfig <cfg> --verbose --log-file …`. Per MAME si generano un `mame.ini` e un file dei comandi, e MAME parte con `-inipath`.
5. Quando il processo finisce torna il launcher; dopo una partita vera può chiedere «com'è andata?».

Quando sono attive sia la nitidezza sia un effetto CRT, `shaderchain.ts` unisce i due preset `.slangp` in uno solo (RetroArch applica un solo preset).

## Dove stanno le cose

| Cosa | Dove |
|---|---|
| Impostazioni, registri, `retroarch-mr.cfg`, `mame/` | `%APPDATA%\Mr. Emulator` |
| Cache delle copertine (e foto delle console se la cache è stata spostata) | la tua cartella della cache → `MrEmulator-artwork`, oppure `…\Mr. Emulator\artwork` |
| Salvataggi, stati, NVRAM e record di MAME | la cartella dei salvataggi (predefinita: accanto alle ROM) |
| Database dei trucchi | `cheats` accanto alla cartella delle ROM |

## Traduzioni

I testi dell'interfaccia sono scritti in italiano dentro chiamate `t('…')` e tradotti con un dizionario (`renderer/src/en.ts`); i messaggi del processo principale usano `mt('…')` con `main/en-main.ts`. I test falliscono se una frase non ha la voce inglese o se i `{segnaposto}` non coincidono.

## Test e rilasci

- `npm run typecheck`, `npm test` (node:test; anche sulla CI Windows), `npm run build`.
- Un flusso GitHub Actions costruisce l'installer per Windows con electron-builder. Esegue prima typecheck e test, e pubblica una release se avviato con *Publish* o su un tag `v*`.

## Contribuire

1. Apri una segnalazione che descriva cosa vuoi cambiare.
2. Tieni le modifiche mirate; aggiungi o aggiorna i test (`tests/*.test.ts`).
3. Tieni le frasi visibili all'utente in `t()`/`mt()` con le voci inglesi.
4. Esegui `npm run typecheck && npm test` prima di aprire una pull request.

[◀ Privacy e note legali](IT-Privacy-e-Note-Legali) · [Avanti: Guida alle impostazioni ▶](IT-Impostazioni)
