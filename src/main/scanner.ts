import { readdirSync, existsSync } from 'fs'
import { join, extname, parse } from 'path'
import type { Game, SystemDef } from '@shared/types'

const MAX_DEPTH = 3

/** Toglie estensione e tag tra parentesi: "Sonic (USA) [!].md" -> "Sonic" */
export function prettyName(fileName: string): string {
  return parse(fileName)
    .name.replace(/\s*[([].*?[)\]]/g, '')
    .replace(/_/g, ' ')
    .trim()
}

function walk(dir: string, depth: number, exts: Set<string>, out: string[]): void {
  if (depth > MAX_DEPTH) return
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full, depth + 1, exts, out)
    else if (exts.has(extname(e.name).toLowerCase())) out.push(full)
  }
}

export function scanSystem(romsDir: string, system: SystemDef): Game[] {
  if (!romsDir) return []
  const dir = join(romsDir, system.folder)
  if (!existsSync(dir)) return []
  const files: string[] = []
  walk(dir, 0, new Set(system.extensions), files)
  return files
    .map((path) => {
      const fileName = parse(path).base
      return { id: `${system.id}:${path}`, name: prettyName(fileName), fileName, path, systemId: system.id }
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'it'))
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
