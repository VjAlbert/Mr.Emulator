import { app } from 'electron'
import { join, resolve, parse, sep } from 'path'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import type { ArtKind, Game, SystemDef } from '@shared/types'
import { prettyName } from './scanner'
import type { MediaSource } from './media'
import { buildTitleIndex, parentCandidates, type TitleIndex } from './titles'

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

/** Titoli di MAME (nome breve -> titolo, e titolo del gioco principale per le varianti), forniti dal programma */
/** Cartella delle immagini locali (Multimedia / EXTRAs), se indicata */
let mediaProvider: (() => MediaSource | null) | null = null
export const setMediaProvider = (fn: () => MediaSource | null): void => {
  mediaProvider = fn
}

/** Toglie le copie delle immagini locali già fatte (da usare quando cambia la cartella indicata) */
export function clearLocalArt(): void {
  try {
    for (const sys of readdirSync(artRoot())) {
      for (const sub of readdirSync(join(artRoot(), sys))) {
        if (sub.startsWith('local_')) rmSync(join(artRoot(), sys, sub), { recursive: true, force: true })
      }
    }
  } catch {
    // niente cache: niente da togliere
  }
}

export interface MameTitles {
  /** Nome breve del gioco principale, se questa è una variante */
  parentOf(name: string): string | undefined
  titleOf(name: string): string | undefined
  parentTitleOf(name: string): string | undefined
}
let mameProvider: (() => Promise<MameTitles | null>) | null = null
export const setMameTitleProvider = (fn: () => Promise<MameTitles | null>): void => {
  mameProvider = fn
}

let datMap: Map<string, string> | null = null
let titleIndex: TitleIndex = new Map()

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
  titleIndex = buildTitleIndex(map.values())
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

const missPath = (systemId: string, stem: string, kind: ArtKind): string => join(artRoot(), systemId, `${stem}.${kind}.v2.miss`)

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
  // per le varianti MAME il nome della macchina è diverso da quello dello ZIP
  const stem = clean(game.machine ?? parse(game.fileName).name)
  const key = `${system.id}:${stem}:${kind}`
  const running = inflight.get(key)
  if (running) return running
  const job = resolveArt(game, system, enabled, stem, kind).finally(() => inflight.delete(key))
  inflight.set(key, job)
  return job
}

async function resolveArt(game: Game, system: SystemDef, enabled: boolean, stem: string, kind: ArtKind): Promise<string | null> {
  // 0) immagini locali (pacchetti Multimedia): nome breve esatto, senza rete; per le varianti si ripiega sul gioco principale
  const media = mediaProvider?.() ?? null
  if (media && (system.engine === 'mame' || system.titleDat)) {
    const parent = system.titleSource === 'mame' && mameProvider ? (await mameProvider())?.parentOf(stem.toLowerCase()) : undefined
    const hit = await media.find(kind, [stem.toLowerCase(), parent ?? ''])
    if (hit) {
      const dest = localPath(system.id, `local_${kind}`, stem)
      try {
        if (!existsSync(dest)) {
          mkdirSync(join(dest, '..'), { recursive: true })
          writeFileSync(dest, await hit.read())
        }
        return toUrl(system.id, `local_${kind}`, stem)
      } catch {
        // file illeggibile o danneggiato: si prosegue con le altre fonti
      }
    }
  }

  let names: string[]
  let fallbacks: string[] = []
  if (system.titleSource === 'mame') {
    const titles = mameProvider ? await mameProvider() : null
    if (!titles) return null // mame.exe non disponibile: nessun titolo, nessun segno di "mancante"
    const title = titles.titleOf(stem.toLowerCase())
    names = title ? [clean(title)] : []
    // le varianti spesso non hanno la copertina: si ripiega su quella del gioco principale
    const parent = titles.parentTitleOf(stem.toLowerCase())
    if (kind === 'boxart' && parent) fallbacks = [clean(parent)]
  } else if (system.titleDat) {
    // Arcade / Neo Geo: dal nome breve del file si ricava il titolo completo
    const titles = await arcadeTitles()
    if (!titles) return null // DAT non disponibile (offline): nessun segno di "mancante"
    const title = titles.get(stem.toLowerCase())
    names = title ? [clean(title)] : []
    // hack e bootleg spesso non hanno la copertina verticale: si ripiega su quella del gioco originale
    if (title && kind === 'boxart') fallbacks = parentCandidates(titleIndex, title).map(clean)
  } else {
    names = candidates(game.fileName)
  }

  const dir = KIND_DIR[kind]
  // 1) già in cache?
  for (const n of names) if (existsSync(localPath(system.id, dir, n))) return toUrl(system.id, dir, n)
  if (!enabled || existsSync(missPath(system.id, stem, kind))) return null

  // 2) da scaricare (prima il titolo esatto, poi i giochi originali); il file si salva col nome del gioco richiesto
  return slot(async () => {
    let networkProblem = false
    for (const n of [...names, ...fallbacks]) {
      const res = await download(system.thumbs!, dir, n)
      if (res === 'error') networkProblem = true
      else if (res !== 'notfound') {
        const saveAs = names[0] ?? n
        const file = localPath(system.id, dir, saveAs)
        mkdirSync(join(file, '..'), { recursive: true })
        writeFileSync(file, res.data)
        return toUrl(system.id, dir, saveAs)
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
