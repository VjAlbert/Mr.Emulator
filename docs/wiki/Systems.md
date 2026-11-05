[◀ Home](Home.md) · **Systems & BIOS**

# 🎮 Systems & BIOS

Mr. Emulator does not emulate anything itself. Each system is run by a **libretro core in RetroArch** or by **standalone MAME**. The list grows over time; systems you do not use can be hidden in **Settings → Systems on home**.

## Supported systems

| Family | System | Engine | Folder | File types |
|---|---|---|---|---|
| **Arcade** | Arcade (FinalBurn Neo) | `fbneo` core | `arcade` | `.zip` `.7z` |
| | Arcade (standalone MAME) | MAME | `mame` | `.zip` `.7z` (+ CHD) |
| | Neo Geo | `fbneo` core | `neogeo` | `.zip` `.7z` |
| | Sega Naomi · Atomiswave | `flycast` core | `naomi` · `atomiswave` | `.zip` `.7z` `.chd` |
| **Sega** | Master System | `genesis_plus_gx` | `mastersystem` | `.sms` `.zip` |
| | Mega Drive | `genesis_plus_gx` | `megadrive` | `.md` `.gen` `.smd` `.bin` `.zip` |
| | Game Gear · SG-1000 | `fbneo` | `gamegear` · `sg1000` | `.zip` `.7z` |
| | Dreamcast | `flycast` | `dreamcast` | `.gdi` `.cdi` `.chd` `.cue` |
| **Nintendo** | NES | `nestopia` | `nes` | `.nes` `.zip` |
| | Famicom Disk System | `fbneo` | `fds` | `.zip` `.7z` |
| | Super Nintendo | `snes9x` | `snes` | `.sfc` `.smc` `.zip` |
| | Game Boy · Game Boy Color | `gambatte` | `gb` · `gbc` | `.gb` `.gbc` `.zip` |
| | Game Boy Advance | `mgba` | `gba` | `.gba` `.zip` |
| | Nintendo 64 | `mupen64plus_next` | `n64` | `.n64` `.z64` `.v64` `.zip` |
| | Nintendo DS | `melonds` | `nds` | `.nds` `.zip` |
| **NEC / SNK** | PC Engine · TurboGrafx-16 · SuperGrafx | `fbneo` | `pce` · `tg16` · `sgx` | `.zip` `.7z` |
| | Neo Geo Pocket | `fbneo` | `ngp` | `.zip` `.7z` |
| **Sony / Atari / 3DO** | PlayStation | `pcsx_rearmed` | `psx` | `.cue` `.chd` `.pbp` `.iso` |
| | Atari Jaguar | `virtualjaguar` | `jaguar` | `.j64` `.jag` `.zip` |
| | 3DO | `opera` | `3do` | `.iso` `.cue` `.chd` |
| **Computers & others** | MSX · ZX Spectrum · ColecoVision · Fairchild Channel F · Bally Astrocade | `fbneo` | `msx` · `spectrum` · `coleco` · `channelf` · `astrocade` | `.zip` `.7z` |

**Not supported (yet):** Mega CD, Sega Saturn, GameCube/Wii, PlayStation 2, PSP. See the [roadmap](../ROADMAP.md).

## BIOS files you may need

Only a few systems need a BIOS. The first-run guide shows a checklist and verifies the ones with a known checksum. **You must supply these yourself.**

| System | File | Put it in |
|---|---|---|
| Neo Geo | `neogeo.zip` | `bios\fbneo` (or next to the games) |
| PlayStation | `scph5501.bin` (or `scph5500` / `scph5502`…) | `bios` |
| Dreamcast | `dc_boot.bin` + `dc_flash.bin` | `bios\dc` |
| Naomi / Atomiswave | `naomi.zip` / `awbios.zip` | `bios\dc` or next to the games |
| Famicom Disk System | `disksys.rom` | `bios` |
| 3DO | `panafz10.bin` | `bios` |

## Folders

Each system has one folder under your games folder, named as in the table. Mr. Emulator scans them in the background and remembers the result, so opening a system is instant. You can put the games on any drive; if an external drive is unplugged the program says so instead of showing an empty list.

[◀ Features tour](Features.md) · [Next: Controls ▶](Controls.md)
