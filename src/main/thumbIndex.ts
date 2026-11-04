import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { writeFileAtomic } from './atomic'

/**
 * Indice dei nomi delle copertine disponibili (libretro-thumbnails) per un sistema, e ricerca "intelligente":
 * i nomi dei tuoi file (es. "Crash Bandicoot (USA)", "The Legend of Zelda - A Link to the Past.sfc") non sempre
 * coincidono lettera per lettera con quelli dell'archivio ("Legend of Zelda, The - A Link to the Past (USA)").
 */

const TTL = 30 * 24 * 3600 * 1000
const decodeEntities = (s: string): string => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")

/** Nomi (senza ".png") da una pagina di elenco del sito delle copertine */
export function parseListingHtml(html: string): string[] {
  const out = new Set<string>()
  for (const m of html.matchAll(/href="([^"]+?)\.png"/gi)) {
    let n = m[1]
    try {
      n = decodeURIComponent(n)
    } catch {
      // nome non codificato: si usa com'è
    }
    n = decodeEntities(n)
    if (n && !n.includes('/')) out.add(n)
  }
  return [...out]
}

/** Nomi da una risposta "git tree" di GitHub (percorsi tipo Named_Boxarts/Nome.png) */
export function parseGithubTree(json: unknown, kindDir: string): string[] {
  const tree = (json as { tree?: Array<{ path?: string }> } | null)?.tree
  if (!Array.isArray(tree)) return []
  const prefix = `${kindDir}/`
  const out: string[] = []
  for (const e of tree) {
    const p = e.path ?? ''
    if (p.startsWith(prefix) && p.endsWith('.png') && !p.slice(prefix.length).includes('/')) out.push(p.slice(prefix.length, -4))
  }
  return out
}

const mem = new Map<string, Promise<string[] | null>>()

/** Elenco dei nomi per (archivio, cartella): dal sito ufficiale, altrimenti da GitHub; si conserva su disco per 30 giorni */
export function loadIndex(root: string, repo: string, kindDir: string, fetchFn: typeof fetch = fetch): Promise<string[] | null> {
  const key = `${repo}|${kindDir}`
  let p = mem.get(key)
  if (!p) {
    p = fetchIndex(root, repo, kindDir, fetchFn)
    mem.set(key, p)
    // un fallimento non resta in memoria: si riprova alla prossima richiesta
    p.then((r) => r === null && mem.delete(key))
  }
  return p
}

async function fetchIndex(root: string, repo: string, kindDir: string, fetchFn: typeof fetch): Promise<string[] | null> {
  const file = join(root, '_idx', `${repo.replace(/[^A-Za-z0-9]+/g, '_')}__${kindDir}.json`)
  let stale: string[] | null = null
  try {
    if (existsSync(file)) {
      const j = JSON.parse(readFileSync(file, 'utf8')) as { at: number; names: string[] }
      if (Array.isArray(j.names) && j.names.length) {
        if (Date.now() - j.at < TTL) return j.names
        stale = j.names
      }
    }
  } catch {
    // indice illeggibile: si riscarica
  }
  let names: string[] = []
  try {
    const res = await fetchFn(`https://thumbnails.libretro.com/${encodeURIComponent(repo)}/${kindDir}/`, { signal: AbortSignal.timeout(30000) })
    if (res.ok) names = parseListingHtml(await res.text())
  } catch {
    // sito non raggiungibile: si prova GitHub
  }
  if (!names.length) {
    try {
      const res = await fetchFn(`https://api.github.com/repos/libretro-thumbnails/${repo.replace(/ /g, '_')}/git/trees/master?recursive=1`, {
        signal: AbortSignal.timeout(30000),
        headers: { Accept: 'application/vnd.github+json' }
      })
      if (res.ok) names = parseGithubTree(await res.json(), kindDir)
    } catch {
      // niente rete
    }
  }
  if (!names.length) return stale
  try {
    mkdirSync(join(root, '_idx'), { recursive: true })
    writeFileAtomic(file, JSON.stringify({ at: Date.now(), names }))
  } catch {
    // la copia su disco è un extra
  }
  return names
}

// ---- ricerca ----

const REGIONS = ['usa', 'world', 'europe', 'japan', 'asia', 'australia', 'canada', 'brazil', 'korea', 'china', 'taiwan', 'france', 'germany', 'italy', 'spain', 'netherlands', 'sweden', 'russia', 'uk']
const BAD = /\b(beta|proto|prototype|demo|sample|unl|pirate|hack|kiosk|promo|bootleg|aftermarket|test)\b/i

