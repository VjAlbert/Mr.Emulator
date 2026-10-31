import { app } from 'electron'
import { join, resolve, parse, sep } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import type { Game, SystemDef } from '@shared/types'
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

/** In ordine di preferenza: copertina, schermata di gioco, schermata del titolo */
const KINDS = ['Named_Boxarts', 'Named_Snaps', 'Named_Titles'] as const

export const ART_SCHEME = 'mrart'
export const artRoot = (): string => join(app.getPath('userData'), 'artwork')

/** Libretro sostituisce questi caratteri con "_" nei nomi dei file */
const clean = (s: string): string => s.replace(/[&*/:`<>?\\|"]/g, '_')

const DAT_URL =
  'https://raw.githubusercontent.com/libretro/libretro-database/master/metadat/fbneo-split/FBNeo%20-%20Arcade%20Games.dat'

let datMap: Map<string, string> | null = null

/** Scarica (una volta) l'elenco "nome file -> titolo" dei giochi arcade FBNeo. */
async function arcadeTitles(): Promise<Map<string, string> | null> {
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

const missPath = (systemId: string, stem: string): string => join(artRoot(), systemId, `${stem}.miss`)

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

const inflight = new Map<string, Promise<string | null>>()

export function getArt(game: Game, system: SystemDef, enabled: boolean): Promise<string | null> {
  if (game.demo || !system.thumbs) return Promise.resolve(null)
  const stem = clean(parse(game.fileName).name)
  const key = `${system.id}:${stem}`
  const running = inflight.get(key)
  if (running) return running
  const job = resolveArt(game, system, enabled, stem).finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

async function resolveArt(game: Game, system: SystemDef, enabled: boolean, stem: string): Promise<string | null> {
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

  // 1) già in cache?
  for (const kind of KINDS) {
    for (const n of names) if (existsSync(localPath(system.id, kind, n))) return toUrl(system.id, kind, n)
  }
  if (!enabled || existsSync(missPath(system.id, stem))) return null

  // 2) da scaricare
  return slot(async () => {
    let networkProblem = false
    for (const kind of KINDS) {
      for (const n of names) {
        const res = await download(system.thumbs!, kind, n)
        if (res === 'error') networkProblem = true
        else if (res !== 'notfound') {
          const file = localPath(system.id, kind, n)
          mkdirSync(join(file, '..'), { recursive: true })
          writeFileSync(file, res.data)
          return toUrl(system.id, kind, n)
        }
      }
    }
    // il segno "nessuna copertina" si scrive solo se la rete funzionava: da offline si riprova al prossimo avvio
    if (!networkProblem) {
      mkdirSync(join(artRoot(), system.id), { recursive: true })
      writeFileSync(missPath(system.id, stem), '')
    }
    return null
  })
}
