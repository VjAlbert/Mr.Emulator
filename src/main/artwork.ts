import { app } from 'electron'
import { join, resolve, parse, sep } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
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
  const names = candidates(game.fileName)
  const key = `${system.id}:${names[0]}`

  // 1) già in cache?
  for (const kind of KINDS) {
    for (const n of names) if (existsSync(localPath(system.id, kind, n))) return Promise.resolve(toUrl(system.id, kind, n))
  }
  if (!enabled || existsSync(missPath(system.id, names[0]))) return Promise.resolve(null)

  // 2) da scaricare (una sola richiesta per gioco, anche se chiesta più volte)
  const running = inflight.get(key)
  if (running) return running
  const job = slot(async () => {
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
      writeFileSync(missPath(system.id, names[0]), '')
    }
    return null
  }).finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}
