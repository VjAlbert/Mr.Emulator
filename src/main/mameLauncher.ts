import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join, parse } from 'path'
import { app } from 'electron'
import type { Game, LaunchResult, Settings, SystemDef } from '@shared/types'
import { toIniText } from './profiles'
import { systemDir } from './paths'

/** Avvia un gioco con il MAME autonomo dell'utente. Se MAME rifiuta di partire, spiega perché. */
export function launchMame(
  game: Game,
  system: SystemDef,
  settings: Settings,
  ini: Record<string, string>,
  ctrlr: { name: string; xml: string },
  onStart: () => void,
  onExit: () => void,
  onFail: (message: string) => void
): LaunchResult {
  if (game.demo) return { ok: false, error: 'Questo è un gioco di esempio. Imposta la cartella ROM nelle impostazioni.' }
  if (!settings.mamePath || !existsSync(settings.mamePath)) {
    return { ok: false, error: 'MAME non trovato. Indica il percorso di mame.exe nelle impostazioni.' }
  }
  const machine = game.machine ?? parse(game.path).name
  // game.path è già assoluto: la cartella dello ZIP può essere una sottocartella
  const base = systemDir(system, settings)
  // MAME cerca ogni ZIP nelle cartelle in questo ordine: prima i giochi, poi i CHD, infine la cartella BIOS
  // (così gli ZIP di sistema come neogeo.zip si possono tenere in bios\)
  const paths = [...new Set([dirname(game.path), base, settings.mameChdDir, settings.biosDir].filter(Boolean))]

  // configurazione di Mr. Emulator: separata da quella eventuale di MAME, così non la tocca
  const dir = join(app.getPath('userData'), 'mame')
  for (const d of ['cfg', 'nvram', 'sta', 'snap', 'diff', 'comments', 'ctrlr']) mkdirSync(join(dir, d), { recursive: true })
  const full: Record<string, string> = {
    ...ini,
    rompath: paths.join(';'),
    cfg_directory: join(dir, 'cfg'),
    nvram_directory: join(dir, 'nvram'),
    state_directory: join(dir, 'sta'),
    snapshot_directory: join(dir, 'snap'),
    diff_directory: join(dir, 'diff'),
    comment_directory: join(dir, 'comments')
  }
  writeFileSync(join(dir, 'mame.ini'), toIniText(full), 'utf-8')
  writeFileSync(join(dir, 'ctrlr', `${ctrlr.name}.cfg`), ctrlr.xml, 'utf-8')

  const args = [machine, '-inipath', dir, '-ctrlrpath', join(dir, 'ctrlr'), '-ctrlr', ctrlr.name]
  try {
    const child = spawn(settings.mamePath, args, { cwd: dirname(settings.mamePath), windowsHide: false, stdio: ['ignore', 'pipe', 'pipe'] })
    const started = Date.now()
    let out = ''
    const keep = (b: Buffer): void => {
      out = (out + b.toString()).slice(-4000)
    }
    child.stdout?.on('data', keep)
    child.stderr?.on('data', keep)
    child.once('spawn', onStart)
    child.once('error', () => {
      onExit()
      onFail('MAME non si è avviato. Controlla il percorso di mame.exe nelle impostazioni.')
    })
    child.once('close', (code) => {
      onExit()
      // uscita con errore subito dopo l'avvio = il gioco non è partito (file mancanti, versione sbagliata…)
      if (code !== 0 && code !== null && Date.now() - started < 60000) {
        const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-4)
        onFail(`MAME non ha avviato "${game.name}": ${lines.join(' · ').slice(0, 260) || `errore ${code}`}`)
      }
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}
