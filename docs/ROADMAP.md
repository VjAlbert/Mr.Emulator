# Mr. Emulator roadmap

**English** · [Italiano](ROADMAP.it.md)

> Open items are tracked as [GitHub Issues](https://github.com/VjAlbert/Mr.Emulator/issues) and on the project board. This page is the big picture. The Italian copy is [`ROADMAP.it.md`](ROADMAP.it.md).

Reference platform: **Windows**. The code keeps paths and process launching behind small modules so that other operating systems are not made impossible, but they are not a goal right now.

Reference *minimum* hardware: a laptop with an **Intel Core i7 (7th gen), 16 GB of RAM and a 6 GB dedicated graphics card**. The interface must stay smooth on it and make the most of stronger PCs. Weaker machines (6–8 GB RAM, small GPU) are served by the *Light* level and must always keep working.

## Phase 0 — Foundations
- [x] Idea and architecture (front end + RetroArch as the engine)
- [x] Electron + TypeScript + React project structure
- [x] Abstraction layer for paths and process launching

## Phase 1 — Arcade and 8/16-bit consoles
Systems: Arcade (MAME, FBNeo), Neo Geo, Master System, Mega Drive, NES, SNES, Game Boy / Color / Advance.

- [x] ROM folder scan (one sub-folder per system)
- [x] Game library with preview
- [x] Covers and images downloaded automatically (libretro-thumbnails, with a local cache)
- [x] Arcade and Neo Geo covers (title taken from FBNeo's DAT, 7,718 games)
- [x] BIOS files (e.g. `neogeo.zip`) hidden from the list
- [x] 3D cover carousel, rotating backdrop, wipes and light effects (with a "reduced effects" mode)
- [x] Full archives: background scan, index saved to disk, virtual list, search and page jumps (tested on 54,000 fake files)
- [x] Bulk cover download for a whole system (Settings → Covers)
- [x] "Character select" style system screen
- [x] Launch games through RetroArch and return to the launcher
- [x] Keyboard, mouse and gamepad navigation

## Phase 2 — Guided setup and heavier systems
- [x] ROM and BIOS folders created at first run (`Documents\MrEmulator`)
- [x] First-run guide (folders, RetroArch, cores, BIOS, MAME) and the "press start" title screen
- [x] Core download from the official RetroArch archive
- [x] BIOS check by known MD5 (PlayStation, Dreamcast, FDS; presence only for the others), without downloading them
- [x] Italian / English interface
- [x] Auto-tuning: PC and screen detection, Light / Balanced / Max profiles per system, generated RetroArch config
- [x] Powerful graphics card for games on dual-GPU laptops (Windows)
- [x] "How did it go?" question after each game: each system's level adapts
- [x] Keyboard controls (WASD + J/K/L) and I-PAC arcade-panel preset (2 players, 6 buttons) with an exit combo on the panel
- [x] **Controls** screen to test keyboard, encoders and pads in real time
- [x] Saves: one folder, autosave every 10 s, **Continue / New game** before console games (replaces the memory card), per-game resume in arcade, MAME high scores, backup and restore as ZIP
- [x] Graphic border (overlay) per system: automatic search in a folder, manual choice or none
- [x] Exit and menu without a keyboard (pad: Select + Start, hold Start; panel: Coin + Start, Coin + Button 1), configurable
- [x] Manual mapping of keys, buttons and axes for two players, with conflict detection; used by RetroArch, MAME and the menu
- [x] "Arcade (MAME)" system with standalone MAME: list read from MAME itself, variants, controls, effects, CHD disk support
- [x] Family filter in Arcade (MAME): Neo Geo, Capcom CPS, Sega, Taito, Namco, Konami and more
- [x] A ROM folder per MAME version (e.g. `mame0229`), "use another drive for everything", protection when an external drive is unplugged
- [x] Search without a keyboard: on-screen keyboard for joystick/pad/mouse, A–Z initials, live results, word search
- [x] Advanced search: smart keyboard (greys out useless keys), cover preview, tabs (random, families, years), favorites and recent games
- [x] "Fighting-game comic" art direction (embedded Anton font, outlines, halftone, rays), synthesized sounds, INSERT COIN sequence and idle cover rotation (attract mode)
- [x] ROM check with MAME's verifier: broken ZIPs with the files to replace, ⚠ in the list, single-game check, option to hide broken games
- [x] Local images for MAME/FBNeo (folders or ZIPs with snaps, flyers, titles…) taking precedence over downloads
- [x] Multimedia pack: framed video of the selected game (videosnaps) and a soundtrack player
- [x] Covers always present: other regions and the FBNeo repository are searched; if nothing exists, a generated comic-style cover
- [x] More FBNeo systems: Game Gear, PC Engine/TurboGrafx-16, SuperGrafx, SG-1000, FDS, Neo Geo Pocket, ColecoVision, MSX, ZX Spectrum, Channel F, Astrocade
- [x] DAT folder in Settings (FinalBurn Neo, Kawaks, MAME): short name → title for consoles, taking precedence over MAME Software Lists
- [x] Home: original illustrations per machine category and a "Systems on home" tab to hide systems
- [x] Dreamcast, Naomi, Atomiswave (Flycast) and PlayStation (pcsx_rearmed) with BIOS checks
- [x] Debugging: safe saving, error log, single instance, window restore, automated tests (`npm test`) and the Diagnostics screen
- [x] Screen: four image modes with a preview on your real screen, per-system mode, rotation for vertical monitors (MAME), RetroArch overlays
- [x] Colour themes (Fighter, Neon, Green phosphor, Night) and manual CRT shader choice
- [x] Nintendo 64, Nintendo DS, Atari Jaguar and 3DO (RetroArch cores)

## Phase 3 — Extensions
- [x] Atari Jaguar and 3DO
- [x] Filters (family, year), favorites and recent games
- [x] CRT shaders and overlays
- [x] Alternative themes
- [x] Play statistics: time and sessions in the preview, "most played" list in search
- [x] Windows installer (electron-builder + automatic workflow on GitHub; unsigned)

## Phase 4 — Polish (0.2.x)
- [x] Comic style for the **whole program** plus a second *Stage* style; illustrated consoles and stylised user photos
- [x] Settings reorganised (Screen and Covers tabs, guide last); settings adapt to the screen resolution
- [x] Covers redesigned: per-system cards with progress, "not available online" counts, last-search date, "find covers for incomplete systems"
- [x] Image cache under control: choose its folder, move it, compress it, remove pack copies, set a size limit; no more copies of Multimedia-pack images
- [x] Per-console resume
- [x] Trophies (RetroAchievements) and cheats (database download with progress bar, automatic loading per game)
- [x] Pixel sharpness (soft / xBRZ), offered only when the PC can take it, combinable with the CRT effect
- [x] Find RetroArch and MAME on the PC and link to their official sites, with a MAME / ROM-set version warning (no automatic download, by design)
- [x] Engine and diagnostics messages in English; Diagnostics shows the image settings requested at the last game
- [x] Screen-mode fixes: stretched mode switches the border off; RetroArch no longer remembers the last aspect ratio
- [x] Bilingual **wiki** published automatically from `docs/wiki`

## To do (by value)

**Being verified on real hardware** — each has an issue with a test checklist
- [ ] Console saves across more games: Continue / New game, `.prev` copy, per-console switch ([#1](https://github.com/VjAlbert/Mr.Emulator/issues/1))
- [ ] Xbox gamepads and I-PAC encoders: exit, menu, manual mapping ([#2](https://github.com/VjAlbert/Mr.Emulator/issues/2))
- [ ] Trophies with a real account ([#3](https://github.com/VjAlbert/Mr.Emulator/issues/3))
- [ ] Cheats on games that have a cheat file ([#4](https://github.com/VjAlbert/Mr.Emulator/issues/4))
- [ ] Pixel sharpness on more systems and PCs ([#5](https://github.com/VjAlbert/Mr.Emulator/issues/5))
- [x] Borders, screen modes and shaders tried on real RetroArch and screens
- [x] PS3-clone gamepad (Xsail) tried: works
- [x] MAME crashes on some games: fixed
- [x] PlayStation resume (Crash Bandicoot): works

**Next**
- [ ] Signed installer — the last step after testing ([#6](https://github.com/VjAlbert/Mr.Emulator/issues/6))
- [ ] More wiki pages and screenshots ([#7](https://github.com/VjAlbert/Mr.Emulator/issues/7))
- [ ] Optional higher internal resolution for 3D consoles ([#8](https://github.com/VjAlbert/Mr.Emulator/issues/8))

**Postponed or excluded**
- Mega CD and Sega Saturn ([#9](https://github.com/VjAlbert/Mr.Emulator/issues/9)); GameCube, Wii, PlayStation 2 and PSP ([#10](https://github.com/VjAlbert/Mr.Emulator/issues/10)): outside the current scope
- Replacing the Windows shell (booting without the desktop): postponed, risky without a clear way back
- Demul and other stand-alone emulators: excluded — RetroArch cores are used (Flycast for Dreamcast and Naomi)
- macOS and Linux: excluded

## Project principles
- No cost and no paid APIs: data must work offline or from free sources.
- No ROMs or BIOS files included or downloaded by the program.
- Made for non-experts: every feature needs a guided path.
