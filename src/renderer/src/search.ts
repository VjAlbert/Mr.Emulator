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

/** Parole brevissime e numeri devono cominciare una parola ("2" non deve trovare "1942" né "ii" trovare "mission"): meno rumore */
const startsOnly = (t: string): boolean => t.length <= 2 || /^\d+$/.test(t)

/** Indici dei titoli che contengono tutte le parole cercate, nell'ordine originale */
export function matchAll(keys: string[], query: string): number[] {
  const toks = tokens(query)
  if (!toks.length) return keys.map((_, i) => i)
  const out: number[] = []
  for (let i = 0; i < keys.length; i++) {
    const padded = ` ${keys[i]} `
    let ok = true
    for (const t of toks) {
      if (!padded.includes(startsOnly(t) ? ` ${t}` : t)) {
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
      else if (!startsOnly(t) && padded.includes(t)) score += 1
      else {
        ok = false
        break
      }
    }
    if (!ok) continue
    if (k.startsWith(toks[0])) score += 3
    if (k === toks.join(' ')) score += 6
    scored.push([i, score - k.length / 1000]) // a parità, titoli più corti per primi
  }
  scored.sort((a, b) => b[1] - a[1] || a[0] - b[0])
  return { top: scored.slice(0, limit).map((s) => s[0]), total: scored.length }
}

/**
 * Quali caratteri possono seguire quello che è stato scritto, in almeno un titolo.
 * Serve alla tastiera intelligente: i tasti che non portano a nessun titolo si spengono.
 * Il carattere " " (spazio) è presente se dopo la parola in corso può esserci un'altra parola.
 */
export function nextChars(keys: string[], query: string): Set<string> {
  const endsSpace = /\s$/.test(query)
  const toks = norm(query).split(' ').filter(Boolean)
  const partial = endsSpace || !toks.length ? '' : toks[toks.length - 1]
  const fixed = partial ? toks.slice(0, -1) : toks
  const out = new Set<string>()
  for (const k of keys) {
    const padded = ` ${k} `
    let ok = true
    for (const t of fixed) {
      if (!padded.includes(t)) {
        ok = false
        break
      }
    }
    if (!ok) continue
    if (!partial) {
      for (let i = 0; i < padded.length - 1; i++) if (padded[i] === ' ' && padded[i + 1] !== ' ') out.add(padded[i + 1])
    } else {
      let i = padded.indexOf(partial)
      while (i >= 0) {
        const j = i + partial.length
        const c = padded[j]
        if (c === ' ') {
          if (j < padded.length - 1) out.add(' ')
        } else if (c) out.add(c)
        i = padded.indexOf(partial, i + 1)
      }
    }
    if (out.size >= 37) break // già tutte le lettere, le cifre e lo spazio
  }
  return out
}

/** Intervalli [da, a) del titolo che corrispondono alle parole cercate, per evidenziarli */
export function highlightRanges(name: string, query: string): Array<[number, number]> {
  const toks = tokens(query)
  if (!toks.length) return []
  const plain = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  if (plain.length !== name.length) return []
  const raw: Array<[number, number]> = []
  for (const t of toks) {
    let i = plain.indexOf(t)
    while (i >= 0) {
      raw.push([i, i + t.length])
      i = plain.indexOf(t, i + t.length)
    }
  }
  raw.sort((a, b) => a[0] - b[0])
  const merged: Array<[number, number]> = []
  for (const r of raw) {
    const last = merged[merged.length - 1]
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1])
    else merged.push([r[0], r[1]])
  }
  return merged
}

/** Decennio di un anno ("1985" -> "1980", "199?" -> "1990"); null se non noto */
export function decadeOf(year?: string): string | null {
  const m = /^(19[5-9]|20[0-3])/.exec(year ?? '')
  return m ? `${m[1]}0` : null
}

export const decadeLabel = (d: string): string => (d >= '2000' ? `ANNI ${d}` : `ANNI '${d.slice(2, 4)}`)
