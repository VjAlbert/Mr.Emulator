/** Ricerca dei titoli: parole separate, senza accenti né punteggiatura, con i risultati migliori per primi. */

/** Minuscolo, senza accenti, solo lettere e cifre separate da spazi */
export const norm = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/** "Titolo (dettagli)" -> parte principale + dettagli tecnici mostrati più piccoli */
export function splitTitle(name: string): { main: string; tag: string } {
  const i = name.indexOf(' (')
  return i > 0 ? { main: name.slice(0, i), tag: name.slice(i + 1) } : { main: name, tag: '' }
}

export const INITIALS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '#']

/** Iniziale di un titolo già normalizzato: lettera, oppure # per numeri e simboli */
export const initialOf = (key: string): string => (/^[a-z]/.test(key) ? key[0].toUpperCase() : '#')

const tokens = (query: string): string[] => norm(query).split(' ').filter(Boolean)

/** Indici dei titoli che contengono tutte le parole cercate, nell'ordine originale */
export function matchAll(keys: string[], query: string): number[] {
  const toks = tokens(query)
  if (!toks.length) return keys.map((_, i) => i)
  const out: number[] = []
  for (let i = 0; i < keys.length; i++) {
    const padded = ` ${keys[i]} `
    let ok = true
    for (const t of toks) {
      if (!padded.includes(t)) {
        ok = false
        break
      }
    }
    if (ok) out.push(i)
  }
  return out
}

export interface Hits {
  /** I migliori risultati (indici), il più pertinente per primo */
  top: number[]
  /** Quanti titoli corrispondono in tutto */
  total: number
}

/** Cerca e ordina per pertinenza: titolo che inizia con la parola > parola che inizia così > contenuto */
export function searchTitles(keys: string[], query: string, limit = 30): Hits {
  const toks = tokens(query)
  if (!toks.length) return { top: [], total: 0 }
  const scored: Array<[number, number]> = []
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    const padded = ` ${k} `
    let score = 0
    let ok = true
    for (const t of toks) {
      if (padded.includes(` ${t}`)) score += 2
      else if (padded.includes(t)) score += 1
      else {
        ok = false
        break
      }
    }
    if (!ok) continue
    if (k.startsWith(toks[0])) score += 3
    scored.push([i, score - k.length / 1000]) // a parità, titoli più corti per primi
  }
  scored.sort((a, b) => b[1] - a[1] || a[0] - b[0])
  return { top: scored.slice(0, limit).map((s) => s[0]), total: scored.length }
}
