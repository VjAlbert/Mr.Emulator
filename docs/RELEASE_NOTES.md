## Mr. Emulator 0.1.5

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
