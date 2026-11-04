import { promises as fsp, cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'fs'
import { dirname, join, resolve, sep } from 'path'
import { writeFileAtomic } from './atomic'
import { compressImage } from './artwork'

export interface CacheStats {
  dir: string
  /** Byte totali */
  total: number
  /** Copertine e immagini scaricate */
  downloaded: number
  /** Copie delle immagini dei pacchetti Multimedia (le versioni vecchie le facevano per ogni gioco) */
  localCopies: number
  files: number
}

const isImageDir = (name: string): boolean => name.startsWith('Named_') || name.startsWith('local_')

interface Entry {
  file: string
  size: number
  mtime: number
  local: boolean
}

/** Tutte le immagini della cache (solo cartelle Named_* e local_*: indici e DAT non si toccano) */
async function listImages(root: string): Promise<Entry[]> {
  const out: Entry[] = []
  let systems: string[] = []
  try {
    systems = await fsp.readdir(root)
  } catch {
    return out
  }
  for (const sys of systems) {
    let kinds: string[] = []
    try {
      kinds = (await fsp.readdir(join(root, sys), { withFileTypes: true })).filter((e) => e.isDirectory() && isImageDir(e.name)).map((e) => e.name)
    } catch {
      continue
    }
    for (const kind of kinds) {
      const dir = join(root, sys, kind)
      let names: string[] = []
      try {
        names = await fsp.readdir(dir)
      } catch {
        continue
      }
      for (const n of names) {
        try {
          const st = await fsp.stat(join(dir, n))
          if (st.isFile()) out.push({ file: join(dir, n), size: st.size, mtime: st.mtimeMs, local: kind.startsWith('local_') })
        } catch {
          // file sparito nel frattempo
        }
      }
    }
  }
  return out
}

export async function cacheStats(root: string): Promise<CacheStats> {
  const all = await listImages(root)
  let downloaded = 0
  let localCopies = 0
  for (const e of all) {
    if (e.local) localCopies += e.size
    else downloaded += e.size
  }
  return { dir: root, total: downloaded + localCopies, downloaded, localCopies, files: all.length }
}

/** Una JPEG comincia con FF D8: le immagini già compresse non si ritoccano */
const isJpeg = (b: Buffer): boolean => b.length > 3 && b[0] === 0xff && b[1] === 0xd8

export interface OptimizeResult {
  files: number
  saved: number
}

/** Comprime le immagini già in cache (lato massimo 640 px, JPEG). Sicura: si riscrive solo se il file diventa più piccolo. */
export async function optimizeCache(root: string, job: { cancel: boolean }, onProgress: (pct: number) => void, compress: (b: Buffer) => Buffer = compressImage): Promise<OptimizeResult> {
  const all = await listImages(root)
  let done = 0
  let changed = 0
  let saved = 0
  for (const e of all) {
    if (job.cancel) break
    try {
      const data = await fsp.readFile(e.file)
      if (!isJpeg(data)) {
        const out = compress(data)
        if (out.length < data.length) {
          writeFileAtomic(e.file, out)
          saved += data.length - out.length
          changed++
        }
      }
    } catch {
      // file illeggibile: si lascia com'è
    }
    done++
    if (done % 50 === 0) onProgress(Math.round((done / Math.max(all.length, 1)) * 100))
  }
  onProgress(100)
  return { files: changed, saved }
}

/** Toglie le immagini più vecchie finché la cache sta sotto il limite (byte); 0 = nessun limite */
export async function pruneCache(root: string, maxBytes: number): Promise<number> {
  if (maxBytes <= 0) return 0
  const all = await listImages(root)
  let total = all.reduce((a, e) => a + e.size, 0)
  if (total <= maxBytes) return 0
  let removed = 0
  // prima le copie locali, poi le più vecchie
  all.sort((a, b) => Number(b.local) - Number(a.local) || a.mtime - b.mtime)
  for (const e of all) {
    if (total <= maxBytes) break
    try {
      rmSync(e.file, { force: true })
      total -= e.size
      removed++
    } catch {
      // non si riesce a togliere: si passa oltre
    }
  }
  return removed
}

/** Svuota le copie dei pacchetti Multimedia (si ricreano da sole, ma compresse, solo per i file dentro gli ZIP) */
export async function clearLocalCopies(root: string): Promise<number> {
  const all = (await listImages(root)).filter((e) => e.local)
  for (const e of all) rmSync(e.file, { force: true })
  return all.length
}

/** Svuota tutte le immagini scaricate; indici e DAT restano (servono per ritrovare i titoli) */
export async function clearImages(root: string): Promise<number> {
  const all = await listImages(root)
  for (const e of all) rmSync(e.file, { force: true })
  return all.length
}

export interface MoveResult {
  ok: boolean
  error?: string
}

/** Sposta la cache in un'altra cartella (anche su un altro disco). I file vecchi si tolgono solo a copia riuscita. */
export async function moveCache(from: string, to: string, onProgress: (pct: number) => void): Promise<MoveResult> {
  const a = resolve(from)
  const b = resolve(to)
  if (a === b) return { ok: true }
  if (b.startsWith(a + sep) || a.startsWith(b + sep)) return { ok: false, error: 'cartelle una dentro l\'altra' }
  try {
    mkdirSync(dirname(b), { recursive: true })
    if (!existsSync(a)) {
      mkdirSync(b, { recursive: true })
      return { ok: true }
    }
    // stesso disco: basta rinominare (istantaneo)
    if (!existsSync(b)) {
      try {
        renameSync(a, b)
        onProgress(100)
        return { ok: true }
      } catch {
        // altro disco: si copia
      }
    }
    const systems = await fsp.readdir(a)
    let i = 0
    for (const s of systems) {
      cpSync(join(a, s), join(b, s), { recursive: true })
      onProgress(Math.round((++i / systems.length) * 100))
    }
    rmSync(a, { recursive: true, force: true })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}
