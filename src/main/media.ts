import { promises as fsp } from 'fs'
import { join } from 'path'
import { openZip, readZipEntry, type ZipArchive } from './zipinfo'
import { mt } from './mt'

/**
 * Immagini locali (pacchetti Multimedia / EXTRAs di MAME): file col nome breve del gioco,
 * in cartelle (snap/pbobblen.png) oppure dentro archivi ZIP (snap.zip). Il riconoscimento è
 * flessibile perché i pacchetti non hanno tutti gli stessi nomi di cartella.
 */

export type MediaKind = 'boxart' | 'snap' | 'title'
/** Oltre alle immagini: filmati delle partite e colonna sonora */
export type MediaKindAll = MediaKind | 'video' | 'sound'

/** Nomi di cartella o archivio riconosciuti per ogni tipo di immagine, dal preferito al meno preferito */
const FOLDERS: Record<MediaKind, string[]> = {
  boxart: ['flyers', 'flyer', 'covers', 'cover', 'boxart', 'box', 'cabinets', 'cabinet'],
  snap: ['snap', 'snaps', 'screenshots', 'ingame', 'ingames'],
  title: ['titles', 'title']
}
/** Cartelle dei filmati e della musica (non sono immagini: si cercano a parte) */
const EXTRA_FOLDERS: Record<'video' | 'sound', string[]> = {
  video: ['videosnaps', 'videosnap', 'videos', 'video'],
  sound: ['soundtrack', 'soundtracks', 'music', 'ost']
}
const VIDEO_EXT = ['.mp4', '.webm', '.m4v']
const AUDIO_EXT = ['.mp3', '.ogg', '.m4a', '.flac', '.wav', '.opus']
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp']
const isImage = (ext: string): boolean => IMAGE_EXT.includes(ext)

interface Source {
  kind: MediaKindAll
  name: string
  path: string
  type: 'dir' | 'zip'
}

export interface MediaReport {
  base: string
  found: Array<{ kind: MediaKindAll; name: string; path: string; type: 'dir' | 'zip'; count: number }>
  /** Cartelle presenti ma non riconosciute come immagini (può servire a capire la struttura) */
  other: string[]
  /** Archivi in formati che il programma non sa leggere (7z, rar) */
  unsupported: string[]
  error?: string
}

export interface MediaFile {
  ext: string
  read: () => Promise<Buffer>
}

export class MediaSource {
  private detected: { sources: Source[]; other: string[]; unsupported: string[] } | null = null
  private zips = new Map<string, Promise<ZipArchive | null>>()

  constructor(readonly base: string) {}

  /** Cerca le cartelle e gli archivi riconosciuti fino a due livelli di profondità */
  private async detect(): Promise<NonNullable<MediaSource['detected']>> {
    if (this.detected) return this.detected
    const sources: Source[] = []
    const other: string[] = []
    const unsupported: string[] = []
    const queue: Array<[string, number]> = [[this.base, 0]]
    const kindOf = (name: string): MediaKindAll | null => {
      for (const k of Object.keys(FOLDERS) as MediaKind[]) if (FOLDERS[k].includes(name)) return k
      for (const k of ['video', 'sound'] as const) if (EXTRA_FOLDERS[k].includes(name)) return k
      return null
    }
    while (queue.length) {
      const [dir, depth] = queue.shift()!
      let entries
      try {
        entries = await fsp.readdir(dir, { withFileTypes: true })
      } catch {
        continue
      }
      for (const e of entries) {
        const lower = e.name.toLowerCase()
        const stem = lower.replace(/\.(zip|7z|rar)$/, '')
        const kind = kindOf(stem)
        if (e.isDirectory()) {
          if (kind) sources.push({ kind, name: e.name, path: join(dir, e.name), type: 'dir' })
          else {
            if (depth === 0) other.push(e.name)
            if (depth < 2) queue.push([join(dir, e.name), depth + 1])
          }
        } else if (kind && lower.endsWith('.zip')) {
          sources.push({ kind, name: e.name, path: join(dir, e.name), type: 'zip' })
        } else if (kind && /\.(7z|rar)$/.test(lower)) {
          unsupported.push(e.name)
        }
      }
    }
    // dentro ogni tipo, prima i nomi preferiti
    const list = (k: MediaKindAll): string[] => (k === 'video' || k === 'sound' ? EXTRA_FOLDERS[k] : FOLDERS[k])
    sources.sort((a, b) => list(a.kind).indexOf(a.name.toLowerCase().replace(/\.zip$/, '')) - list(b.kind).indexOf(b.name.toLowerCase().replace(/\.zip$/, '')))
    this.detected = { sources, other, unsupported }
    return this.detected
  }

