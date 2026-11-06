[◀ Home](Home) · **FAQ**

# ❓ Frequently asked questions

### Is it legal?
The program is. It contains no ROMs, BIOS files or emulators and downloads none. What you play must be files you own and obtained legally. See [Privacy & legal](Privacy-and-Legal).

### Where do I get ROMs and BIOS files?
Not from here, and we cannot help with that. Use backups of games and consoles you own.

### Does it need internet?
Only for optional things: covers, cores, cheats, update check. Playing works offline. Covers already downloaded stay in the cache.

### Does it include RetroArch and MAME?
No. You install them from their official sites; Mr. Emulator finds them on your PC and opens the official pages if they are missing. It downloads **cores** (libretro libraries) on request.

### Which RetroArch version?
It is developed and tested against recent RetroArch releases (checked with 1.22.x). Install shaders with *Online Updater → Update Slang Shaders* if you want the CRT and sharpness options.

### Which MAME version?
The one that matches your ROM set. A set is only valid for its own MAME version; the program warns you when the ROM folder name and the MAME version differ.

### Does it change my RetroArch configuration?
It never edits your `retroarch.cfg`. For each game it passes an extra config with `--appendconfig`, and tells RetroArch not to save its own config on exit during that session.

### Can I keep using RetroArch normally?
Yes. Mr. Emulator is only another way to start it. Your own RetroArch setup is untouched.

### Why Windows only?
It is the target platform and keeps the project small and testable. Other systems are not ruled out in the code but are not a goal right now.

### Why does Windows say "protected your PC"?
The installer is not signed with a paid certificate yet. Click *More info → Run anyway*. Signing is planned (see the [roadmap](Roadmap-and-Releases)).

### Why are some games or whole systems missing?
Check the folder name against [Systems & BIOS](Systems), the file extensions, and **Diagnostics**. Systems you hid in Settings do not appear on the home screen.

### Why no PlayStation 2, GameCube, Wii, Saturn, Mega CD or PSP?
They are heavy for the low-end PCs this project must run on, or need special handling. They are outside the current scope.

### My covers are missing.
Open *Settings → Covers*. The card shows how many exist online ("not available online" means none exists in the free archive). Your own Multimedia pack takes priority.

### The cache is huge / on drive C:.
*Settings → Covers → Space used*: remove pack copies, optimize, choose another folder and move the cache. New downloads are small.

### Where are my saves? Can I move them to another PC?
In the saves folder you chose (default next to the ROM folder). Use *Back up to a ZIP* and *Restore from a ZIP*. Saves are emulator states, so keep the same core/emulator versions on both PCs.

### Where are the settings and how do I reset them?
In `%APPDATA%\Mr. Emulator\settings.json`. Close the program and rename that file to start from defaults (a `.bak` copy is also kept).

### How do I change the language?
*Settings → General* (or the IT/EN buttons on the title screen).

### Does it work with my gamepad / arcade panel?
Probably — see [Controls](Controls). Use the Controls screen to test, and manual mapping if needed.

### Does it collect data?
No telemetry, no accounts. The only recurring network request is the optional daily update check. Full list in [Privacy & legal](Privacy-and-Legal).

### How do I report a bug or ask for a feature?
Open an [issue](https://github.com/VjAlbert/Mr.Emulator/issues) with the **Diagnostics** text, your RetroArch and MAME versions, and what happened.

### How is it different from other launchers?
See the honest [Comparison](Comparison).

[◀ Cabinet guide](Cabinet-Guide) · [Next: Glossary ▶](Glossary)
