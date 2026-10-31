<div align="center">

# ⚡ MR. EMULATOR ⚡

### *Il tuo cabinet arcade personale. Scegli il sistema. Scegli il gioco. FIGHT!*

![Stato](https://img.shields.io/badge/stato-in%20sviluppo-orange?style=for-the-badge)
![Piattaforma](https://img.shields.io/badge/piattaforma-Windows-blue?style=for-the-badge)
![Licenza](https://img.shields.io/badge/licenza-MIT-green?style=for-the-badge)
![Costo](https://img.shields.io/badge/costo-0%E2%82%AC%20per%20sempre-red?style=for-the-badge)

</div>

---

## 🕹️ Cos'è Mr. Emulator

**Mr. Emulator** è un launcher grafico per giochi arcade e console classiche, pensato per chi vuole **giocare, non configurare**.

Un'interfaccia veloce, spettacolare e interamente navigabile con **tastiera, mouse, gamepad o pannello arcade**, ispirata alle schermate di selezione dei grandi picchiaduro a incontri. Dietro le quinte usa motori di emulazione open source consolidati; davanti a te c'è solo la scelta più importante: **a cosa giochiamo stasera?**

> 🚧 **Il progetto è all'inizio.** Esiste già un primo prototipo funzionante dell'interfaccia (selezione sistema, lista giochi, impostazioni, avvio tramite RetroArch). Il resto è nella roadmap.

---

## ✨ Cosa vuole essere

- 🎮 **Selezione sistema stile "character select"**: griglia animata, cursore dinamico, anteprima grande.
- 🖼️ **Libreria visiva**: copertine e schermate scaricate in automatico da [libretro-thumbnails](https://github.com/libretro-thumbnails) (gratuito, senza account né chiavi API) e salvate in locale.
- ⚡ **Transizioni rapide** con tagli diagonali, effetti e suoni da arcade.
- 🧭 **Input universale**: tastiera, mouse, gamepad, encoder per pannelli arcade (I-PAC, Zero Delay e simili).
- 🪄 **Configurazione guidata** al primo avvio, pensata per chi non è esperto.
- 🔍 **Controllo dei BIOS**: ti dice cosa manca, cosa è sbagliato e dove metterlo.
- 🖥️ **Si adatta al tuo PC**: profili *Leggero*, *Bilanciato* e *Massimo*, dai portatili datati ai computer potenti.
- 💸 **Zero costi**: nessun abbonamento, nessuna API a pagamento, nessuna chiave da registrare.

---

## 🎯 Sistemi previsti

| Fase | Sistemi |
|:--:|---|
| **1** | Arcade (MAME, FBNeo), Neo Geo, Master System, Mega Drive, NES, SNES, Game Boy / Color / Advance |
| **2** | Nintendo 64, Nintendo DS, Mega CD, Famicom Disk System, GameCube, Wii |
| **3** | Atari Jaguar, 3DO e altri sistemi |

L'elenco può cambiare strada facendo. Il motore principale sarà [RetroArch](https://www.retroarch.com/) con i core Libretro, affiancato da emulatori dedicati dove serve.

---

## 🚀 Installazione

> In arrivo: l'installer per **Windows** nella sezione *Releases*.

### Provarlo adesso (sviluppo)

Servono [Node.js](https://nodejs.org/) e [RetroArch](https://www.retroarch.com/) già installato.

```bash
git clone https://github.com/VjAlbert/Mr.Emulator.git
cd Mr.Emulator
npm install
npm run dev
```

Poi, dalle **Impostazioni** del programma, indica la cartella delle ROM (con una sottocartella per sistema: `snes`, `megadrive`, `nes`…) e il percorso di `retroarch.exe`. Senza ROM configurate vedrai giochi di esempio, utili per provare l'interfaccia.

Comandi utili: `npm run typecheck` (controllo del codice) e `npm run build`.

L'idea è semplice:

1. Scarica l'installer.
2. Indica la cartella con le tue ROM.
3. Mr. Emulator riconosce i sistemi, prepara i motori di emulazione e ti guida sui BIOS mancanti.

---

## ⚖️ Importante: ROM e BIOS

**Mr. Emulator non include, non scarica e non distribuisce ROM né BIOS.**

Il programma lavora con i file che possiedi e che hai ottenuto legalmente, per esempio dai backup dei tuoi giochi e delle tue console. Questo repository non conterrà mai materiale protetto da copyright.

---

## 🗺️ Roadmap

La roadmap completa è in [`docs/ROADMAP.md`](docs/ROADMAP.md).

- [x] Idea e definizione dell'architettura
- [x] Prototipo dell'interfaccia (selezione sistema, lista giochi, impostazioni)
- [x] Avvio dei giochi tramite RetroArch (da provare sul campo)
- [x] Copertine scaricate automaticamente e conservate in locale
- [ ] Configurazione guidata e controllo dei BIOS
- [ ] Mappatura di tastiera e controller
- [ ] Installer per Windows

---

## 🧱 Tecnologie

- **Electron + TypeScript + React** per l'interfaccia
- **RetroArch / Libretro** come motore di emulazione principale
- Metadati e immagini da fonti **gratuite e aperte** (database Libretro, DAT No-Intro/Redump, libretro-thumbnails)

---

## 🙏 Ringraziamenti

Mr. Emulator esiste grazie al lavoro della comunità open source: [RetroArch e Libretro](https://www.libretro.com/), [MAME](https://www.mamedev.org/), [FinalBurn Neo](https://github.com/finalburnneo/FBNeo) e tutti gli sviluppatori dei core di emulazione.

---

## 📄 Licenza

Distribuito con licenza [MIT](LICENSE).

<div align="center">

**INSERT COIN TO CONTINUE** 🪙

</div>