  private zip(path: string): Promise<ZipArchive | null> {
    let z = this.zips.get(path)
    if (!z) {
      z = openZip(path, isImage)
      this.zips.set(path, z)
    }
    return z
  }

  async analyze(): Promise<MediaReport> {
    try {
      await fsp.access(this.base)
    } catch {
      return { base: this.base, found: [], other: [], unsupported: [], error: mt('La cartella non esiste o non è raggiungibile.') }
    }
    const d = await this.detect()
    const found: MediaReport['found'] = []
    for (const s of d.sources) {
      let count = 0
      if (s.type === 'zip') count = (await this.zip(s.path))?.entries.size ?? 0
      else {
        try {
          count = (await fsp.readdir(s.path)).length
        } catch {
          count = 0
        }
      }
      found.push({ kind: s.kind, name: s.name, path: s.path, type: s.type, count })
    }
    return { base: this.base, found, other: d.other, unsupported: d.unsupported }
  }

  /** Filmato della partita (videosnaps/nome.mp4): percorso del file, se c'è */
  async findVideo(names: string[]): Promise<string | null> {
    const d = await this.detect()
    for (const s of d.sources) {
      if (s.kind !== 'video' || s.type !== 'dir') continue
      for (const name of names) {
        if (!name) continue
        for (const ext of VIDEO_EXT) {
          const file = join(s.path, name + ext)
          try {
            if ((await fsp.stat(file)).isFile()) return file
          } catch {
            // non c'è con questa estensione
          }
        }
      }
    }
    return null
  }

  /** Brani della colonna sonora (soundtrack/nome/01 Titolo.mp3), in ordine di numero */
  async findTracks(names: string[]): Promise<Array<{ title: string; path: string }>> {
    const d = await this.detect()
    for (const s of d.sources) {
      if (s.kind !== 'sound' || s.type !== 'dir') continue
      for (const name of names) {
        if (!name) continue
        const dir = join(s.path, name)
        let files: string[]
        try {
          files = await fsp.readdir(dir)
        } catch {
          continue
        }
        const tracks = files
          .filter((f) => AUDIO_EXT.some((e) => f.toLowerCase().endsWith(e)))
          .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
          .map((f) => ({ path: join(dir, f), title: f.replace(/\.[^.]+$/, '').replace(/^\d+\s*[-_.]?\s*/, '') || f }))
        if (tracks.length) return tracks
      }
    }
    return []
  }

  /** Cerca l'immagine di un gioco provando i nomi dati in ordine (nome breve e, se c'è, quello del gioco principale) */
  async find(kind: MediaKind, names: string[]): Promise<MediaFile | null> {
    const d = await this.detect()
    for (const s of d.sources) {
      if (s.kind !== kind) continue
      for (const name of names) {
        if (!name) continue
        if (s.type === 'dir') {
          for (const ext of IMAGE_EXT) {
            const file = join(s.path, name + ext)
            try {
              const st = await fsp.stat(file)
              if (st.isFile()) return { ext, read: () => fsp.readFile(file) }
            } catch {
              // non c'è con questa estensione
            }
          }
        } else {
          const z = await this.zip(s.path)
          const e = z?.entries.get(name.toLowerCase())
          if (z && e) return { ext: '.png', read: () => readZipEntry(z.file, e) }
        }
      }
    }
    return null
  }
}
