import { promises as fsp } from 'fs'
import { join } from 'path'
import { openZip, readZipEntry, type ZipArchive } from './zipinfo'

/**
 * Immagini locali (pacchetti Multimedia / EXTRAs di MAME): file col nome breve del gioco,
 * in cartelle (snap/pbobblen.png) oppure dentro archivi ZIP (snap.zip). Il riconoscimento è
 * flessibile perché i pacchetti non hanno tutti gli stessi nomi di cartella.
 */

export type MediaKind = 'boxart' | 'snap' | 'title'

/** Nomi di cartella o archivio riconosciuti per ogni tipo di immagine, dal preferito al meno preferito */
const FOLDERS: Record<MediaKind, string[]> = {
  boxart: ['flyers', 'flyer', 'covers', 'cover', 'boxart', 'box', 'cabinets', 'cabinet'],
  snap: ['snap', 'snaps', 'screenshots', 'ingame', 'ingames'],
  title: ['titles', 'title']
}
const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp']
const isImage = (ext: string): boolean => IMAGE_EXT.includes(ext)

interface Source {
  kind: MediaKind
  name: string
  path: string
  type: 'dir' | 'zip'
}

export interface MediaReport {
  base: string
  found: Array<{ kind: MediaKind; name: string; path: string; type: 'dir' | 'zip'; count: number }>
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
    const kindOf = (name: string): MediaKind | null => {
      for (const k of Object.keys(FOLDERS) as MediaKind[]) if (FOLDERS[k].includes(name)) return k
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
    sources.sort((a, b) => FOLDERS[a.kind].indexOf(a.name.toLowerCase().replace(/\.zip$/, '')) - FOLDERS[b.kind].indexOf(b.name.toLowerCase().replace(/\.zip$/, '')))
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
      return { base: this.base, found: [], other: [], unsupported: [], error: 'La cartella non esiste o non è raggiungibile.' }
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
