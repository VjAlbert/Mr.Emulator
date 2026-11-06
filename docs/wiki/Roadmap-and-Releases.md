[◀ Home](Home) · **Roadmap & releases**

# 🗺️ Roadmap & releases

The authoritative documents are in the repository: the [roadmap](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/ROADMAP.md) (also [in Italian](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/ROADMAP.it.md)), the open [issues](https://github.com/VjAlbert/Mr.Emulator/issues) and the [release notes](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/RELEASE_NOTES.md). Downloads are on the [Releases](https://github.com/VjAlbert/Mr.Emulator/releases) page. This page is a readable summary.

## Guiding principles

- **No cost, no paid APIs** — data must work offline or from free sources.
- **No ROMs or BIOS included or downloaded** — ever.
- **Made for non-experts** — every feature needs a guided path.
- **Runs on modest PCs** — a laptop with an i7 (7th gen), 16 GB RAM and a 6 GB graphics card is the reference *minimum*; weaker machines are served by the Light level.

## Where we are

**Done**
- Arcade (FBNeo, standalone MAME), Neo Geo, Sega, Nintendo, NEC/SNK, PlayStation, N64, DS, Dreamcast, Naomi, Atomiswave, Jaguar, 3DO and many 8-bit systems.
- Guided first run, core download, BIOS verification, find RetroArch/MAME on your PC.
- Auto-tuning per system, screen modes with live preview, borders, CRT shaders and pixel sharpness.
- Saves with *Continue / New game*, per-console resume, MAME high scores, backup/restore.
- Trophies (RetroAchievements) and cheats.
- Covers for every system with per-system status, an image cache you control, local Multimedia packs.
- Comic and stage styles, console illustrations and photos, English and Italian.
- Arcade-panel presets, manual mapping, exit/menu combos, cabinet mode.
- Diagnostics with a copyable report; automated tests including Windows CI.

**Still being verified on real hardware**
- Console saves across many games and the `.prev` safety copy.
- Xbox gamepads and I-PAC encoders (exit, menu, manual mapping).
- Trophies with a real account; cheats on games that have a file.
- Pixel sharpness (xBRZ) across more systems.

**Next**
- Signed installer (the last step after testing).
- More wiki pages and screenshots.

**Out of scope for now**
- Mega CD, Sega Saturn, GameCube, Wii, PlayStation 2, PSP.
- Replacing the Windows shell (booting without the desktop) — risky without a clear way back.
- Other stand-alone emulators (Demul…) — RetroArch cores are used instead.
- macOS and Linux.

## Release history (highlights)

| Version | Highlights |
|---|---|
| **0.2.x** | Comic style for the whole program; console illustrations and photos; two styles; image cache control; covers redesign; trophies and cheats; pixel sharpness; per-console resume; many fixes. |
| **0.1.5** | Console cover download; full gamepad mapping; multi-disc games; update notice; play statistics; saves redesign; arcade resume and high scores; borders per system. |
| **0.1.0 and earlier** | English/Italian, "PRESS START" title screen, first-run guide with core download, manual button mapping, screen modes, new systems, themes, cabinet mode, diagnostics. |

Each release is built on GitHub (free Windows runner) after typecheck and tests pass; the installer is attached to the release.

[◀ Glossary](Glossary) · [Home ▶](Home)
