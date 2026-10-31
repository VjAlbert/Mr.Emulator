import type { SystemDef } from '@shared/types'

/**
 * Elenco dei sistemi supportati. Per aggiungerne uno basta una riga qui:
 * il resto del programma (scansione, interfaccia, avvio) lo gestisce da solo.
 */
export const SYSTEMS: SystemDef[] = [
  { id: 'arcade', name: 'Arcade', short: 'ARC', folder: 'arcade', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#ff2d55', phase: 1 },
  { id: 'neogeo', name: 'Neo Geo', short: 'NEO', folder: 'neogeo', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#ffb800', phase: 1 },
  { id: 'mastersystem', name: 'Master System', short: 'SMS', folder: 'mastersystem', extensions: ['.sms', '.zip'], core: 'genesis_plus_gx_libretro', color: '#2d7dff', phase: 1, thumbs: 'Sega - Master System - Mark III' },
  { id: 'megadrive', name: 'Mega Drive', short: 'MD', folder: 'megadrive', extensions: ['.md', '.gen', '.smd', '.bin', '.zip'], core: 'genesis_plus_gx_libretro', color: '#7b3dff', phase: 1, thumbs: 'Sega - Mega Drive - Genesis' },
  { id: 'nes', name: 'NES', short: 'NES', folder: 'nes', extensions: ['.nes', '.zip'], core: 'nestopia_libretro', color: '#e8e8e8', phase: 1, thumbs: 'Nintendo - Nintendo Entertainment System' },
  { id: 'snes', name: 'Super Nintendo', short: 'SNES', folder: 'snes', extensions: ['.sfc', '.smc', '.zip'], core: 'snes9x_libretro', color: '#a57cff', phase: 1, thumbs: 'Nintendo - Super Nintendo Entertainment System' },
  { id: 'gb', name: 'Game Boy', short: 'GB', folder: 'gb', extensions: ['.gb', '.zip'], core: 'gambatte_libretro', color: '#9bbc0f', phase: 1, thumbs: 'Nintendo - Game Boy' },
  { id: 'gbc', name: 'Game Boy Color', short: 'GBC', folder: 'gbc', extensions: ['.gbc', '.zip'], core: 'gambatte_libretro', color: '#00c2a8', phase: 1, thumbs: 'Nintendo - Game Boy Color' },
  { id: 'gba', name: 'Game Boy Advance', short: 'GBA', folder: 'gba', extensions: ['.gba', '.zip'], core: 'mgba_libretro', color: '#ff6a00', phase: 1, thumbs: 'Nintendo - Game Boy Advance' },
  { id: 'n64', name: 'Nintendo 64', short: 'N64', folder: 'n64', extensions: ['.n64', '.z64', '.v64'], core: null, color: '#17c964', phase: 2, thumbs: 'Nintendo - Nintendo 64' },
  { id: 'nds', name: 'Nintendo DS', short: 'NDS', folder: 'nds', extensions: ['.nds'], core: null, color: '#00b7ff', phase: 2, thumbs: 'Nintendo - Nintendo DS' }
]
