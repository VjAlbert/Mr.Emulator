import type { SystemDef } from '@shared/types'

/**
 * Elenco dei sistemi supportati. Per aggiungerne uno basta una riga qui:
 * il resto del programma (scansione, interfaccia, avvio) lo gestisce da solo.
 */
export const SYSTEMS: SystemDef[] = [
  { id: 'arcade', name: 'Arcade', short: 'ARC', folder: 'arcade', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#ff2d55', cost: 'light', phase: 1, thumbs: 'FBNeo - Arcade Games', titleDat: true },
  { id: 'mame', name: 'Arcade (MAME)', short: 'MAME', folder: 'mame', extensions: ['.zip', '.7z'], core: null, engine: 'mame', titleSource: 'mame', color: '#ff4fd8', cost: 'medium', phase: 1, thumbs: 'MAME' },
  { id: 'neogeo', name: 'Neo Geo', short: 'NEO', folder: 'neogeo', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#ffb800', cost: 'light', phase: 1, thumbs: 'FBNeo - Arcade Games', titleDat: true },
  { id: 'mastersystem', name: 'Master System', short: 'SMS', folder: 'mastersystem', extensions: ['.sms', '.zip'], core: 'genesis_plus_gx_libretro', color: '#2d7dff', cost: 'light', phase: 1, thumbs: 'Sega - Master System - Mark III', softlist: ['sms'] },
  { id: 'megadrive', name: 'Mega Drive', short: 'MD', folder: 'megadrive', extensions: ['.md', '.gen', '.smd', '.bin', '.zip'], core: 'genesis_plus_gx_libretro', color: '#7b3dff', cost: 'light', phase: 1, thumbs: 'Sega - Mega Drive - Genesis', softlist: ['megadriv'] },
  { id: 'nes', name: 'NES', short: 'NES', folder: 'nes', extensions: ['.nes', '.zip'], core: 'nestopia_libretro', color: '#e8e8e8', cost: 'light', phase: 1, thumbs: 'Nintendo - Nintendo Entertainment System', softlist: ['nes'] },
  { id: 'snes', name: 'Super Nintendo', short: 'SNES', folder: 'snes', extensions: ['.sfc', '.smc', '.zip'], core: 'snes9x_libretro', color: '#a57cff', cost: 'light', phase: 1, thumbs: 'Nintendo - Super Nintendo Entertainment System', softlist: ['snes'] },
  { id: 'gamegear', name: 'Game Gear', short: 'GG', folder: 'gamegear', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#00a86b', cost: 'light', phase: 1, thumbs: 'Sega - Game Gear', softlist: ['gamegear'] },
  { id: 'pce', name: 'PC Engine', short: 'PCE', folder: 'pce', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#ff8a00', cost: 'light', phase: 1, thumbs: 'NEC - PC Engine - TurboGrafx 16', softlist: ['pce'] },
  { id: 'tg16', name: 'TurboGrafx-16', short: 'TG16', folder: 'tg16', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#e63946', cost: 'light', phase: 1, thumbs: 'NEC - PC Engine - TurboGrafx 16', softlist: ['tg16', 'pce'] },
  { id: 'sgx', name: 'SuperGrafx', short: 'SGX', folder: 'sgx', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#c77dff', cost: 'light', phase: 1, thumbs: 'NEC - PC Engine SuperGrafx', softlist: ['pce'] },
  { id: 'sg1000', name: 'SG-1000', short: 'SG', folder: 'sg1000', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#3a86ff', cost: 'light', phase: 1, thumbs: 'Sega - SG-1000', softlist: ['sg1000'] },
  { id: 'fds', name: 'Famicom Disk System', short: 'FDS', folder: 'fds', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#d90429', cost: 'light', phase: 1, thumbs: 'Nintendo - Family Computer Disk System', softlist: ['famicom_flop'] },
  { id: 'ngp', name: 'Neo Geo Pocket', short: 'NGP', folder: 'ngp', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#f4a261', cost: 'light', phase: 1, thumbs: 'SNK - Neo Geo Pocket', softlist: ['ngp', 'ngpc'] },
  { id: 'coleco', name: 'ColecoVision', short: 'COL', folder: 'coleco', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#2a9d8f', cost: 'light', phase: 1, thumbs: 'Coleco - ColecoVision', softlist: ['coleco'] },
  { id: 'msx', name: 'MSX', short: 'MSX', folder: 'msx', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#5e60ce', cost: 'light', phase: 1, thumbs: 'Microsoft - MSX', softlist: ['msx1_cart'] },
  { id: 'spectrum', name: 'ZX Spectrum', short: 'ZX', folder: 'spectrum', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#ffd60a', cost: 'light', phase: 1, thumbs: 'Sinclair - ZX Spectrum +3', softlist: ['spectrum_cass', 'spectrum_cart'] },
  { id: 'channelf', name: 'Fairchild Channel F', short: 'CHF', folder: 'channelf', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#8d99ae', cost: 'light', phase: 1, thumbs: 'Fairchild - Channel F', softlist: ['channelf'] },
  { id: 'astrocade', name: 'Bally Astrocade', short: 'AST', folder: 'astrocade', extensions: ['.zip', '.7z'], core: 'fbneo_libretro', color: '#ef476f', cost: 'light', phase: 1, thumbs: 'Bally - Astrocade', softlist: ['astrocde'] },
  { id: 'gb', name: 'Game Boy', short: 'GB', folder: 'gb', extensions: ['.gb', '.zip'], core: 'gambatte_libretro', color: '#9bbc0f', cost: 'light', phase: 1, thumbs: 'Nintendo - Game Boy', softlist: ['gameboy'] },
  { id: 'gbc', name: 'Game Boy Color', short: 'GBC', folder: 'gbc', extensions: ['.gbc', '.zip'], core: 'gambatte_libretro', color: '#00c2a8', cost: 'light', phase: 1, thumbs: 'Nintendo - Game Boy Color', softlist: ['gbcolor'] },
  { id: 'gba', name: 'Game Boy Advance', short: 'GBA', folder: 'gba', extensions: ['.gba', '.zip'], core: 'mgba_libretro', color: '#ff6a00', cost: 'light', phase: 1, thumbs: 'Nintendo - Game Boy Advance', softlist: ['gba'] },
  { id: 'n64', name: 'Nintendo 64', short: 'N64', folder: 'n64', extensions: ['.n64', '.z64', '.v64'], core: null, color: '#17c964', cost: 'medium', phase: 2, thumbs: 'Nintendo - Nintendo 64' },
  { id: 'nds', name: 'Nintendo DS', short: 'NDS', folder: 'nds', extensions: ['.nds'], core: null, color: '#00b7ff', cost: 'medium', phase: 2, thumbs: 'Nintendo - Nintendo DS' }
]
