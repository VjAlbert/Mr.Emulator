import { readdirSync, readFileSync, statSync } from 'fs'
import { join, extname } from 'path'

export interface DatFile {
  file: string
  /** Nome indicato nell'intestazione del DAT (o il nome del file) */
  header: string
  titles: Map<string, string>
}

const decode = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")

/** Legge un DAT: XML (ClrMamePro / MAME: <game name="nomebreve"><description>Titolo</description>) oppure testo libretro (game ( name "Titolo" rom ( name nomebreve.zip */
export function parseDat(text: string, fallbackName: string): { header: string; titles: Map<string, string> } {
  const titles = new Map<string, string>()
  let header = fallbackName
  if (/^\s*(<\?xml|<)/.test(text)) {
    const h = /<header>[\s\S]*?<name>([^<]*)<\/name>/.exec(text) ?? /<softwarelist[^>]*\sname="([^"]*)"/.exec(text)
    if (h) header = decode(h[1])
    const re = /<(?:game|machine|software)\s+name="([^"]+)"[^>]*>\s*(?:<[^d/][^>]*>[^<]*<\/[^>]+>\s*)*?<description>([^<]*)<\/description>/g
    for (let m = re.exec(text); m; m = re.exec(text)) titles.set(m[1].toLowerCase(), decode(m[2]))
  } else {
    const h = /clrmamepro \(\s*name "([^"]*)"/.exec(text)
    if (h) header = h[1]
    const re = /game \(\s*name "([^"]*)"[\s\S]*?rom \( name "?([^"\s]+?)\.(?:zip|7z|nes|sms|gg|md|bin)/g
    for (let m = re.exec(text); m; m = re.exec(text)) titles.set(m[2].toLowerCase(), m[1])
  }
  return { header, titles }
}

/** Parole che nell'intestazione del DAT indicano a quale sistema appartiene */
const KEYWORDS: Record<string, RegExp> = {
  nes: /\bnes\b|nintendo entertainment|famicom(?! disk)/i,
  snes: /\bsnes\b|super nintendo|super famicom/i,
  mastersystem: /master system|\bsms\b|mark iii/i,
  megadrive: /mega ?drive|genesis|\bmd\b/i,
  gamegear: /game ?gear|\bgg\b/i,
  pce: /pc engine|turbografx|\bpce\b|\btg-?16\b/i,
  tg16: /pc engine|turbografx|\bpce\b|\btg-?16\b/i,
  sgx: /supergrafx|\bsgx\b|pc engine|\bpce\b/i,
  sg1000: /sg-?1000/i,
  fds: /disk system|\bfds\b/i,
  ngp: /neo ?geo pocket|\bngp/i,
  coleco: /coleco/i,
  msx: /\bmsx/i,
  spectrum: /spectrum/i,
  channelf: /channel ?f/i,
  astrocade: /astrocade/i,
  gb: /game ?boy(?! color| advance)|\bgb\b/i,
  gbc: /game ?boy color|\bgbc\b/i,
  gba: /game ?boy advance|\bgba\b/i
}

const cache = new Map<string, { sig: string; dats: DatFile[] }>()

function listDats(dir: string, depth = 0): string[] {
  const out: string[] = []
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name)
      if (e.isDirectory()) {
        if (depth < 3) out.push(...listDats(p, depth + 1))
      } else if (['.dat', '.xml'].includes(extname(e.name).toLowerCase())) out.push(p)
    }
  } catch {
    // cartella non leggibile: nessun DAT
  }
  return out
}

/** Tutti i DAT della cartella (letti una volta, riletti se la cartella cambia) */
export function loadDats(dir: string): DatFile[] {
  if (!dir) return []
  const files = listDats(dir)
  const sig = files.map((f) => `${f}:${statSync(f).mtimeMs}`).join('|')
  const hit = cache.get(dir)
  if (hit && hit.sig === sig) return hit.dats
  const dats: DatFile[] = []
  for (const f of files) {
    try {
      const { header, titles } = parseDat(readFileSync(f, 'utf-8'), f.replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, ''))
      if (titles.size) dats.push({ file: f, header, titles })
    } catch {
      // file illeggibile: si ignora
    }
  }
  cache.set(dir, { sig, dats })
  return dats
}

/** Titoli per un sistema: i DAT con l'intestazione giusta; se non ce n'è nessuno, tutti (a parità di nome breve vince il primo) */
export function datTitles(dir: string, systemId: string, extraKeys: RegExp = KEYWORDS[systemId] ?? /$^/): Map<string, string> | null {
  const dats = loadDats(dir)
  if (!dats.length) return null
  const match = dats.filter((d) => extraKeys.test(`${d.header} ${d.file}`))
  // se esiste un DAT riconosciuto per questo sistema si usa solo quello: nomi brevi uguali in sistemi diversi (es. 1942) non vanno scambiati
  const out = new Map<string, string>()
  for (const d of match.length ? match : dats) for (const [k, v] of d.titles) if (!out.has(k)) out.set(k, v)
  return out
}

