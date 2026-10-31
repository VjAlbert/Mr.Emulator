/**
 * Ricerca del "gioco originale" per versioni modificate (hack) e pirata (bootleg),
 * che spesso non hanno una copertina propria nell'archivio.
 */

export type TitleIndex = Map<string, string[]>

/** Titolo senza il gruppo tra parentesi finale: "King of Fighters 2002 (Plus, Hack)" -> "King of Fighters 2002" */
const baseOf = (t: string): string => t.replace(/\s*\(.*$/, '').trim()

export function buildTitleIndex(titles: Iterable<string>): TitleIndex {
  const index: TitleIndex = new Map()
  for (const t of titles) {
    const key = baseOf(t).toLowerCase()
    const list = index.get(key)
    if (list) list.push(t)
    else index.set(key, [t])
  }
  return index
}

// segni che indicano una versione non originale
const MODIFIED = /hack|bootleg|set \d|omega|remix|mugen|decrypted|plus|super|special|unlimited|evolution/i

/** Titoli di giochi "originali" da cui il titolo dato potrebbe derivare, dal più probabile */
export function parentCandidates(index: TitleIndex, title: string, max = 4): string[] {
  const out: string[] = []
  const add = (base: string): void => {
    for (const t of index.get(base.toLowerCase()) ?? []) if (t !== title && !out.includes(t)) out.push(t)
  }

  // "... (bootleg of The King of Fighters 2002)" dichiara già l'originale
  const declared = /(?:bootleg|hack) of (.+?)\)?$/i.exec(title)
  if (declared) add(declared[1].trim())

  // stesso nome base con altri dettagli: "KOF 2002 (Omega, Hack)" -> "KOF 2002 (NGM-2650)"
  add(baseOf(title))

  // altrimenti si accorcia il nome: "KOF 2002 Magic Plus" -> "KOF 2002 Magic" -> "KOF 2002"
  const words = baseOf(title).split(/\s+/)
  for (let n = words.length - 1; n >= 2; n--) add(words.slice(0, n).join(' '))

  // prima le versioni originali, poi le altre (l'ordine precedente si mantiene)
  const paren = (t: string): string => t.slice(baseOf(t).length)
  const original = out.filter((t) => !MODIFIED.test(paren(t)))
  const others = out.filter((t) => MODIFIED.test(paren(t)))
  return [...original, ...others].slice(0, max)
}
