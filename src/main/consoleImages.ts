import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs'
import { extname, join } from 'path'

/** Foto delle console messe dall'utente: una cartella, un file per sistema */
const MIME: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }
const MAX_BYTES = 12 * 1024 * 1024

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Cartella delle foto delle console: dentro la cartella della cache se l'utente l'ha spostata, altrimenti nei dati del programma */
export const consoleImagesDir = (userData: string, cacheRoot = ''): string => (cacheRoot ? join(cacheRoot, '_consoles') : join(userData, 'consoles'))

interface Named {
  id: string
  name: string
  short: string
}

/** File che corrisponde a un sistema: il nome del file può essere l'id (snes), il nome (Super Nintendo) o la sigla (SNES) */
export function findConsoleImage(dir: string, sys: Named): string | null {
  let files: string[] = []
  try {
    files = readdirSync(dir)
  } catch {
    return null
  }
  const wanted = [norm(sys.id), norm(sys.name), norm(sys.short)]
  for (const w of wanted) {
    for (const f of files) {
      const ext = extname(f).toLowerCase()
      if (MIME[ext] && norm(f.slice(0, f.length - ext.length)) === w) return join(dir, f)
    }
  }
  return null
}

export function listConsoleImages(dir: string, systems: Named[]): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const s of systems) out[s.id] = findConsoleImage(dir, s)
  return out
}

/** Contenuto dell'immagine come "data URL" (null se manca, è troppo grande o non è leggibile) */
export function readConsoleImage(path: string | null): string | null {
  if (!path || !existsSync(path)) return null
  try {
    if (statSync(path).size > MAX_BYTES) return null
    const mime = MIME[extname(path).toLowerCase()]
    return mime ? `data:${mime};base64,${readFileSync(path).toString('base64')}` : null
  } catch {
    return null
  }
}

export function ensureConsoleImagesDir(userData: string, cacheRoot = ''): string {
  const dir = consoleImagesDir(userData, cacheRoot)
  mkdirSync(dir, { recursive: true })
  return dir
}
