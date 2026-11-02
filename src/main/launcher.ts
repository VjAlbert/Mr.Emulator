import { spawn } from 'child_process'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'fs'
import type { Game, LaunchResult, Settings, SystemDef } from '@shared/types'
import { platform } from './platform'
import { systemDir } from './paths'

/** Avvia RetroArch con il core giusto. Chiama onExit quando il gioco si chiude. */
export function launchGame(
  game: Game,
  system: SystemDef,
  settings: Settings,
  /** Testo del file di configurazione aggiuntivo di RetroArch (generato dai profili) */
  configText: string,
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

  if (system.id === 'neogeo') {
    const dirs = [dirname(game.path), systemDir(system, settings), settings.biosDir, join(settings.biosDir, 'fbneo')]
    if (!dirs.some((d) => d && existsSync(join(d, 'neogeo.zip')))) {
      return {
        ok: false,
        error: `Manca neogeo.zip (il BIOS Neo Geo). Copialo nella cartella roms\\${system.folder} insieme ai giochi, oppure in bios\\fbneo.`
      }
    }
  }

  // BIOS delle console a disco: senza, il core si chiude subito e l'utente non capisce perché
  const has = (...names: string[]): boolean =>
    [settings.biosDir, join(settings.biosDir, 'dc'), dirname(game.path)].some((d) => d && names.some((n) => existsSync(join(d, n))))
  if (system.id === 'psx' && !has('scph5501.bin', 'scph5500.bin', 'scph5502.bin', 'scph1001.bin', 'scph7001.bin')) {
    return { ok: false, error: 'Manca il BIOS PlayStation (per esempio scph5501.bin). Copialo nella cartella bios.' }
  }
  if (system.id === 'dreamcast' && !has('dc_boot.bin')) {
    return { ok: false, error: 'Manca il BIOS Dreamcast (dc_boot.bin, più dc_flash.bin). Copiali nella cartella bios\\dc.' }
  }
  if ((system.id === 'naomi' || system.id === 'atomiswave') && !has('naomi.zip', 'awbios.zip')) {
    return { ok: false, error: 'Manca il BIOS Naomi / Atomiswave (naomi.zip, awbios.zip). Copialo nella cartella bios\\dc o accanto ai giochi.' }
  }

  // configurazione su misura per questo PC, questo schermo e questo sistema
  const cfg = join(app.getPath('userData'), 'retroarch-mr.cfg')
  mkdirSync(dirname(cfg), { recursive: true })
  writeFileSync(cfg, configText, 'utf-8')
  const args = ['-L', corePath, game.path, '--appendconfig', cfg]

  try {
    const child = spawn(settings.retroarchPath, args, { cwd: dirname(settings.retroarchPath), stdio: 'ignore' })
    // 'error' e 'exit' possono scattare entrambi: il ritorno al launcher deve avvenire una volta sola
    let ended = false
    const end = (): void => {
      if (ended) return
      ended = true
      onExit()
    }
    child.once('spawn', onStart)
    child.once('error', end)
    child.once('exit', end)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
