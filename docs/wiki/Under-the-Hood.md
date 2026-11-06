[◀ Home](Home) · **Under the hood**

# 🛠️ Under the hood

For contributors and the curious.

## Stack

**Electron + TypeScript + React**, built with electron-vite. Windows is the reference platform; the code keeps paths and process launching behind small modules so other systems are not made impossible, but they are not a goal.

```
src/
  main/       Electron main process: scanning, launching, profiles, saves, covers, cache, diagnostics
  preload/    The typed bridge `window.mr`
  renderer/   React UI (screens, styles.css, i18n, the comic/stage styles)
  shared/     Types used by both sides (Settings, SystemDef, MrApi…)
tests/        node:test suite (compiled with tsc, run by tests/run.cjs)
docs/         Roadmap, release notes, this wiki
```

## How a game is launched

1. The renderer asks the main process to launch a game.
2. **Profiles** (`profiles.ts` / `optimize.ts`) turn *hardware + screen + system + your settings* into RetroArch settings: level, image mode, overlay, CRT shader, sharpness, run-ahead, refresh rate, monitor.
3. **Saves** (`saves.ts`) add the save/state folders and the resume behaviour; **extras** (`extras.ts`) add trophies and cheats; **inputs** add the controller mapping.
4. The result is written to `retroarch-mr.cfg` and RetroArch is started with `-L <core> <game> --appendconfig <cfg> --verbose --log-file …`. For MAME a `mame.ini` and a controller file are generated and MAME is started with `-inipath`.
5. When the process exits the launcher comes back; after a real game it may ask "how did it go?".

When both pixel sharpness and a CRT effect are on, `shaderchain.ts` merges the two `.slangp` presets into one (RetroArch applies a single preset).

## Where things live

| What | Where |
|---|---|
| Settings, logs, `retroarch-mr.cfg`, `mame/` | `%APPDATA%\Mr. Emulator` |
| Cover cache (and console photos if the cache was moved) | your chosen cache folder → `MrEmulator-artwork`, or `…\Mr. Emulator\artwork` |
| Saves, states, MAME NVRAM and high scores | the saves folder (default: next to your ROM folder) |
| Cheat database | `cheats` next to your ROM folder |

## Translations

Interface text is written in Italian inside `t('…')` calls and translated through a dictionary (`renderer/src/en.ts`); messages from the main process use `mt('…')` with `main/en-main.ts`. Tests fail if a string has no English entry or the `{placeholders}` do not match.

## Tests and releases

- `npm run typecheck`, `npm test` (node:test; on Windows CI too), `npm run build`.
- A GitHub Actions workflow builds the Windows installer with electron-builder. It runs typecheck and tests first, and publishes a release when started with *Publish* or on a `v*` tag.

## Contributing

1. Open an issue describing what you want to change.
2. Keep changes focused; add or update tests (`tests/*.test.ts`).
3. Keep user-visible strings in `t()`/`mt()` with English entries.
4. Run `npm run typecheck && npm test` before opening a pull request.

[◀ Privacy & legal](Privacy-and-Legal) · [Next: Settings reference ▶](Settings-Reference)
