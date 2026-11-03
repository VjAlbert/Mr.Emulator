import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import type { Settings, SystemDef } from '@shared/types'
import { writeFileAtomic } from './atomic'
import { openZip, readZipEntry } from './zipinfo'
import { platform } from './platform'

/** Archivio ufficiale dei core di RetroArch (versioni per Windows a 64 bit) */
export const CORE_BASE = 'https://buildbot.libretro.com/nightly/windows/x86_64/latest/'

export const coresDirOf = (s: Settings): string => s.coresDir || (s.retroarchPath ? join(dirname(s.retroarchPath), 'cores') : '')

/** Core necessari ai sistemi attivi (o solo a quelli con giochi, se si passa il conteggio) che non sono ancora installati */
export function missingCores(s: Settings, systems: SystemDef[], gameCount?: (id: string) => number): string[] {
  const dir = coresDirOf(s)
  if (!dir) return []
  const need = new Set<string>()
  for (const sys of systems) {
    if (sys.phase !== 1 || !sys.core) continue
    if (gameCount && gameCount(sys.id) === 0) continue
    need.add(sys.core)
  }
  return [...need].filter((c) => !existsSync(join(dir, c + platform.coreExt))).sort()
}

export interface CoreInfo {
  core: string
  systems: string[]
  installed: boolean
  /** Giochi presenti per questi sistemi */
  games: number
}

/** Elenco dei core usati dai sistemi, con lo stato di installazione (prima quelli per cui ci sono giochi) */
export function coreList(s: Settings, systems: SystemDef[], gameCount: (id: string) => number): CoreInfo[] {
  const dir = coresDirOf(s)
  const map = new Map<string, CoreInfo>()
  for (const sys of systems) {
    if (sys.phase !== 1 || !sys.core) continue
    const info = map.get(sys.core) ?? { core: sys.core, systems: [], installed: !!dir && existsSync(join(dir, sys.core + platform.coreExt)), games: 0 }
    info.systems.push(sys.name)
    info.games += gameCount(sys.id)
    map.set(sys.core, info)
  }
  return [...map.values()].sort((a, b) => b.games - a.games || a.core.localeCompare(b.core))
}

export interface CoreResult {
  core: string
  ok: boolean
  error?: string
}

/** Scarica un core dall'archivio ufficiale, lo estrae nella cartella dei core di RetroArch e controlla che il file sia valido */
export async function installCore(core: string, dir: string, base = CORE_BASE, fetchFn: typeof fetch = fetch): Promise<CoreResult> {
  if (!/^[a-z0-9_]+_libretro$/.test(core)) return { core, ok: false, error: 'nome del core non valido' }
  const tmp = join(tmpdir(), `mr-core-${process.pid}-${core}.zip`)
  try {
    const res = await fetchFn(`${base}${core}${platform.coreExt}.zip`, { signal: AbortSignal.timeout(180000) })
    if (!res.ok) return { core, ok: false, error: res.status === 404 ? 'non esiste per Windows nell’archivio ufficiale' : `risposta ${res.status}` }
    const zip = Buffer.from(await res.arrayBuffer())
    if (zip.length < 1000) return { core, ok: false, error: 'file scaricato troppo piccolo' }
    writeFileSync(tmp, zip)
    const arc = await openZip(tmp, (ext) => ext === platform.coreExt)
    const entry = arc?.entries.get(core)
    if (!arc || !entry) return { core, ok: false, error: 'il file scaricato non contiene il core' }
    const data = await readZipEntry(tmp, entry)
    // una DLL di Windows comincia con "MZ": se no, il download è danneggiato
    if (data.length < 1000 || data[0] !== 0x4d || data[1] !== 0x5a) return { core, ok: false, error: 'il core scaricato è danneggiato' }
    mkdirSync(dir, { recursive: true })
    writeFileAtomic(join(dir, core + platform.coreExt), data)
    return { core, ok: true }
  } catch (e) {
    return { core, ok: false, error: e instanceof Error ? e.message : String(e) }
  } finally {
    try {
      rmSync(tmp, { force: true })
    } catch {
      // niente da togliere
    }
  }
}

/** Installa in sequenza i core indicati; un errore su uno non ferma gli altri */
export async function installCores(cores: string[], dir: string, base = CORE_BASE, fetchFn: typeof fetch = fetch): Promise<CoreResult[]> {
  const out: CoreResult[] = []
  for (const c of cores) out.push(await installCore(c, dir, base, fetchFn))
  return out
}
