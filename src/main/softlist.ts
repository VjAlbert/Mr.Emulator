import { execFile } from 'child_process'
import { dirname, join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'

const decode = (s: string): string =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")

/** Estrae "nome breve -> titolo" dall'XML di una Software List di MAME (-getsoftlist) */
export function parseSoftList(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /<software\s+name="([^"]+)"[^>]*>[\s\S]*?<description>([^<]*)<\/description>/g
  for (let m = re.exec(xml); m; m = re.exec(xml)) map.set(m[1].toLowerCase(), decode(m[2]))
  return map
}

function runGetSoftList(exe: string, list: string): Promise<string | null> {
  return new Promise((resolve) => {
    execFile(exe, ['-getsoftlist', list], { cwd: dirname(exe), windowsHide: true, timeout: 120000, maxBuffer: 256 * 1024 * 1024 }, (err, stdout) =>
      resolve(err ? null : stdout)
    )
  })
}

const memo = new Map<string, Map<string, string>>()

/**
 * Titoli completi dei giochi delle console, ricavati dalle Software List del MAME dell'utente
 * (gli ZIP di FBNeo per console hanno gli stessi nomi brevi). Il risultato si salva su disco.
 */
export async function softTitles(exe: string, lists: string[], cacheDir: string): Promise<Map<string, string> | null> {
  if (!exe || !existsSync(exe)) return null
  const all = new Map<string, string>()
  let any = false
  for (const list of lists) {
    const key = `${exe}|${list}`
    let map = memo.get(key)
    if (!map) {
      const file = join(cacheDir, `${list}.json`)
      try {
        if (existsSync(file)) {
          const j = JSON.parse(readFileSync(file, 'utf-8')) as { exe: string; titles: Array<[string, string]> }
          if (j.exe === exe) map = new Map(j.titles)
        }
      } catch {
        map = undefined
      }
      if (!map) {
        const xml = await runGetSoftList(exe, list)
        if (xml) {
          map = parseSoftList(xml)
          mkdirSync(cacheDir, { recursive: true })
          writeFileSync(file, JSON.stringify({ exe, titles: [...map] }), 'utf-8')
        }
      }
      if (map) memo.set(key, map)
    }
    if (map) {
      any = true
      for (const [k, v] of map) if (!all.has(k)) all.set(k, v)
    }
  }
  return any ? all : null
}
