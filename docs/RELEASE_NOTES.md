## Mr. Emulator 0.2.8

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New and fixed
- ✨ **Pixel sharpness**: with the CRT effect on *Automatic*, sharpness now takes priority (the CRT lines were hiding it). Pick a CRT by hand to have both.
- 🩺 Diagnostics shows RetroArch's shader messages and the merged shader preset.

## Mr. Emulator 0.2.7

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New and fixed
- 🩺 **Diagnostics** now shows the pixel-sharpness choice, which shaders were found in RetroArch, and the shader requested at the last game.

## Mr. Emulator 0.2.6

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New and fixed
- 🛠️ **Fixed**: after playing in *Full screen (stretched)*, other image modes kept showing the stretched picture. RetroArch remembered the last aspect ratio on exit; the program now always sets it (and stops RetroArch from saving its own config on exit).

## Mr. Emulator 0.2.5

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New and fixed
- ✨ **Pixel sharpness** (Settings → Screen): Soft (sharp-bilinear) or High quality (xBRZ), usable together with the CRT effect. An option is offered only if this PC can handle it and the shader is installed; heavy systems step down automatically.
- 🛠️ **Fixed**: with *Full screen (stretched)* the graphic border covered the sides of the picture, so the game still looked "full height". The border is now turned off in that mode (Diagnostics shows it).

## Mr. Emulator 0.2.3

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New and fixed
- 🩺 **Diagnostics** now shows the image settings requested from RetroArch and MAME at the last game (to track the screen-mode problem).
- ⚡ Smoother screen changes: no full-screen blur or colour blending on the backdrop, animated layers moved to the GPU.

## Mr. Emulator 0.2.2

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New and fixed
- 🎨 **Comic style, rebuilt**: the whole program is now a comic page (paper with halftone dots, white panels with black ink borders and hard shadows, yellow caption boxes, sticker buttons) instead of a dark theme with a few comic details.
- 🪄 **Cheats folder next to your ROMs** (`…\cheats`), with a progress bar while downloading.
- 🖼️ **Settings → Covers** shows how many covers you already have for each system.
- 🔎 **Title search**: numbers and one/two-letter words must start a word (fewer false hits), exact titles first; still instant on 60,000 titles.
- 🖥️ **Settings adapt to the screen resolution**; the cover fade now covers the whole picture.
- 🛠️ **Fixed**: downloading cheats could fail with "no such file" (the temporary file now lives in the cheats folder); the Covers tab no longer breaks when counts are missing.

## Mr. Emulator 0.2.1

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New
- 🎨 **New home screen**: every system shows its console in a comic **poster** (burst, "1P START!" tag, ribbon) with **pop-out tiles** and a comic background that keeps the fade effects.
- 🎭 **Two styles**: *Comic* or *Stage* (spotlight). Choose in **Settings → Look**.
- 🕹️ **Console illustrations** for arcade, NES, SNES, Mega Drive, PlayStation and Game Boy.
- 📷 **Your own console photos**: drop `<system>.png` (e.g. `snes.png`) in the consoles folder (Settings → Look → open folder). Photos are automatically stylised (background removed, comic outline); can be turned off.
- 💾 **Resume for each console**: choose per system whether to continue where you left off (Settings → Saves).
- 🔎 **Finds RetroArch and MAME** already on your PC (guide and Settings → General) and links to their official sites; reminds you that MAME must match your ROM set's version.
- 🏆 **Trophies (RetroAchievements)** and 🪄 **cheats**: Settings → Trophies & cheats (cheat database downloaded with one click, applied automatically when the game has a file).
- 🌍 **Engine messages in English**: Diagnostics, game launch errors and MAME notices follow the program's language.
- 🗂️ **Settings reorganised**: new Screen and Covers tabs, "Redo the guide" last. Covers are searched only from Settings.
- 🎨 **Comic style for the whole program** (buttons, titles, game list, dialogs, comic-page background).
- 🧹 Code cleanup: unused code and styles removed.

### Previous: 0.1.5

**Download:** `Mr-Emulator-Setup-<version>.exe` below. Windows may warn that the app is unsigned: **More info → Run anyway**.

### New and fixed
- 🖼️ **Console covers**: the program now looks up the official cover list for each console and picks the right file even when your file name differs (regions, discs, "Zelda, The"…). **Covers** button in every system downloads all covers at once (with progress); optional automatic download when you open a system.
- 🎮 **Gamepad**: the mapping now covers the whole pad (L1, R1, **L2, R2, L3, R3**), D-pads reported as a "hat" and analog triggers, for PS3 clones and other non-Xbox pads.
- 💿 **Multi-disc games** (PlayStation, 3DO, Dreamcast): one entry per game with an automatic `.m3u`; swap discs from the RetroArch menu.
- 🔔 **Update notice** when a new release is out (one request to GitHub per day, can be turned off).
- ⏱ **Play statistics** (time and games played) in the preview, and a **Most played** list in the search panel.
- 🛠️ **Fixed**: opening a system could launch its first game by itself (a held button or a late click reached the new list). Also added a RetroArch log to Diagnostics to track save problems.
- 💾 **Saves**: one saves folder (next to the ROMs, or wherever you choose); console progress is saved automatically when you exit and every 10 seconds, and before launching a game with a save you choose **Continue** or **New game** (the old save is kept as a safety copy). This replaces the Memory Card.
- 🕹️ **Arcade**: in the game preview choose **New game / Resume** with ◀ ▶; MAME **high scores** are saved for supported games.
- 📦 **Settings → Saves**: open the folder, back up to a ZIP, restore, import existing saves from RetroArch and the previous MAME location.
- 🔧 **Borders**: when borders are on but a system has none, the previous border no longer sticks (RetroArch is told to switch it off). Diagnostics now lists the border each system will use.
- 🕹️ **Exit and game menu without a keyboard**: gamepad **Select + Start** to exit, hold **Start** for the menu; arcade panel **Coin 1 + Start 1** to exit, **Coin 1 + Button 1** for the menu. Configurable in *Controls*.
- 🖼️ **Border (overlay) for each system**: automatic search in a borders folder, manual choice or no border, per system.
- 🛠️ **Xbox gamepads in MAME**: Start and Coin now use the real Start/Back buttons (they were mapped to the stick clicks).
- 🧭 Menu of MAME (DIP switches, input mapping, reset) reachable from gamepad and arcade panel.

### Since 0.1.0
English / Italian, "PRESS START" title screen, first-run guide with core download and BIOS checklist, manual button mapping, screen modes with live preview, new systems (Dreamcast, Naomi, PlayStation, N64, DS, Jaguar, 3DO…), themes, cabinet mode, diagnostics.

Mr. Emulator does not include or download ROMs or BIOS files.
