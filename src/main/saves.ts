import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'fs'
import { dirname, join, parse, relative, resolve, sep } from 'path'
import type { Game, SaveInfo, SaveStats, Settings, SystemDef } from '@shared/types'
import { writeFileAtomic } from './atomic'
import { defaultRoot } from './folders'
import { readZipEntry } from './zipinfo'
import { createZip, listZip } from './zipwrite'

/** Sistemi "arcade" di RetroArch (FBNeo): la scelta di riprendere si fa nell'anteprima, non all'avvio */
const ARCADE_RETRO = new Set(['arcade', 'neogeo'])

export const kindOf = (system: SystemDef): 'mame' | 'arcade' | 'console' => (system.engine === 'mame' ? 'mame' : ARCADE_RETRO.has(system.id) ? 'arcade' : 'console')

/** Cartella dei salvataggi: quella indicata, altrimenti "saves" accanto alla cartella ROM (così sta sullo stesso disco) */
export function savesRoot(s: Settings): string {
  if (s.savesDir) return s.savesDir
  return join(s.romsDir ? dirname(s.romsDir) : defaultRoot(), 'saves')
}

const fwd = (p: string): string => p.replace(/\\/g, '/')
const contentName = (game: Game): string => parse(game.path).name
const machineOf = (game: Game): string => game.machine ?? contentName(game)

/** Console: impostazione generale; arcade e MAME: scelta fatta per quel gioco */
export function resumeFor(s: Settings, system: SystemDef, game: Game): boolean {
  return kindOf(system) === 'console' ? s.resumeConsoles : !!s.resumeArcade?.[game.id]
}

/** File dello stato che viene salvato all'uscita (e caricato all'avvio) */
export function stateFile(s: Settings, system: SystemDef, game: Game): string {
  const root = savesRoot(s)
  return kindOf(system) === 'mame' ? join(root, 'mame', 'sta', machineOf(game), 'auto.sta') : join(root, 'states', `${contentName(game)}.state.auto`)
}

/** Salvataggio del gioco stesso (memory card, batteria; per MAME la memoria dei giochi) */
export function sramFile(s: Settings, system: SystemDef, game: Game): string {
  const root = savesRoot(s)
  return kindOf(system) === 'mame' ? join(root, 'mame', 'nvram', machineOf(game)) : join(root, 'sram', `${contentName(game)}.srm`)
}

const mtimeOf = (p: string): number | null => {
  try {
    return statSync(p).mtimeMs
  } catch {
    return null
  }
}

let hiscoreCache: { key: string; names: Set<string> } | null = null
/** MAME: i giochi di cui il plugin hiscore sa salvare i record (dal suo file hiscore.dat) */
export function hiscoreSupported(mamePath: string, machine: string): boolean {
  if (!mamePath) return false
  const file = join(dirname(mamePath), 'plugins', 'hiscore', 'hiscore.dat')
  const m = mtimeOf(file)
  if (m === null) return false
  const key = `${file}|${m}`
  if (!hiscoreCache || hiscoreCache.key !== key) {
    const names = new Set<string>()
    try {
      for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
        const mm = /^([A-Za-z0-9_,]+):/.exec(line)
        if (mm) for (const n of mm[1].split(',')) if (n) names.add(n.toLowerCase())
      }
    } catch {
      // file illeggibile: nessun gioco riconosciuto
    }
    hiscoreCache = { key, names }
  }
  return hiscoreCache.names.has(machine.toLowerCase())
}

export function saveInfo(s: Settings, system: SystemDef, game: Game): SaveInfo {
  const kind = kindOf(system) === 'console' ? 'console' : 'arcade'
  const st = mtimeOf(stateFile(s, system, game))
  const sr = mtimeOf(sramFile(s, system, game))
  const resume = resumeFor(s, system, game)
  return {
    kind,
    resume,
    state: st === null ? null : { time: st },
    sram: sr === null ? null : { time: sr },
    hiscore: kindOf(system) === 'mame' && s.hiscore && hiscoreSupported(s.mamePath, machineOf(game)),
    ask: kind === 'console' && s.resumeConsoles && st !== null
  }
}

export function ensureSaveDirs(s: Settings): void {
  const root = savesRoot(s)
  for (const d of ['sram', 'states', join('mame', 'nvram'), join('mame', 'sta'), join('mame', 'home')]) mkdirSync(join(root, d), { recursive: true })
}

/**
 * RetroArch: una sola cartella per salvataggi e stati, scrittura automatica ogni 10 secondi (anche se manca la corrente)
 * e, per le console, stato salvato all'uscita e ricaricato all'avvio (sostituisce la memory card).
 */
export function retroSaveConfig(s: Settings, system: SystemDef, game: Game, fresh = false): Record<string, string> {
  ensureSaveDirs(s)
  const root = savesRoot(s)
  const resume = resumeFor(s, system, game)
  return {
    savefile_directory: fwd(join(root, 'sram')),
    savestate_directory: fwd(join(root, 'states')),
    savefiles_in_content_dir: 'false',
    savestates_in_content_dir: 'false',
    sort_savefiles_enable: 'false',
    sort_savestates_enable: 'false',
    sort_savefiles_by_content_enable: 'false',
    sort_savestates_by_content_enable: 'false',
    autosave_interval: '10',
    // non fidarsi dei file "info" dei core (a volte mancano o sono vecchi) per decidere se salvare lo stato
    core_info_savestate_bypass: 'true',
    savestate_auto_save: String(resume),
    // "nuova partita": non si carica nulla, ma all'uscita si salva la nuova
    savestate_auto_load: String(resume && !fresh)
  }
}

