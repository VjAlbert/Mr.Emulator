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
- [x] Procedura guidata al primo avvio (cartelle, RetroArch, core, BIOS, MAME) e schermata iniziale "premi start"
- [x] Scaricamento dei core di RetroArch dall'archivio ufficiale (RetroArch stesso lo scarica ancora l'utente)
- [x] Verifica dei BIOS tramite MD5 noti (PlayStation, Dreamcast, FDS; gli altri solo presenza del file), senza scaricarli
- [x] Lingua italiano/inglese nel programma
- [x] Autoguida: rilevamento di PC e schermi, profili Leggero/Bilanciato/Massimo per sistema, file di configurazione generato per RetroArch
- [x] Scheda video potente per i giochi sui portatili con due GPU (Windows)
- [x] Domanda "com'è andata?" dopo ogni partita: il livello di ogni sistema si adatta
- [ ] Verifica delle impostazioni con RetroArch e schermi reali (portatile, PC desktop, TV/proiettore)
- [x] Comandi da tastiera (WASD + J/K/L) e preset pannello arcade I-PAC a 2 giocatori e 6 pulsanti, con uscita da gioco tramite combinazione sul pannello
- [x] Schermata "Comandi" per provare in tempo reale tastiera, encoder e pad
- [x] Salvataggi: cartella unica, salvataggio automatico ogni 10 s, "continua / nuova partita" prima di avviare le console (al posto della Memory Card), ripresa per gioco negli arcade, record di MAME, backup e ripristino in ZIP (da provare con RetroArch e MAME reali)
- [x] Bordo grafico (overlay) per ogni sistema: ricerca automatica in una cartella, scelta a mano o nessuno
- [x] Uscita dal gioco e menu senza tastiera (joypad: Select + Start e tieni Start; pannello: Moneta + Start e Moneta + Pulsante 1), configurabili
- [x] Comandi manuali: assegnazione a mano di tasti, pulsanti e assi (tastiera, pad, encoder) per due giocatori, in sequenza guidata, con controllo dei conflitti; valgono per RetroArch, MAME e per il menu (da provare con hardware reale)
- [ ] Verifica dei comandi con un pannello arcade e un pad reali
- [x] Sistema "Arcade (MAME)" con MAME autonomo (testato con 0.229): elenco letto da MAME stesso, varianti, comandi, effetti, supporto ai dischi CHD (da verificare con un MAME vero)
- [x] Filtro per famiglia in Arcade (MAME): Neo Geo, Capcom CPS, Sega, Taito, Namco, Konami e altre, con conteggi e scelta ricordata
- [x] Cartella ROM dedicata a ogni versione di MAME (es. mame0229), pulsante "usa un altro disco per tutto" e protezione se il disco esterno è scollegato
- [x] Pannello di ricerca anche senza tastiera: tastiera sullo schermo per joystick/pad/mouse, iniziali A-Z, risultati in tempo reale, ricerca per parole
- [x] Ricerca evoluta: tastiera intelligente (spegne i tasti inutili), disposizione alfabetica per joystick, anteprima con copertina, schede (a caso, famiglie, anni), preferiti e ultimi giochi
- [x] Direzione artistica "fumetto da picchiaduro" (carattere Anton incorporato, contorni, retino, raggi), suoni sintetizzati, sequenza INSERT COIN all'avvio e rotazione di copertine a riposo (attract mode)
- [x] Controllo ROM con il verificatore di MAME: elenco degli ZIP difettosi con i file da sostituire, segno ⚠ nella lista, controllo del singolo gioco, opzione per nascondere i giochi difettosi
- [x] Immagini locali per MAME/FBNeo (cartelle o ZIP con snap, flyers, titles…) con precedenza sul download
- [x] Pacchetto Multimedia: monitor video con cornice sul gioco selezionato (videosnaps) e lettore della colonna sonora (soundtrack), con pausa da tastiera e pad (da verificare dentro Electron: codec e riproduzione)
- [x] Copertine sempre presenti: ricerca in altre regioni e nel repository FBNeo; se manca tutto, copertina fumettistica generata (titolo, sistema, anno, screenshot)
- [x] Sistemi FBNeo aggiuntivi: Game Gear, PC Engine/TurboGrafx-16, SuperGrafx, SG-1000, FDS, Neo Geo Pocket, ColecoVision, MSX, ZX Spectrum, Channel F, Astrocade (da provare con le ROM reali)
- [x] Cartella DAT nelle impostazioni (FinalBurn Neo, Kawaks, MAME): nome breve → titolo per le console, con precedenza sulle Software List di MAME (da provare con i DAT reali)
- [x] Home: disegni originali per categoria di macchina (cabinato, portatile, cartuccia, disco, computer) e scheda "Sistemi in home" nelle impostazioni per nascondere i sistemi
- [x] Dreamcast, Naomi, Atomiswave (Flycast) e PlayStation (pcsx_rearmed), con controllo dei BIOS (da provare con RetroArch reale)
- [x] Debug: salvataggi sicuri, registro errori, istanza unica, ripristino della finestra, test automatici (`npm test`) e schermata Diagnostica
- [x] Schermo: quattro modalità immagine (altezza piena, pixel perfetti, pixel perfetti in altezza, stirata) con anteprima sulle misure reali del tuo schermo, modalità diversa per sistema, rotazione per monitor verticale (MAME), bordo grafico (overlay) di RetroArch (da provare con RetroArch reale)
- [x] Temi grafici (Picchiaduro, Neon, Fosforo verde, Notte) e scelta manuale dello shader CRT
- [x] Nintendo 64, Nintendo DS, Atari Jaguar e 3DO (core RetroArch, da provare con le ROM reali)
- [ ] Mega CD (core dedicato)
- [ ] GameCube e Wii (da verificare sulle prestazioni)

