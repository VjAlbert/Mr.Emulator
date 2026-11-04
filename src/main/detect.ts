import { existsSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export type ToolKind = 'retroarch' | 'mame'

/** Siti ufficiali: gli unici indirizzi che il programma apre (nel browser; non scarica né esegue nulla) */
export const OFFICIAL: Record<ToolKind, string> = {
  retroarch: 'https://www.retroarch.com/?page=platforms',
  mame: 'https://www.mamedev.org/release.html'
}

const EXE: Record<ToolKind, string> = { retroarch: 'retroarch.exe', mame: 'mame.exe' }
const DIR: Record<ToolKind, RegExp> = { retroarch: /retroarch/i, mame: /mame/i }
/** Cartelle "contenitore" dove spesso si tengono più emulatori */
const HOLDER = /emulat|giochi|games|retro/i

function hasExe(dir: string, kind: ToolKind): string | null {
  try {
    const f = readdirSync(dir).find((n) => n.toLowerCase() === EXE[kind])
    return f ? join(dir, f) : null
  } catch {
    return null
  }
}

function subdirs(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  } catch {
    return []
  }
}

/**
 * Cerca l'eseguibile già installato nei posti comuni: cartelle con "retroarch"/"mame" nel nome dentro le cartelle base,
 * e dentro le cartelle contenitore ("Emulatori", "Games"…). Niente ricerche sul disco intero: è veloce e prevedibile.
 */
export function findInstalls(kind: ToolKind, bases: string[]): string[] {
  const found = new Set<string>()
  const add = (p: string | null): void => {
    if (p) found.add(p)
  }
  const scan = (dir: string, depth: number): void => {
    add(hasExe(dir, kind))
    if (depth <= 0) return
    for (const n of subdirs(dir)) {
      if (DIR[kind].test(n)) scan(join(dir, n), 1)
      else if (HOLDER.test(n)) scan(join(dir, n), depth - 1)
    }
  }
  for (const b of bases) if (b && existsSync(b)) scan(b, 2)
  return [...found]
}

/** Cartelle base di Windows e dell'utente */
export function commonBases(documents: string, downloads: string, desktop: string): string[] {
  const env = process.env
  const drives = ['C', 'D', 'E', 'F', 'G'].map((d) => `${d}:\\`)
  return [
    ...drives,
    env.ProgramFiles ?? '',
    env['ProgramFiles(x86)'] ?? '',
    env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'Programs') : '',
    documents,
    join(documents, 'MrEmulator'),
    downloads,
    desktop,
    homedir()
  ]
}
