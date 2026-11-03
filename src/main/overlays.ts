import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import type { Settings } from '@shared/types'

/** Nomi (senza spazi né simboli, in minuscolo) con cui i bordi chiamano ogni sistema; "no" = parole che escludono quel file */
const ALIASES: Record<string, { names: string[]; no?: string[] }> = {
  arcade: { names: ['arcade', 'mame', 'fbneo'] },
  mame: { names: ['mame', 'arcade'] },
  neogeo: { names: ['snkneogeo', 'neogeo'], no: ['pocket', 'cd'] },
  ngp: { names: ['snkneogeopocket', 'neogeopocket'] },
  nes: { names: ['nintendoentertainmentsystem', 'nintendones', 'nes'], no: ['super'] },
  fds: { names: ['nintendofamicomdisksystem', 'famicomdisksystem', 'nintendofds', 'fds'] },
  snes: { names: ['supernintendoentertainmentsystem', 'supernintendo', 'nintendosnes', 'snes', 'supernes'] },
  gb: { names: ['nintendogameboy', 'gameboy'], no: ['color', 'advance'] },
  gbc: { names: ['nintendogameboycolor', 'gameboycolor'] },
  gba: { names: ['nintendogameboyadvance', 'gameboyadvance'] },
  n64: { names: ['nintendo64', 'n64'], no: ['dd'] },
  nds: { names: ['nintendods', 'nds'], no: ['dsi'] },
  mastersystem: { names: ['segamastersystem', 'mastersystem'] },
  megadrive: { names: ['segamegadrive', 'segagenesis', 'megadrive', 'genesis'], no: ['cd', '32x', 'nomad'] },
  gamegear: { names: ['segagamegear', 'gamegear'] },
  sg1000: { names: ['segasg1000', 'sg1000'] },
  dreamcast: { names: ['segadreamcast', 'dreamcast'] },
  naomi: { names: ['seganaomi', 'naomi'] },
  atomiswave: { names: ['atomiswave', 'sammyatomiswave'] },
  pce: { names: ['nectgrafx16', 'nec pcengine', 'pcengine', 'turbografx16', 'turbografx'], no: ['cd', 'supergrafx'] },
  tg16: { names: ['turbografx16', 'turbografx', 'pcengine', 'nectgrafx16'], no: ['cd', 'supergrafx'] },
  sgx: { names: ['supergrafx', 'pcenginesupergrafx'] },
  psx: { names: ['sonyplaystation', 'playstation', 'psx'], no: ['2', '3', 'portable', 'vita'] },
  jaguar: { names: ['atarijaguar', 'jaguar'], no: ['cd'] },
  '3do': { names: ['3do', 'panasonic3do', 'the3docompany'] },
  coleco: { names: ['colecovision', 'coleco'] },
  msx: { names: ['msx', 'microsoftmsx'], no: ['2'] },
  spectrum: { names: ['sinclairzxspectrum', 'zxspectrum'] },
  channelf: { names: ['fairchildchannelf', 'channelf'] },
  astrocade: { names: ['ballyastrocade', 'astrocade'] }
}

/** Toglie dal nome del file le parti che descrivono il formato (non la console) */
const NOISE = /nyny77|bezel|16x9|2560x1440|1920x1080|3440x1440|1080|1440|plain|overlay|border|collection/g
const norm = (file: string): string =>
  file
    .replace(/\.cfg$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(NOISE, '')

function listCfg(dir: string, depth = 0): string[] {
  const out: string[] = []
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (depth < 3) out.push(...listCfg(p, depth + 1))
      } else if (/\.cfg$/i.test(e.name)) out.push(p)
    }
  } catch {
    // cartella non leggibile: nessun bordo
  }
  return out
}

/** Bordo che corrisponde a un sistema tra i file .cfg di una cartella (il nome più corto vince: è quello "base") */
export function matchOverlay(files: string[], systemId: string): string | null {
  const al = ALIASES[systemId]
  if (!al) return null
  const names = al.names.map((n) => n.replace(/[^a-z0-9]/g, ''))
  let best: { path: string; n: string } | null = null
  for (const f of files) {
    const base = f.replace(/^.*[\\/]/, '')
    const n = norm(base)
    if (!n) continue
    if (!names.some((a) => n === a || n.startsWith(a))) continue
    const rest = names.filter((a) => n.startsWith(a)).map((a) => n.slice(a.length))
    if (al.no?.some((w) => rest.some((r) => r.includes(w)))) continue
    if (!best || n.length < best.n.length || (n.length === best.n.length && f < best.path)) best = { path: f, n }
  }
  return best?.path ?? null
}

/** Per ogni sistema, il bordo trovato nella cartella (null = nessuno) */
export function findOverlays(dir: string, systemIds: string[]): Record<string, string | null> {
  const files = dir ? listCfg(dir) : []
  const out: Record<string, string | null> = {}
  for (const id of systemIds) out[id] = matchOverlay(files, id)
  return out
}

let cache: { dir: string; at: number; files: string[] } | null = null

/**
 * Bordo da usare per un sistema: prima la scelta fatta a mano ("-" = nessun bordo per quel sistema),
 * poi quello trovato da solo nella cartella dei bordi, infine il bordo comune a tutti.
 */
export function resolveOverlay(s: Settings, systemId: string): string | null {
  if (!s.overlayEnabled) return null
  const manual = s.overlayBySystem?.[systemId]
  if (manual === '-') return null
  if (manual && existsSync(manual)) return manual
  if (s.overlayDir) {
    if (!cache || cache.dir !== s.overlayDir || Date.now() - cache.at > 30000) cache = { dir: s.overlayDir, at: Date.now(), files: listCfg(s.overlayDir) }
    const auto = matchOverlay(cache.files, systemId)
    if (auto) return auto
  }
  return s.overlayPath && existsSync(s.overlayPath) ? s.overlayPath : null
}