## Fase 3 — Estensioni
- [x] Atari Jaguar e 3DO
- [x] Filtri (famiglia, anno), preferiti e ultimi giochi
- [x] Shader CRT e overlay
- [x] Temi grafici alternativi
- [ ] Statistiche di gioco (tempo giocato, più giocati, "continua a giocare" nella home)
- [x] Installer per Windows (electron-builder + flusso automatico su GitHub; da provare su Windows)

## Da fare (in ordine di valore)
**In verifica con l'hardware reale**
- [ ] Salvataggi delle console: prova con RetroArch reale (finestra "continua / nuova partita", copia .prev, memory card)
- [ ] Verifica con pad Xbox ed encoder I-PAC: uscita, menu, assegnazione manuale
- [ ] Bordi, modalità schermo e shader su RetroArch e schermi reali
- [ ] Crash di MAME su alcuni giochi (Captain America, Street Fighter EX): in attesa delle prove `-nodrc`, `-video none`

**Funzioni**
- [ ] Giochi a più dischi (PlayStation, 3DO, Saturn…): generare i file .m3u per cambiare disco senza uscire
- [ ] Controllo degli aggiornamenti (avviso quando c'è una nuova release su GitHub)
- [ ] Immagini locali anche per le console (oggi solo Arcade, MAME e Neo Geo; per le altre c'è la cartella `artwork`)
- [ ] Download in blocco delle copertine di un intero sistema
- [ ] Ripresa automatica scelta per singola console (oggi è un solo interruttore per tutte)
- [ ] Messaggi di errore del motore interno (Diagnostica, avvio giochi) in inglese
- [ ] Scaricamento di RetroArch dal programma
- [ ] Mega CD, Sega Saturn
- [ ] GameCube e Wii, PlayStation 2, PSP (da verificare sulle prestazioni)
- [ ] Trofei (RetroAchievements) e trucchi (cheat)

**Rimandate o escluse**
- Sostituzione della shell di Windows (avvio senza desktop): rimandata, rischiosa senza un ripristino chiaro
- Firma digitale dell'installer (a pagamento): per ora si spiega l'avviso di Windows
- Demul e altri emulatori autonomi: esclusi, si usano i core di RetroArch (Flycast per Dreamcast e Naomi)
- macOS e Linux: esclusi

## Principi del progetto
- Nessun costo e nessuna API a pagamento: i dati devono funzionare offline o da fonti gratuite.
- Nessuna ROM né BIOS inclusi o scaricati dal programma.
- Pensato per chi non è esperto: ogni funzione deve avere un percorso guidato.
