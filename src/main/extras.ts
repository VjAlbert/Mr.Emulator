import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join, parse, resolve, sep } from 'path'
import { rmSync } from 'fs'
import type { Game, Settings, SystemDef } from '@shared/types'
import { writeFileAtomic } from './atomic'
import { makeMatcher } from './thumbIndex'
import { openZip, readZipEntry } from './zipinfo'
import { mt } from './mt'

/** Archivio dei trucchi del database di libretro */
export const CHEATS_URL = 'https://buildbot.libretro.com/assets/frontend/cheats.zip'

const fwd = (p: string): string => p.replace(/\\/g, '/')

export const cheatsDirOf = (s: Settings): string => (s.retroarchPath ? join(dirname(s.retroarchPath), 'cheats') : '')

/** RetroAchievements: accesso e modalità. Senza utente e password non si attiva (RetroArch si limiterebbe a chiedere l'accesso) */
export function achievementsConfig(s: Settings): Record<string, string> {
  if (!s.raEnabled || !s.raUser.trim() || !s.raPassword) return { cheevos_enable: 'false' }
  return {
    cheevos_enable: 'true',
    cheevos_username: s.raUser.trim(),
    cheevos_password: s.raPassword,
    cheevos_hardcore_mode_enable: String(s.raHardcore),
    cheevos_auto_screenshot: 'false'
  }
}

/** Nome con cui il core si presenta a RetroArch (cartella dei trucchi di quel core): dal file .info, altrimenti da una tabella */
const LIBRARY_NAMES: Record<string, string> = {
  snes9x_libretro: 'Snes9x',
  nestopia_libretro: 'Nestopia',
  genesis_plus_gx_libretro: 'Genesis Plus GX',
  gambatte_libretro: 'Gambatte',
  mgba_libretro: 'mGBA',
  mupen64plus_next_libretro: 'Mupen64Plus-Next',
  pcsx_rearmed_libretro: 'PCSX-ReARMed',
  melonds_libretro: 'melonDS',
  flycast_libretro: 'Flycast',
  opera_libretro: 'Opera',
  virtualjaguar_libretro: 'Virtual Jaguar'
}
export function libraryNameOf(retroarchPath: string, core: string): string | null {
  try {
    const info = readFileSync(join(dirname(retroarchPath), 'info', `${core}.info`), 'utf-8')
    const m = /^\s*corename\s*=\s*"([^"]+)"/m.exec(info)
    if (m) return m[1]
  } catch {
    // niente file info: si usa la tabella
  }
  return LIBRARY_NAMES[core] ?? null
}

/** Elenco dei file .cht nella cartella di un sistema del database */
function chtNames(dir: string): string[] {
  try {
    return readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.cht')).map((f) => parse(f).name)
  } catch {
    return []
  }
}

/**
 * Trucchi: se nel database c'è un file per questo gioco lo copia dove RetroArch lo cerca da solo
 * (cartella del core, nome del gioco) e chiede di applicarlo all'avvio. Restituisce le impostazioni da aggiungere.
 */
export function cheatsConfig(s: Settings, system: SystemDef, game: Game): { config: Record<string, string>; found: string | null } {
  const dir = cheatsDirOf(s)
  if (!s.cheatsAuto || (s.raHardcore && s.raEnabled) || !dir || !existsSync(dir) || !system.thumbs || !system.core) return { config: {}, found: null }
  const config: Record<string, string> = { cheat_database_path: fwd(dir), apply_cheats_after_load: 'true' }
  const lib = libraryNameOf(s.retroarchPath, system.core)
  if (!lib) return { config, found: null }
  const folder = join(dir, system.thumbs)
  const hit = makeMatcher(chtNames(folder))(parse(game.path).name) ?? makeMatcher(chtNames(folder))(game.name)
  if (!hit) return { config, found: null }
  try {
    const to = join(dir, lib)
    mkdirSync(to, { recursive: true })
    copyFileSync(join(folder, `${hit}.cht`), join(to, `${parse(game.path).name}.cht`))
    return { config, found: hit }
  } catch {
    return { config, found: null }
  }
}

export interface CheatsResult {
  ok: boolean
  files: number
  error?: string
}

/** Scarica il database dei trucchi di libretro e lo estrae nella cartella "cheats" di RetroArch */
export async function installCheats(dir: string, url = CHEATS_URL, fetchFn: typeof fetch = fetch): Promise<CheatsResult> {
  const tmp = join(tmpdir(), `mr-cheats-${process.pid}.zip`)
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(300000) })
    if (!res.ok) return { ok: false, files: 0, error: mt('risposta {n}', { n: res.status }) }
    writeFileSync(tmp, Buffer.from(await res.arrayBuffer()))
    const arc = await openZip(tmp, (ext) => ext === '.cht', true)
    if (!arc || arc.entries.size === 0) return { ok: false, files: 0, error: mt('il file scaricato non contiene trucchi') }
    const root = resolve(dir)
    let n = 0
    for (const [name, entry] of arc.entries) {
      // niente percorsi che escono dalla cartella
      const target = resolve(root, name)
      if (!target.startsWith(root + sep)) continue
      mkdirSync(dirname(target), { recursive: true })
      writeFileAtomic(target, await readZipEntry(tmp, entry))
      n++
    }
    return { ok: true, files: n }
  } catch (e) {
    return { ok: false, files: 0, error: e instanceof Error ? e.message : String(e) }
  } finally {
    try {
      rmSync(tmp, { force: true })
    } catch {
      // niente da togliere
    }
  }
}