/** MAME: cartelle dei salvataggi, ripresa automatica e record dei giochi arcade */
export function mameSaveIni(s: Settings, system: SystemDef, game: Game): Record<string, string> {
  ensureSaveDirs(s)
  const root = savesRoot(s)
  const ini: Record<string, string> = {
    nvram_directory: join(root, 'mame', 'nvram'),
    state_directory: join(root, 'mame', 'sta'),
    autosave: resumeFor(s, system, game) ? '1' : '0'
  }
  if (s.hiscore) {
    ini['plugin'] = 'hiscore'
    // il plugin scrive i record in <homepath>/hiscore/<gioco>.hi
    ini['homepath'] = join(root, 'mame', 'home')
  }
  return ini
}

/** "Nuova partita" su console: lo stato attuale non va perso, se ne tiene una copia (.prev) */
export function prepareFresh(s: Settings, system: SystemDef, game: Game): boolean {
  const f = stateFile(s, system, game)
  if (!existsSync(f)) return false
  copyFileSync(f, `${f}.prev`)
  rmSync(f, { force: true })
  return true
}

function walk(dir: string, out: string[] = []): string[] {
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) walk(p, out)
      else out.push(p)
    }
  } catch {
    // cartella assente: nessun file
  }
  return out
}

export function saveStats(s: Settings): SaveStats {
  const dir = savesRoot(s)
  const files = walk(dir)
  let bytes = 0
  for (const f of files) bytes += statSync(f).size
  return { dir, files: files.length, bytes }
}

/** Backup di tutti i salvataggi in un solo ZIP */
export function backupSaves(s: Settings, dest: string): number {
  const root = savesRoot(s)
  const files = walk(root).map((p) => ({ name: relative(root, p).split(sep).join('/'), path: p }))
  if (!files.length) throw new Error('Non ci sono salvataggi da salvare.')
  return createZip(dest, files)
}

/** Ripristina uno ZIP di backup nella cartella dei salvataggi. Rifiuta i percorsi che uscirebbero dalla cartella. */
export async function restoreSaves(s: Settings, zip: string): Promise<{ files: number; skipped: number }> {
  const entries = await listZip(zip)
  if (!entries) throw new Error('Il file scelto non è un backup valido.')
  const root = resolve(savesRoot(s))
  let files = 0
  let skipped = 0
  for (const e of entries) {
    const name = e.name.replace(/\\/g, '/')
    const target = resolve(root, name)
    const unsafe = name.startsWith('/') || /^[A-Za-z]:/.test(name) || name.split('/').includes('..') || !(target + sep).startsWith(root + sep)
    if (unsafe) {
      skipped++
      continue
    }
    const data = await readZipEntry(zip, e)
    if (data.length !== e.size) {
      skipped++
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileAtomic(target, data)
    files++
  }
  return { files, skipped }
}

function copyMissing(src: string, dst: string): number {
  let n = 0
  for (const f of walk(src)) {
    const to = join(dst, relative(src, f))
    if (existsSync(to)) continue
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(f, to)
    n++
  }
  return n
}

/** Cartella impostata in retroarch.cfg ("" se non c'è o è "default"); ":\nome" è relativo alla cartella di RetroArch */
function retroDir(raDir: string, key: 'savefile_directory' | 'savestate_directory', fallback: string): string {
  try {
    const cfg = readFileSync(join(raDir, 'retroarch.cfg'), 'utf8')
    const m = new RegExp(`^${key}\\s*=\\s*"?([^"\\r\\n]*)"?`, 'm').exec(cfg)
    const v = m?.[1]?.trim() ?? ''
    if (v && v !== 'default') return v.startsWith(':') ? join(raDir, v.replace(/^:[\\/]?/, '')) : v
  } catch {
    // niente retroarch.cfg: si usa la cartella solita
  }
  return join(raDir, fallback)
}

/** Porta nella cartella unica i salvataggi già esistenti (RetroArch e il vecchio posto di MAME), senza sovrascrivere nulla */
export function importSaves(s: Settings, oldMameDir: string, withRetroArch = true): number {
  ensureSaveDirs(s)
  const root = savesRoot(s)
  let n = 0
  if (withRetroArch && s.retroarchPath) {
    const ra = dirname(s.retroarchPath)
    n += copyMissing(retroDir(ra, 'savefile_directory', 'saves'), join(root, 'sram'))
    n += copyMissing(retroDir(ra, 'savestate_directory', 'states'), join(root, 'states'))
  }
  n += copyMissing(join(oldMameDir, 'nvram'), join(root, 'mame', 'nvram'))
  n += copyMissing(join(oldMameDir, 'sta'), join(root, 'mame', 'sta'))
  return n
}
