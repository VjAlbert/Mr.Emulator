import { mkdirSync } from 'fs'
import { dirname, join, parse } from 'path'
import { writeFileAtomic } from './atomic'

/** Indicazione del disco nel nome del file: "(Disc 2)", "(Disk 2)", "(CD2)", "(Disc 2 of 3)", "[Disc 2]" */
const DISC_TOKEN = /\s*[([]\s*(?:dis[ck]|cd)\s*0?(\d+)(?:\s*(?:of|di)\s*\d+)?\s*[)\]]/i

export const discNumber = (name: string): number | null => {
  const m = DISC_TOKEN.exec(name)
  return m ? Number(m[1]) : null
}

/** Nome del gioco senza l'indicazione del disco: "Final Fantasy VII (USA) (Disc 2)" → "Final Fantasy VII (USA)" */
export const withoutDisc = (name: string): string => name.replace(DISC_TOKEN, '').replace(/\s{2,}/g, ' ').trim()

export interface DiscGroup {
  /** Nome del gioco (senza disco) */
  base: string
  /** File dei dischi, in ordine, come percorsi relativi */
  discs: string[]
}

/** Raggruppa i file che sono dischi dello stesso gioco (stessa cartella, stesso nome, numeri diversi, almeno due) */
export function groupDiscs(files: string[]): { groups: DiscGroup[]; rest: string[] } {
  const buckets = new Map<string, Array<{ rel: string; n: number; base: string }>>()
  const rest: string[] = []
  for (const rel of files) {
    const stem = parse(rel).name
    const n = discNumber(stem)
    if (n === null) {
      rest.push(rel)
      continue
    }
    const base = withoutDisc(stem)
    const key = `${dirname(rel)}\u0000${base.toLowerCase()}`
    const l = buckets.get(key)
    if (l) l.push({ rel, n, base })
    else buckets.set(key, [{ rel, n, base }])
  }
  const groups: DiscGroup[] = []
  for (const list of buckets.values()) {
    const distinct = new Set(list.map((x) => x.n))
    // un solo disco, o numeri ripetuti (versioni diverse dello stesso disco): restano file separati
    if (list.length < 2 || distinct.size !== list.length) {
      rest.push(...list.map((x) => x.rel))
      continue
    }
    list.sort((a, b) => a.n - b.n)
    groups.push({ base: list[0].base, discs: list.map((x) => x.rel) })
  }
  return { groups, rest }
}

const safeName = (s: string): string => s.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim() || 'gioco'

/**
 * Per ogni gioco a più dischi crea un file .m3u (elenco dei dischi) e lo mette al posto dei singoli dischi:
 * così si avvia un solo gioco e il cambio disco si fa dal menu di RetroArch. Restituisce l'elenco dei file da mostrare.
 */
export function makeDiscEntries(files: string[], baseDir: string, m3uDir: string): string[] {
  const { groups, rest } = groupDiscs(files)
  if (!groups.length) return files
  mkdirSync(m3uDir, { recursive: true })
  const used = new Set<string>()
  const entries: string[] = []
  for (const g of groups) {
    let name = safeName(g.base)
    for (let i = 2; used.has(name.toLowerCase()); i++) name = `${safeName(g.base)} (${i})`
    used.add(name.toLowerCase())
    const file = join(m3uDir, `${name}.m3u`)
    writeFileAtomic(file, g.discs.map((d) => join(baseDir, d)).join('\n') + '\n')
    entries.push(file)
  }
  return [...rest, ...entries]
}
