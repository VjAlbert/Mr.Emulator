# Roadmap di Mr. Emulator

Piattaforma di riferimento: **Windows**. Il codice sarà organizzato in modo da non rendere impossibile un eventuale supporto ad altri sistemi operativi in futuro, ma non è un obiettivo del progetto al momento.

Hardware minimo di riferimento: portatile con **Intel Core i7 di settima generazione, 16 GB di RAM e scheda video dedicata da 6 GB**. L'interfaccia deve restare fluida anche su questa configurazione e sfruttare al meglio PC più potenti.

## Fase 0 — Fondamenta
- [x] Definizione dell'idea e dell'architettura (frontend + RetroArch come motore)
- [x] Struttura del progetto Electron + TypeScript + React
- [x] Modulo di astrazione per percorsi e avvio dei processi

## Fase 1 — Arcade e console 8/16 bit
Sistemi: Arcade (MAME, FBNeo), Neo Geo, Master System, Mega Drive, NES, SNES, Game Boy / Color / Advance.

- [x] Scansione della cartella ROM (una sottocartella per sistema)
- [x] Libreria di giochi con anteprima
- [x] Copertine e immagini scaricate in automatico (libretro-thumbnails, con cache locale)
- [x] Copertine per Arcade e Neo Geo (titolo ricavato dal DAT di FBNeo, 7718 giochi)
- [x] File BIOS (es. neogeo.zip) nascosti dalla lista
- [x] Carosello 3D di copertine, sfondo a rotazione, tendine ed effetti luce (con modalità "effetti ridotti")
- [x] Archivi completi: scansione in background, indice salvato su disco, lista virtuale, ricerca e salti di pagina (provato su 54.000 file finti)
- [ ] Download in blocco delle copertine di un intero sistema (opzionale: occupa molto spazio)
- [x] Schermata di selezione sistema in stile "character select"
- [x] Avvio dei giochi tramite RetroArch e ritorno al launcher (da verificare con RetroArch reale)
- [x] Navigazione con tastiera, mouse e gamepad (da verificare con pad reali ed encoder arcade)

## Fase 2 — Configurazione guidata e sistemi più pesanti
- [x] Cartelle ROM e BIOS create automaticamente al primo avvio (Documenti\MrEmulator)
- [ ] Procedura guidata completa al primo avvio
- [ ] Scaricamento di RetroArch e dei core dalle fonti ufficiali
- [ ] Verifica dei BIOS tramite hash (senza scaricarli)
- [x] Autoguida: rilevamento di PC e schermi, profili Leggero/Bilanciato/Massimo per sistema, file di configurazione generato per RetroArch
- [x] Scheda video potente per i giochi sui portatili con due GPU (Windows)
- [x] Domanda "com'è andata?" dopo ogni partita: il livello di ogni sistema si adatta
- [ ] Verifica delle impostazioni con RetroArch e schermi reali (portatile, PC desktop, TV/proiettore)
- [x] Comandi da tastiera (WASD + J/K/L) e preset pannello arcade I-PAC a 2 giocatori e 6 pulsanti, con uscita da gioco tramite combinazione sul pannello
- [x] Schermata "Comandi" per provare in tempo reale tastiera, encoder e pad
- [ ] Procedura guidata per pad sconosciuti (es. encoder Zero Delay): da fare e provare con l'hardware reale
- [ ] Verifica dei comandi con un pannello arcade e un pad reali
- [x] Sistema "Arcade (MAME)" con MAME autonomo (testato con 0.229): elenco letto da MAME stesso, varianti, comandi, effetti, supporto ai dischi CHD (da verificare con un MAME vero)
- [x] Filtro per famiglia in Arcade (MAME): Neo Geo, Capcom CPS, Sega, Taito, Namco, Konami e altre, con conteggi e scelta ricordata
- [x] Cartella ROM dedicata a ogni versione di MAME (es. mame0229), pulsante "usa un altro disco per tutto" e protezione se il disco esterno è scollegato
- [x] Pannello di ricerca anche senza tastiera: tastiera sullo schermo per joystick/pad/mouse, iniziali A-Z, risultati in tempo reale, ricerca per parole
- [x] Ricerca evoluta: tastiera intelligente (spegne i tasti inutili), disposizione alfabetica per joystick, anteprima con copertina, schede (a caso, famiglie, anni), preferiti e ultimi giochi
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