const stripTags = (s: string): string => s.replace(/\s*[([][^)\]]*[)\]]/g, '').trim()

/** Forma confrontabile di un titolo: senza maiuscole, accenti, simboli e con l'articolo davanti ("Zelda, The" → "the zelda") */
export function canon(title: string): string {
  let t = stripTags(title).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ')
  const i = t.indexOf(' - ')
  let main = i >= 0 ? t.slice(0, i) : t
  const rest = i >= 0 ? t.slice(i) : ''
  const art = /^(.*),\s*(the|a|an)$/i.exec(main.trim())
  if (art) main = `${art[2]} ${art[1]}`
  t = main + rest
  return t.toLowerCase().replace(/^(the|a|an)\s+/, '').replace(/[^a-z0-9]+/g, '')
}

const words = (title: string): Set<string> => new Set(stripTags(title).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').split(/[^a-z0-9]+/).filter((w) => w && !['the', 'a', 'an'].includes(w)))

interface Tags {
  regions: string[]
  disc: number | null
  bad: number
  rev: boolean
}
function tagsOf(name: string): Tags {
  const groups = [...name.matchAll(/[([]([^)\]]*)[)\]]/g)].map((m) => m[1])
  const all = groups.join(' | ')
  const regions = REGIONS.filter((r) => new RegExp(`\\b${r}\\b`, 'i').test(all))
  const disc = /dis[ck]\s*(\d+)/i.exec(all)
  return { regions, disc: disc ? Number(disc[1]) : null, bad: BAD.test(all) ? 1 : 0, rev: /\brev\b|\bv\d/i.test(all) }
}

function score(query: Tags, cand: Tags): number {
  let s = 0
  if (query.regions.length) {
    s += cand.regions.some((r) => query.regions.includes(r)) ? -5 : 2
  } else {
    // senza indicazioni si preferiscono USA, poi mondo, Europa, Giappone
    const rank = (r: string[]): number => (r.includes('usa') ? 0 : r.includes('world') ? 1 : r.includes('europe') ? 2 : r.includes('japan') ? 3 : 4)
    s += rank(cand.regions)
  }
  s += cand.bad * 4 + (cand.rev ? 1 : 0)
  if (query.disc !== null) s += cand.disc === query.disc ? -4 : cand.disc === null ? 1 : 4
  else s += cand.disc === 1 ? 0 : cand.disc === null ? -1 : 2
  return s
}

export type TitleMatcher = (title: string) => string | null

/** Prepara la ricerca su un elenco di nomi: restituisce il nome dell'archivio che meglio corrisponde a un titolo (o null) */
export function makeMatcher(names: string[]): TitleMatcher {
  const byKey = new Map<string, string[]>()
  for (const n of names) {
    const k = canon(n)
    if (!k) continue
    const l = byKey.get(k)
    if (l) l.push(n)
    else byKey.set(k, [n])
  }
  let wordCache: Array<{ key: string; w: Set<string> }> | null = null
  const pick = (list: string[], query: string): string => {
    const q = tagsOf(query)
    return [...list].sort((a, b) => score(q, tagsOf(a)) - score(q, tagsOf(b)) || a.length - b.length || a.localeCompare(b))[0]
  }
  return (title: string): string | null => {
    const k = canon(title)
    if (!k) return null
    const exact = byKey.get(k)
    if (exact) return pick(exact, title)
    // un solo titolo che comincia così (titolo troncato nel nome del file)
    if (k.length >= 8) {
      const starts = [...byKey.keys()].filter((x) => x.startsWith(k) && k.length / x.length >= 0.7)
      if (starts.length === 1) return pick(byKey.get(starts[0])!, title)
    }
    // somiglianza delle parole (Dice) con soglia alta: meglio nessuna copertina che quella sbagliata
    const qw = words(title)
    if (qw.size < 2) return null
    wordCache ??= [...byKey.keys()].map((key) => ({ key, w: words(byKey.get(key)![0]) }))
    let best: { key: string; d: number } | null = null
    for (const c of wordCache) {
      let inter = 0
      for (const w of qw) if (c.w.has(w)) inter++
      const d = (2 * inter) / (qw.size + c.w.size)
      if (d >= 0.85 && (!best || d > best.d)) best = { key: c.key, d }
    }
    return best ? pick(byKey.get(best.key)!, title) : null
  }
}
