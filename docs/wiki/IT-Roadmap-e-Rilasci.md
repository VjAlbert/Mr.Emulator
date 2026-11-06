[◀ Home](IT-Home) · **Roadmap e rilasci**

# 🗺️ Roadmap e rilasci

I documenti di riferimento stanno nel repository: la [roadmap](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/ROADMAP.it.md) (anche [in inglese](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/ROADMAP.md)), le [segnalazioni aperte](https://github.com/VjAlbert/Mr.Emulator/issues) e le [note di rilascio](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/RELEASE_NOTES.md). I download sono nella pagina [Releases](https://github.com/VjAlbert/Mr.Emulator/releases). Questa pagina ne è un riassunto leggibile.

## Principi guida

- **Nessun costo, nessuna API a pagamento** — i dati devono funzionare offline o da fonti gratuite.
- **Nessuna ROM o BIOS inclusi o scaricati** — mai.
- **Pensato per chi non è esperto** — ogni funzione ha bisogno di un percorso guidato.
- **Gira su PC modesti** — un portatile con i7 di settima generazione, 16 GB di RAM e scheda video da 6 GB è il *minimo* di riferimento; le macchine più deboli sono servite dal livello Leggero.

## A che punto siamo

**Fatto**
- Arcade (FBNeo, MAME autonomo), Neo Geo, Sega, Nintendo, NEC/SNK, PlayStation, N64, DS, Dreamcast, Naomi, Atomiswave, Jaguar, 3DO e molti sistemi a 8 bit.
- Primo avvio guidato, download dei core, verifica dei BIOS, ricerca di RetroArch/MAME sul PC.
- Autoguida per sistema, modalità schermo con anteprima, bordi, shader CRT e nitidezza dei pixel.
- Salvataggi con *Continua / Nuova partita*, ripresa per console, record di MAME, backup/ripristino.
- Trofei (RetroAchievements) e trucchi.
- Copertine per ogni sistema con stato per sistema, una cache delle immagini che controlli tu, pacchetti Multimedia locali.
- Stili fumetto e palcoscenico, illustrazioni e foto delle console, italiano e inglese.
- Preset per pannello arcade, assegnazione manuale, combinazioni di uscita/menu, modalità cabinato.
- Diagnostica con rapporto copiabile; test automatici anche sulla CI di Windows.

**Ancora in verifica su hardware reale**
- Salvataggi delle console su molti giochi e la copia di sicurezza `.prev`.
- Gamepad Xbox ed encoder I-PAC (uscita, menu, assegnazione manuale).
- Trofei con un account vero; trucchi sui giochi che hanno un file.
- Nitidezza dei pixel (xBRZ) su più sistemi.

**Prossimi passi**
- Installer firmato (l'ultimo passo dopo il collaudo).
- Altre pagine e screenshot per la wiki.

**Fuori ambito per ora**
- Mega CD, Sega Saturn, GameCube, Wii, PlayStation 2, PSP.
- Sostituire la shell di Windows (avvio senza desktop) — rischioso senza un ritorno chiaro.
- Altri emulatori autonomi (Demul…) — si usano i core di RetroArch.
- macOS e Linux.

## Storia dei rilasci (in sintesi)

| Versione | Novità principali |
|---|---|
| **0.2.x** | Stile a fumetto per tutto il programma; illustrazioni e foto delle console; due stili; controllo della cache delle immagini; copertine ridisegnate; trofei e trucchi; nitidezza dei pixel; ripresa per console; molte correzioni. |
| **0.1.5** | Download delle copertine delle console; mappatura completa del gamepad; giochi a più dischi; avviso di aggiornamento; statistiche di gioco; salvataggi ridisegnati; ripresa e record negli arcade; bordi per sistema. |
| **0.1.0 e precedenti** | Italiano/inglese, schermata «PREMI START», guida al primo avvio con download dei core, assegnazione manuale dei pulsanti, modalità schermo, nuovi sistemi, temi, modalità cabinato, diagnostica. |

Ogni release si costruisce su GitHub (macchina Windows gratuita) dopo che typecheck e test sono passati; l'installer è allegato alla release.

[◀ Glossario](IT-Glossario) · [Home ▶](IT-Home)
