import { app } from 'electron'
import { join, resolve, parse, sep } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type { ArtKind, Game, SystemDef } from '@shared/types'
import { prettyName } from './scanner'

/**
 * Copertine e immagini dal progetto libretro-thumbnails: pubblico, gratuito,
 * senza account né chiavi API. Ogni immagine viene scaricata una sola volta.
 */
const SOURCES = [
  (sys: string, kind: string, file: string) =>
    `https://thumbnails.libretro.com/${encodeURIComponent(sys)}/${kind}/${encodeURIComponent(file)}.png`,
  // mirror ufficiale su GitHub, usato solo se il primo server non risponde
  (sys: string, kind: string, file: string) =>
    `https://raw.githubusercontent.com/libretro-thumbnails/${encodeURIComponent(sys.replace(/ /g, '_'))}/master/${kind}/${encodeURIComponent(file)}.png`
]

/** Cartelle dell'archivio libretro-thumbnails per ogni tipo di immagine */
const KIND_DIR: Record<ArtKind, string> = { boxart: 'Named_Boxarts', snap: 'Named_Snaps', title: 'Named_Titles' }

export const ART_SCHEME = 'mrart'
export const artRoot = (): string => join(app.getPath('userData'), 'artwork')

/** Libretro sostituisce questi caratteri con "_" nei nomi dei file */
const clean = (s: string): string => s.replace(/[&*/:`<>?\\|"]/g, '_')

const DAT_URL =
  'https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/fbneo-split/FBNeo%20-%20Arcade%20Games.dat'

let datMap: Map<string, string> | null = null

/** Scarica (una volta) l'elenco "nome file -> titolo" dei giochi arcade FBNeo. */
export async function arcadeTitles(): Promise<Map<string, string> | null> {
  if (datMap) return datMap
  const file = join(artRoot(), '_dat', 'fbneo-arcade.dat')
  let text: string | null = null
  if (existsSync(file)) text = readFileSync(file, 'utf-8')
  else {
    try {
      const res = await fetch(DAT_URL, { signal: AbortSignal.timeout(20000) })
      if (res.ok) {
        text = await res.text()
        mkdirSync(join(file, '..'), { recursive: true })
        writeFileSync(file, text, 'utf-8')
      }
    } catch {
      // offline: si riproverà più tardi
    }
  }
  if (!text) return null
  const map = new Map<string, string>()
  const re = /game \(\s*name "([^"]*)"[\s\S]*?rom \( name "?([^"\s]+?)\.zip/g
  for (let m = re.exec(text); m; m = re.exec(text)) map.set(m[2].toLowerCase(), m[1])
  datMap = map
  return map
}

function candidates(fileName: string): string[] {
  const stem = parse(fileName).name
  const base = prettyName(fileName)
  const list = [stem, ...['USA', 'Europe', 'USA, Europe', 'Japan', 'World'].map((r) => `${base} (${r})`)]
  return [...new Set(list.map(clean))]
}

const localPath = (systemId: string, kind: string, name: string): string =>
  join(artRoot(), systemId, kind, `${name}.png`)

const missPath = (systemId: string, stem: string, kind: ArtKind): string => join(artRoot(), systemId, `${stem}.${kind}.miss`)

const toUrl = (systemId: string, kind: string, name: string): string =>
  `${ART_SCHEME}://art/${encodeURIComponent(systemId)}/${kind}/${encodeURIComponent(name)}.png`

/** Risolve un indirizzo mrart:// in un file locale, rifiutando percorsi fuori dalla cache */
export function resolveArtUrl(url: string): string | null {
  const u = new URL(url)
  const [systemId, kind, file] = u.pathname.split('/').filter(Boolean).map(decodeURIComponent)
  if (!systemId || !kind || !file) return null
  const root = resolve(artRoot())
  const full = resolve(root, systemId, kind, file)
  return full.startsWith(root + sep) && existsSync(full) ? full : null
}

// al massimo 3 download contemporanei
let active = 0
const waiting: Array<() => void> = []
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 3) await new Promise<void>((r) => waiting.push(r))
  active++
  try {
    return await fn()
  } finally {
    active--
    waiting.shift()?.()
  }
}

type Fetched = { data: Buffer } | 'notfound' | 'error'

async function download(sys: string, kind: string, file: string): Promise<Fetched> {
  for (const src of SOURCES) {
    try {
      const res = await fetch(src(sys, kind, file), { signal: AbortSignal.timeout(8000) })
      if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) {
        return { data: Buffer.from(await res.arrayBuffer()) }
      }
      if (res.status === 404) return 'notfound' // il file non esiste: inutile provare il mirror
    } catch {
      // errore di rete: si prova la sorgente successiva
    }
  }
  return 'error'
}

/** Sostituisce i nomi brevi (kof98) con i titoli completi del DAT FBNeo e riordina */
export async function withFullTitles(games: Game[]): Promise<Game[]> {
  const titles = await arcadeTitles()
  if (!titles) return games
  return games
    .map((g) => ({ ...g, name: titles.get(parse(g.fileName).name.toLowerCase()) ?? g.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
}

const inflight = new Map<string, Promise<string | null>>()

export function getArt(game: Game, system: SystemDef, enabled: boolean, kind: ArtKind): Promise<string | null> {
  if (game.demo || !system.thumbs) return Promise.resolve(null)
  const stem = clean(parse(game.fileName).name)
  const key = `${system.id}:${stem}:${kind}`
  const running = inflight.get(key)
  if (running) return running
  const job = resolveArt(game, system, enabled, stem, kind).finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

async function resolveArt(game: Game, system: SystemDef, enabled: boolean, stem: string, kind: ArtKind): Promise<string | null> {
  let names: string[]
  if (system.titleDat) {
    // Arcade / Neo Geo: dal nome breve del file si ricava il titolo completo
    const titles = await arcadeTitles()
    if (!titles) return null // DAT non disponibile (offline): nessun segno di "mancante"
    const title = titles.get(stem.toLowerCase())
    names = title ? [clean(title)] : []
  } else {
    names = candidates(game.fileName)
  }

  const dir = KIND_DIR[kind]
  // 1) già in cache?
  for (const n of names) if (existsSync(localPath(system.id, dir, n))) return toUrl(system.id, dir, n)
  if (!enabled || existsSync(missPath(system.id, stem, kind))) return null

  // 2) da scaricare
  return slot(async () => {
    let networkProblem = false
    for (const n of names) {
      const res = await download(system.thumbs!, dir, n)
      if (res === 'error') networkProblem = true
      else if (res !== 'notfound') {
        const file = localPath(system.id, dir, n)
        mkdirSync(join(file, '..'), { recursive: true })
        writeFileSync(file, res.data)
        return toUrl(system.id, dir, n)
      }
    }
    // "nessuna immagine" si segna solo se la rete funzionava: da offline (o con un errore) si riprova più tardi
    if (!networkProblem) {
      mkdirSync(join(artRoot(), system.id), { recursive: true })
      writeFileSync(missPath(system.id, stem, kind), '')
    }
    return null
  })
}
