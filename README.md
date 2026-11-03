<div align="center">

<img src="build/icon.png" width="120" alt="Mr. Emulator icon">

# MR. EMULATOR

### *Your personal arcade cabinet. Pick a system. Pick a game. FIGHT!*

[![Download for Windows](https://img.shields.io/badge/%E2%AC%87_DOWNLOAD_FOR_WINDOWS-ff2d55?style=for-the-badge&logo=windows&logoColor=white&labelColor=1b1b2a)](https://github.com/VjAlbert/Mr.Emulator/releases/latest)

[![Latest release](https://img.shields.io/github/v/release/VjAlbert/Mr.Emulator?style=flat-square&color=ffd400&label=latest%20release)](https://github.com/VjAlbert/Mr.Emulator/releases/latest)
[![Downloads](https://img.shields.io/github/downloads/VjAlbert/Mr.Emulator/total?style=flat-square&color=17c964)](https://github.com/VjAlbert/Mr.Emulator/releases)
![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Cost](https://img.shields.io/badge/cost-%E2%82%AC0%20forever-red?style=flat-square)

**English** · [Italiano](README.it.md)

<img src="docs/img/title.png" width="720" alt="Mr. Emulator title screen">

</div>

---

## What is Mr. Emulator?

A fast, flashy launcher for arcade and classic console games, built for people who want to **play, not configure**. It is navigated entirely with a **keyboard, mouse, gamepad or arcade panel**, and behind the scenes it drives proven open-source emulators ([RetroArch](https://www.retroarch.com/) cores and [MAME](https://www.mamedev.org/)). In front of you there is only one decision: *what are we playing tonight?*

<div align="center">
<img src="docs/img/home.png" width="49%" alt="System select screen"> <img src="docs/img/controls.png" width="49%" alt="Button assignment">
</div>

## Download

> 1. Click the big **Download for Windows** button above (or open the [Releases](https://github.com/VjAlbert/Mr.Emulator/releases/latest) page) and download `Mr-Emulator-Setup-<version>.exe`.
> 2. Run it. The installer shows, in plain words, what you will need (RetroArch, BIOS files, your ROMs).
> 3. Start Mr. Emulator: a **first-run guide** walks you through the rest.
>
> Windows may show *"Windows protected your PC"* because the app is not signed with a paid certificate. Click **More info → Run anyway**.

## What's new

- 🌍 **English and Italian** in the program, switchable any time (Settings → General, or the IT/EN buttons on the title screen).
- 🎬 **New "PRESS START" title screen** with the system parade.
- 🧭 **First-run guide**: folders, RetroArch, **one-click core download**, BIOS checklist (with known-file verification) and MAME.
- 🎛️ **Manual button mapping** for keyboards, pads and arcade encoders, for two players, with conflict detection. It applies to RetroArch, MAME and the launcher menu.
- 🖥️ **Screen modes** (full height, pixel perfect, pixel perfect in height, stretched) with a live preview using your real screen size, per-system overrides, vertical-monitor mode for MAME and RetroArch overlays.
- 🕹️ **New systems**: Dreamcast, Sega Naomi, Atomiswave, PlayStation, Nintendo 64, Nintendo DS, Atari Jaguar, 3DO, PC Engine/TurboGrafx-16, SuperGrafx, Game Gear, SG-1000, Famicom Disk System, Neo Geo Pocket, ColecoVision, MSX, ZX Spectrum, Channel F and Astrocade.
- 🎨 **Themes** (Fighter, Neon, Green phosphor, Night) and a manual **CRT shader** choice.
- 🏠 **Cabinet mode**: start with Windows, borderless full screen, hidden cursor, protected exit.
- 🖼️ **Covers everywhere**: other regions and repositories are searched, and a generated comic-style cover appears when none exists.
- 🩺 **Diagnostics** screen that checks folders, cores, BIOS files and logs, and a text report you can copy.
- 🛡️ Safer saving (settings survive power cuts), error log, single instance.

## Supported systems

| Family | Systems |
|---|---|
| **Arcade** | Arcade (FBNeo), Arcade (standalone MAME), Neo Geo, Sega Naomi, Atomiswave |
| **Sega** | Master System, Mega Drive, Game Gear, SG-1000, Dreamcast |
| **Nintendo** | NES, Famicom Disk System, SNES, Game Boy / Color / Advance, Nintendo 64, Nintendo DS |
| **NEC / SNK** | PC Engine / TurboGrafx-16, SuperGrafx, Neo Geo Pocket |
| **Sony / Atari / 3DO** | PlayStation, Atari Jaguar, 3DO |
| **Computers & others** | MSX, ZX Spectrum, ColecoVision, Fairchild Channel F, Bally Astrocade |

The list can change as the project grows. Systems you do not use can be hidden in *Settings → Systems on home*.

## Quick start

1. **Games** – the first-run guide creates one folder per system (`nes`, `snes`, `megadrive`, `psx`…) in `Documents\MrEmulator` or on any drive you choose. Copy your ROMs there.
2. **RetroArch** – download it from [retroarch.com](https://www.retroarch.com/) (Windows 64-bit, just extract it) and point the guide to `retroarch.exe`. Mr. Emulator downloads the **cores** for you from the official archive.
3. **BIOS** – only a few systems need one. The guide shows a checklist:

| System | File | Folder |
|---|---|---|
| Neo Geo | `neogeo.zip` | `bios\fbneo` |
| PlayStation | `scph5501.bin` (or `5500` / `5502`) | `bios` |
| Dreamcast | `dc_boot.bin`, `dc_flash.bin` | `bios\dc` |
| Naomi / Atomiswave | `naomi.zip`, `awbios.zip` | `bios\dc` |
| Famicom Disk System | `disksys.rom` | `bios` |
| 3DO | `panafz10.bin` | `bios` |

4. **MAME** *(optional)* – for the Arcade (MAME) system and for proper game names; use the same version as your ROM set.

Something not working? Open **Settings → Diagnostics**: it tells you what is missing and how to fix it.

## Controls

- **Keyboard**: arrows + Enter / Esc / Tab, `F2` favorite, `F3` soundtrack, `/` search.
- **Gamepad / arcade panel**: D-pad or stick to move, button 1 confirm, button 2 back. Presets for a laptop keyboard (WASD + J K L), I-PAC-style encoders, or your own mapping.
- Exiting a game on a cabinet without a keyboard: hold **Coin 1** and press **Start 1**.

## Screen and cabinet tips

- Most arcade and console games are 4:3: on a widescreen they have side bars unless you stretch them (which distorts) or use an artwork overlay.
- *Pixel perfect* works best on screens whose height is a multiple of 224/240 lines: **1920×1200 (×5)**, **2560×1440 (×6)**, **4K (×9)**.
- For a cabinet, a **27" 2560×1440 IPS** panel behind a bezel with a 4:3 opening is a very safe choice.

## Build from source

```bash
git clone https://github.com/VjAlbert/Mr.Emulator.git
cd Mr.Emulator
npm install
npm run dev        # run the app in development
npm test           # automated tests
npm run dist       # Windows installer (run on Windows) → release\
```

The installer is also built on GitHub (free Windows runner): **Actions → Installer for Windows → Run workflow**. Tick **"Publish a GitHub Release"** to publish it in *Releases* (this is what powers the download button), or push a tag such as `v0.2.0`.

Roadmap: [`docs/ROADMAP.md`](docs/ROADMAP.md).

## ⚖️ ROMs and BIOS

**Mr. Emulator does not include, download or distribute ROMs or BIOS files.** It works with files you own and obtained legally, for example backups of your own games and consoles. This repository will never contain copyrighted material.

## Built with

Electron · TypeScript · React · [RetroArch / Libretro](https://www.libretro.com/) · [MAME](https://www.mamedev.org/) · [FinalBurn Neo](https://github.com/finalburnneo/FBNeo) · covers from [libretro-thumbnails](https://github.com/libretro-thumbnails). Thanks to every emulator developer who made this possible.

## License

[MIT](LICENSE)

<div align="center">

**INSERT COIN TO CONTINUE** 🪙

</div>
