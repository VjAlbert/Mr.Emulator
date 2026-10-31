import { app } from 'electron'
import { join } from 'path'
import { mkdirSync } from 'fs'
import type { Settings } from '@shared/types'
import { SYSTEMS } from './systems'

/** Cartella di lavoro predefinita: Documenti\MrEmulator */
export const defaultRoot = (): string => join(app.getPath('documents'), 'MrEmulator')

/** Crea (se mancano) la cartella ROM con una sottocartella per sistema e la cartella BIOS */
export function ensureFolders(s: Settings): Settings {
  const next = { ...s }
  if (!next.romsDir) next.romsDir = join(defaultRoot(), 'roms')
  if (!next.biosDir) next.biosDir = join(defaultRoot(), 'bios')
  mkdirSync(join(next.biosDir, 'fbneo'), { recursive: true }) // dove FBNeo cerca neogeo.zip e simili
  for (const sys of SYSTEMS) mkdirSync(join(next.romsDir, sys.folder), { recursive: true })
  return next
}
