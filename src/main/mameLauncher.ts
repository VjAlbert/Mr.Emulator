import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join, parse } from 'path'
import { app } from 'electron'
import type { Game, LaunchResult, Settings, SystemDef } from '@shared/types'
import { toIniText } from './profiles'
import { systemDir } from './paths'
import { readZipInfo } from './zipinfo'

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
        void diagnose(out, paths, game.name).then(onFail)
      }
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

const fmtSize = (b: number): string => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/**
 * Traduce l'errore di MAME in una spiegazione: quale ZIP manca, oppure quale ZIP c'è ma non contiene
 * i file richiesti (copia incompleta o set di un'altra versione).
 */
async function diagnose(out: string, paths: string[], gameName: string): Promise<string> {
  // "xxx NOT FOUND (tried in kof96 neogeo)"
  const missingFiles: Array<{ file: string; sets: string[] }> = []
  for (const m of out.matchAll(/(\S+) NOT FOUND \(tried in ([^)]+)\)/g)) missingFiles.push({ file: m[1], sets: m[2].split(/\s+/).filter(Boolean) })
  const tried = new Set(missingFiles.flatMap((f) => f.sets))

  const locate = (name: string): string | null => {
    for (const d of paths) for (const ext of ['zip', '7z']) if (existsSync(join(d, `${name}.${ext}`))) return join(d, `${name}.${ext}`)
    return null
  }
  const absent = [...tried].filter((n) => !locate(n))
  if (absent.length) {
    return (
      `Manca ${absent.map((n) => `${n}.zip`).join(' e ')} (serve a "${gameName}"). Non lo trovo in: ${paths.join(' · ')}. ` +
      'Copialo direttamente in una di queste cartelle, non in una sottocartella.'
    )
  }

  // gli ZIP ci sono: si guarda cosa contengono davvero
  const infos = new Map<string, Awaited<ReturnType<typeof readZipInfo>>>()
  const unreadable: string[] = []
  for (const set of tried) {
    const file = locate(set)
    if (!file || !file.endsWith('.zip')) continue
    const info = await readZipInfo(file)
    infos.set(set, info)
    if (!info) unreadable.push(`${set}.zip`)
  }
  if (unreadable.length) {
    return `MAME non ha avviato "${gameName}": ${unreadable.join(', ')} non si riesce a leggere come ZIP (file danneggiato o copia interrotta). Ricopialo dalla sorgente.`
  }

  const lacking: string[] = []
  const different: string[] = []
  for (const f of missingFiles) {
    const lower = f.file.toLowerCase()
    const present = f.sets.some((set) => infos.get(set)?.names.some((n) => n.toLowerCase() === lower))
    if (present) different.push(f.file)
    else lacking.push(f.file)
  }
  if (lacking.length || different.length) {
    const where = [...infos.entries()].map(([set, i]) => (i ? `${set}.zip ${fmtSize(i.size)}, ${i.names.length} file` : set)).join(' · ')
    const parts: string[] = []
    if (lacking.length) parts.push(`dentro agli ZIP (${where}) mancano: ${lacking.join(', ')}`)
    if (different.length) parts.push(`questi file ci sono ma con contenuto diverso da quello atteso: ${different.join(', ')}`)
    return (
      `MAME non ha avviato "${gameName}": ${parts.join(' · ')}. ` +
      (lacking.length
        ? 'Probabile copia incompleta dello ZIP, oppure set di un\'altra versione di MAME: ricopialo dalla sorgente e controlla che sia il set 0.229.'
        : 'Il set non corrisponde alla versione di MAME in uso (0.229 per 0.229).')
    )
  }
  const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(-4)
  return `MAME non ha avviato "${gameName}": ${lines.join(' · ').slice(0, 260) || 'errore sconosciuto'}`
}
