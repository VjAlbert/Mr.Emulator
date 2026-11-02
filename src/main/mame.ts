import { spawn, execFile } from 'child_process'
import { createInterface } from 'readline'
import { promises as fsp, statSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Elenco delle macchine che il MAME dell'utente conosce, letto dal MAME stesso (-listxml).
 * Così titoli, varianti e stato coincidono sempre con la versione installata (es. 0.229).
 * Il risultato si salva su disco e si rilegge solo se mame.exe cambia.
 */

export interface MameMachine {
  name: string
  description: string
  year: string
  manufacturer: string
  /** Gioco principale, se questa è una variante */
  cloneof: string | null
  bios: boolean
  device: boolean
  mechanical: boolean
  /** false per componenti che non si possono avviare da soli */
  runnable: boolean
  /** Stato dell'emulazione dichiarato da MAME */
  status: 'good' | 'imperfect' | 'preliminary' | 'unknown'
}

const unescapeXml = (s: string): string =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

const attr = (line: string, name: string): string | null => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(line)
  return m ? unescapeXml(m[1]) : null
}

/** Legge -listxml riga per riga senza tenere in memoria i 200+ MB di testo */
export function parseListXml(
  lines: AsyncIterable<string> | Iterable<string>,
  onProgress?: (machines: number) => void
): Promise<Map<string, MameMachine>> {
  return (async () => {
    const out = new Map<string, MameMachine>()
    let cur: MameMachine | null = null
    for await (const raw of lines as AsyncIterable<string>) {
      const line = raw.trim()
      if (line.startsWith('<machine ') || line.startsWith('<game ')) {
        const name = attr(line, 'name')
        if (!name) continue
        cur = {
          name,
          description: name,
          year: '',
          manufacturer: '',
          cloneof: attr(line, 'cloneof'),
          bios: attr(line, 'isbios') === 'yes',
          device: attr(line, 'isdevice') === 'yes',
          mechanical: attr(line, 'ismechanical') === 'yes',
          runnable: attr(line, 'runnable') !== 'no',
          status: 'unknown'
        }
      } else if (cur) {
        if (line.startsWith('<description>')) cur.description = unescapeXml(line.replace(/<\/?description>/g, ''))
        else if (line.startsWith('<year>')) cur.year = unescapeXml(line.replace(/<\/?year>/g, ''))
        else if (line.startsWith('<manufacturer>')) cur.manufacturer = unescapeXml(line.replace(/<\/?manufacturer>/g, ''))
        else if (line.startsWith('<driver ') && cur.status === 'unknown') {
          const st = attr(line, 'status')
          if (st === 'good' || st === 'imperfect' || st === 'preliminary') cur.status = st
        } else if (line.startsWith('</machine>') || line.startsWith('</game>')) {
          out.set(cur.name, cur)
          cur = null
          if (out.size % 2000 === 0) onProgress?.(out.size)
        }
      }
    }
    onProgress?.(out.size)
    return out
  })()
}

/** Per i MAME più vecchi o se -listxml non risponde: solo nome e titolo */
export function parseListFull(lines: Iterable<string>): Map<string, MameMachine> {
  const out = new Map<string, MameMachine>()
  for (const raw of lines) {
    const m = /^(\S+)\s+"(.*)"\s*$/.exec(raw.trim())
    if (!m || m[1] === 'Name:') continue
    out.set(m[1], {
      name: m[1], description: m[2], year: '', manufacturer: '', cloneof: null,
      bios: false, device: false, mechanical: false, runnable: true, status: 'unknown'
    })
  }
  return out
}

interface CacheFile {
  v: number
  exe: string
  size: number
  mtime: number
  version: string
  /** [nome, titolo, anno, produttore, cloneof, flag, stato] con flag = b(ios) d(evice) m(echanical) n(on avviabile) */
  rows: Array<[string, string, string, string, string, string, string]>
}
const CACHE_V = 1

function pack(m: MameMachine): CacheFile['rows'][number] {
  const flags = (m.bios ? 'b' : '') + (m.device ? 'd' : '') + (m.mechanical ? 'm' : '') + (m.runnable ? '' : 'n')
  return [m.name, m.description, m.year, m.manufacturer, m.cloneof ?? '', flags, m.status]
}
function unpack(r: CacheFile['rows'][number]): MameMachine {
  return {
    name: r[0], description: r[1], year: r[2], manufacturer: r[3], cloneof: r[4] || null,
    bios: r[5].includes('b'), device: r[5].includes('d'), mechanical: r[5].includes('m'), runnable: !r[5].includes('n'),
    status: r[6] as MameMachine['status']
  }
}

/** Versione dichiarata da MAME, per esempio "0.229 (mame0229)" */
export function mameVersion(exe: string): Promise<string> {
  return new Promise((resolve) => {
    execFile(exe, ['-version'], { cwd: dirname(exe), windowsHide: true, timeout: 20000 }, (err, stdout) => {
      resolve(err ? '' : stdout.trim().split(/\r?\n/)[0] ?? '')
    })
  })
}

function runLines(exe: string, args: string[]): { lines: AsyncIterable<string>; done: Promise<number> } {
  const child = spawn(exe, args, { cwd: dirname(exe), windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] })
  const done = new Promise<number>((res) => {
    child.once('error', () => res(-1))
    child.once('close', (code) => res(code ?? 0))
  })
  return { lines: createInterface({ input: child.stdout!, crlfDelay: Infinity }), done }
}

export interface MameData {
  machines: Map<string, MameMachine>
  /** nome del gioco principale -> sue varianti */
  children: Map<string, MameMachine[]>
  version: string
}

function index(machines: Map<string, MameMachine>, version: string): MameData {
  const children = new Map<string, MameMachine[]>()
  for (const m of machines.values()) {
    if (!m.cloneof) continue
    const list = children.get(m.cloneof)
    if (list) list.push(m)
    else children.set(m.cloneof, [m])
  }
  return { machines, children, version }
}

/** Legge l'elenco (dalla copia salvata se mame.exe non è cambiato) */
export async function loadMameData(
  exe: string,
  cacheDir: string,
  onProgress?: (machines: number) => void
): Promise<MameData | null> {
  if (!exe) return null
  let st
  try {
    st = statSync(exe)
  } catch {
    return null
  }
  const file = join(cacheDir, 'mame-machines.json')
  try {
    const c = JSON.parse(await fsp.readFile(file, 'utf-8')) as CacheFile
    if (c.v === CACHE_V && c.exe === exe && c.size === st.size && c.mtime === st.mtimeMs) {
      return index(new Map(c.rows.map((r) => [r[0], unpack(r)])), c.version)
    }
  } catch {
    // nessuna copia valida: si rilegge da MAME
  }

  const version = await mameVersion(exe)
  let machines = new Map<string, MameMachine>()
  const xml = runLines(exe, ['-listxml'])
  machines = await parseListXml(xml.lines, onProgress)
  await xml.done
  if (machines.size === 0) {
    const full = runLines(exe, ['-listfull'])
    const lines: string[] = []
    for await (const l of full.lines) lines.push(l)
    await full.done
    machines = parseListFull(lines)
  }
  if (machines.size === 0) return null

  const cache: CacheFile = { v: CACHE_V, exe, size: st.size, mtime: st.mtimeMs, version, rows: [...machines.values()].map(pack) }
  await fsp.mkdir(cacheDir, { recursive: true })
  await fsp.writeFile(file, JSON.stringify(cache), 'utf-8')
  return index(machines, version)
}
