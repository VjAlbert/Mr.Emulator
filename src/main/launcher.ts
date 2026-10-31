import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import type { Game, LaunchResult, Settings, SystemDef } from '@shared/types'
import { platform } from './platform'

/** Avvia RetroArch con il core giusto. Chiama onExit quando il gioco si chiude. */
export function launchGame(
  game: Game,
  system: SystemDef,
  settings: Settings,
  onStart: () => void,
  onExit: () => void
): LaunchResult {
  if (game.demo) return { ok: false, error: 'Questo è un gioco di esempio. Imposta la cartella ROM nelle impostazioni.' }
  if (!system.core) return { ok: false, error: `${system.name} non è ancora supportato.` }
  if (!settings.retroarchPath || !existsSync(settings.retroarchPath)) {
    return { ok: false, error: 'RetroArch non trovato. Indica il percorso di retroarch.exe nelle impostazioni.' }
  }
  const coresDir = settings.coresDir || join(dirname(settings.retroarchPath), 'cores')
  const corePath = join(coresDir, system.core + platform.coreExt)
  if (!existsSync(corePath)) {
    return { ok: false, error: `Core mancante: ${system.core + platform.coreExt}. Installalo da RetroArch (Carica core > Scarica un core).` }
  }
  if (!existsSync(game.path)) return { ok: false, error: 'File del gioco non trovato.' }

  const args = ['-L', corePath, game.path]
  if (settings.fullscreen) args.push('-f')

  try {
    const child = spawn(settings.retroarchPath, args, { cwd: dirname(settings.retroarchPath), stdio: 'ignore' })
    child.once('spawn', onStart)
    child.once('error', onExit)
    child.once('exit', onExit)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
