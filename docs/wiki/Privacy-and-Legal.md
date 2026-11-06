[◀ Home](Home) · **Privacy & legal**

# 🔒 Privacy & legal

## ROMs, BIOS and emulators

**Mr. Emulator does not include, download or distribute ROMs, BIOS files or emulators.** It works with files you own and obtained legally — for example backups of your own games and consoles. The repository never contains copyrighted material. It never downloads or runs other programs by itself: RetroArch and MAME are installed by you from their official sites (the program only finds them and opens their pages).

System and game names, and console illustrations, are trademarks of their respective owners and are used only to identify systems. The screenshots in this wiki use **invented games** with covers drawn for the purpose.

## No telemetry, no accounts

The program does **not** collect or send usage data and does not need an account. Everything it stores is on your PC.

### Network connections it makes

| What | To | When |
|---|---|---|
| Covers and screenshots | `thumbnails.libretro.com`, `raw.githubusercontent.com` (libretro-thumbnails) and its file index via `api.github.com` | When you open a game / press *Find covers* (can be turned off). |
| Cores | `buildbot.libretro.com` (official libretro archive) | When you choose to install a core. |
| Cheat database | `buildbot.libretro.com` | When you press *Download cheats*. |
| Arcade title list | `raw.githubusercontent.com` (libretro-database) | To name arcade games. |
| New-version check | `api.github.com` (this repository's releases) | At most once a day; can be turned off in Settings. Nothing about you is sent. |
| Trophies | RetroAchievements, **through RetroArch** | Only if you turn trophies on. |

"Official site" buttons just open your browser.

## Your data

- **Settings** are stored in your user data folder (`%APPDATA%\Mr. Emulator`). The RetroAchievements **password is stored there in plain text** and written to the config file RetroArch reads — it never leaves your PC except to log in via RetroArch. Use a password you do not reuse, or leave trophies off.
- **Saves** are in the saves folder you choose; **covers** in the cache folder you choose.
- Uninstalling does not delete your games, saves or cache.

## Code signing

The installer is not signed yet. When it is, it will be signed through SignPath Foundation's open-source programme, only from the official GitHub workflow. Details: the [code signing policy](https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/CODE_SIGNING_POLICY.md).

## Licence

Mr. Emulator is released under the [MIT licence](https://github.com/VjAlbert/Mr.Emulator/blob/main/LICENSE). RetroArch, libretro cores and MAME have their own licences — check them on their sites.

[◀ Troubleshooting](Troubleshooting) · [Next: Under the hood ▶](Under-the-Hood)
