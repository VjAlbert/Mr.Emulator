import { join } from 'path'
import type { Settings, SystemDef } from '@shared/types'

/** Cartella dei giochi di un sistema. Per MAME può essere una cartella dedicata (anche su un altro disco). */
export function systemDir(system: SystemDef, s: Pick<Settings, 'romsDir' | 'mameRomDir'>): string {
  if (system.engine === 'mame' && s.mameRomDir) return s.mameRomDir
  return join(s.romsDir, system.folder)
}

/**
 * Nome della cartella dedicata a una versione di MAME: "0.229 (mame0229)" -> "mame0229".
 * I set ROM di MAME valgono solo per la loro versione, quindi conviene tenerli separati.
 */
export function mameFolderName(version: string): string {
  const exact = /\(mame(\d+)\)/i.exec(version)
  if (exact) return `mame${exact[1]}`
  const dotted = /(\d+)\.(\d+)/.exec(version)
  if (dotted) return `mame${dotted[1]}${dotted[2].padStart(3, '0')}`
  return 'mame'
}
