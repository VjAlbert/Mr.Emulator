# Roadmap di Mr. Emulator

Piattaforma di riferimento: **Windows**. Il codice sarà organizzato in modo da non rendere impossibile un eventuale supporto ad altri sistemi operativi in futuro, ma non è un obiettivo del progetto al momento.

Hardware minimo di riferimento: portatile con **Intel Core i7 di settima generazione, 16 GB di RAM e scheda video dedicata da 6 GB**. L'interfaccia deve restare fluida anche su questa configurazione e sfruttare al meglio PC più potenti.

## Fase 0 — Fondamenta
- [x] Definizione dell'idea e dell'architettura (frontend + RetroArch come motore)
- [ ] Struttura del progetto Electron + TypeScript + React
- [ ] Modulo di astrazione per percorsi e avvio dei processi

## Fase 1 — Arcade e console 8/16 bit
Sistemi: Arcade (MAME, FBNeo), Neo Geo, Master System, Mega Drive, NES, SNES, Game Boy / Color / Advance.

- [ ] Scansione della cartella ROM e riconoscimento dei sistemi
- [ ] Libreria di giochi con copertine e anteprime
- [ ] Schermata di selezione sistema in stile "character select"
- [ ] Avvio dei giochi tramite RetroArch e ritorno al launcher
- [ ] Navigazione completa con tastiera, mouse e gamepad

## Fase 2 — Configurazione guidata e sistemi più pesanti
- [ ] Procedura guidata al primo avvio
- [ ] Scaricamento di RetroArch e dei core dalle fonti ufficiali
- [ ] Verifica dei BIOS tramite hash (senza scaricarli)
- [ ] Profili prestazioni: Leggero, Bilanciato, Massimo
- [ ] Mappatura di tastiera, controller ed encoder arcade
- [ ] Nintendo 64, Nintendo DS, Mega CD, Famicom Disk System
- [ ] GameCube e Wii (da verificare sulle prestazioni)

## Fase 3 — Estensioni
- [ ] Atari Jaguar e 3DO
- [ ] Filtri avanzati, preferiti e statistiche di gioco
- [ ] Shader CRT preconfigurati e overlay
- [ ] Temi grafici alternativi
- [ ] Installer per Windows distribuito nelle Releases

## Principi del progetto
- Nessun costo e nessuna API a pagamento: i dati devono funzionare offline o da fonti gratuite.
- Nessuna ROM né BIOS inclusi o scaricati dal programma.
- Pensato per chi non è esperto: ogni funzione deve avere un percorso guidato.
