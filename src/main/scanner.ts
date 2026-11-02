import { promises as fsp } from 'fs'
import { join, extname, parse, relative } from 'path'
import type { Game, SystemDef } from '@shared/types'

const MAX_DEPTH = 3

/** Toglie estensione e tag tra parentesi: "Sonic (USA) [!].md" -> "Sonic" */
export function prettyName(fileName: string): string {
  return parse(fileName)
    .name.replace(/\s*[([].*?[)\]]/g, '')
    .replace(/_/g, ' ')
    .trim()
}

/** Set di sistema (BIOS) di FBNeo: non sono giochi e non vanno mostrati nella lista */
export const BIOS_SETS = new Set(['neogeo', 'pgm', 'decocass', 'cchip', 'ym2608', 'midssio', 'nmk004', 'isgsm', 'konamigx', 'skns'])

const tick = (): Promise<void> => new Promise((r) => setImmediate(r))

/**
 * Cerca i file di un sistema senza bloccare il programma: lavora a pezzi e cede il turno
 * ogni tanto, così l'interfaccia resta fluida anche con decine di migliaia di file.
 * Restituisce i percorsi relativi alla cartella del sistema.
 */
export async function scanSystemFiles(
  base: string,
  system: SystemDef,
  onProgress?: (found: number) => void
): Promise<string[]> {
  const exts = new Set(system.extensions)
  const out: string[] = []
  const stack: Array<[string, number]> = [[base, 0]]
  let sinceYield = 0

  while (stack.length) {
    const [dir, depth] = stack.pop()!
    let entries
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true })
    } catch {
      continue // cartella assente o non leggibile
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (depth < MAX_DEPTH) stack.push([join(dir, e.name), depth + 1])
      } else if (exts.has(extname(e.name).toLowerCase())) {
        out.push(relative(base, join(dir, e.name)))
      }
      // anche una singola cartella con 40.000 file viene elaborata a piccoli pezzi
      if (++sinceYield >= 1500) {
        sinceYield = 0
        onProgress?.(out.length)
        await tick()
      }
    }
  }
  onProgress?.(out.length)
  return out
}

const DEMO_NAMES = [
  'Street Brawlers', 'Neon Racer', 'Pixel Hunter', 'Turbo Kick', 'Dragon Fist',
  'Space Raid', 'Cyber Knights', 'Mega Puzzle', 'Final Round', 'Iron Fighters',
  'Night Strike', 'Hyper Soccer'
]

/** Giochi finti per vedere l'interfaccia prima di configurare le ROM */
export function demoGames(system: SystemDef): Game[] {
  return DEMO_NAMES.map((name, i) => ({
    id: `demo:${system.id}:${i}`,
    name,
    fileName: `${name}.demo`,
    path: '',
    systemId: system.id,
    demo: true
  }))
}
