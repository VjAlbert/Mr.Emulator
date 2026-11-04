import { spawn, spawnSync } from 'child_process'
import { createWriteStream, mkdirSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { mt } from './mt'

export const RA_STABLE = 'https://buildbot.libretro.com/stable/'
export const MAME_RELEASES = 'https://api.github.com/repos/mamedev/mame/releases/latest'

export interface ToolResult {
  ok: boolean
  /** Percorso dell'eseguibile installato */
  path: string
  version: string
  error?: string
}

/** Dall'indice della pagina "stable" di libretro: la versione più alta (cartelle 1.19.1/ ecc.) */
export function pickStableVersion(html: string): string | null {
  const vs = [...html.matchAll(/href="(?:\.\/)?(\d+\.\d+\.\d+)\/"/g)].map((m) => m[1])
  if (!vs.length) return null
  const num = (v: string): number[] => v.split('.').map(Number)
  return vs.sort((a, b) => {
    const x = num(a)
    const y = num(b)
    return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]
  })[vs.length - 1]
}

/** Dalla risposta di GitHub sull'ultima release di MAME: il pacchetto per Windows a 64 bit (archivio che si estrae da solo) */
export function pickMameAsset(json: unknown): { name: string; url: string; version: string } | null {
  const assets = (json as { assets?: Array<{ name?: string; browser_download_url?: string }> })?.assets
  if (!Array.isArray(assets)) return null
  for (const a of assets) {
    const m = /^mame(\d+)[a-z]?_(?:x64|64bit)\.exe$/i.exec(a.name ?? '')
    if (m && a.browser_download_url?.startsWith('https://github.com/mamedev/mame/')) return { name: a.name!, url: a.browser_download_url, version: m[1] }
  }
  return null
}

/** Cerca un file con quel nome nella cartella e nelle sottocartelle (al massimo 3 livelli) */
export function findFile(dir: string, name: string, depth = 3): string | null {
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name.toLowerCase() === name) return join(dir, e.name)
    }
    if (depth > 0) {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          const f = findFile(join(dir, e.name), name, depth - 1)
          if (f) return f
        }
      }
    }
  } catch {
    // cartella illeggibile
  }
  return null
}

async function download(url: string, to: string, onProgress: (pct: number) => void, fetchFn: typeof fetch): Promise<void> {
  const res = await fetchFn(url, { signal: AbortSignal.timeout(900000), headers: { 'User-Agent': 'Mr.Emulator' } })
  if (!res.ok || !res.body) throw new Error(mt('risposta {n}', { n: res.status }))
  const total = Number(res.headers.get('content-length')) || 0
  let got = 0
  const src = Readable.fromWeb(res.body as never)
  src.on('data', (c: Buffer) => {
    got += c.length
    if (total) onProgress(Math.min(99, Math.round((got / total) * 100)))
  })
  await pipeline(src, createWriteStream(to))
}

const cleanup = (p: string): void => {
  try {
    rmSync(p, { force: true })
  } catch {
    // niente da togliere
  }
}

/** Scarica RetroArch (ultima versione stabile, pacchetto 7z) e lo estrae con il programma "tar" di Windows 10/11 */
export async function installRetroArch(destDir: string, onProgress: (pct: number) => void = () => undefined, fetchFn: typeof fetch = fetch): Promise<ToolResult> {
  const tmp = join(tmpdir(), `mr-retroarch-${process.pid}.7z`)
  try {
    const idx = await fetchFn(RA_STABLE, { signal: AbortSignal.timeout(30000) })
    if (!idx.ok) return { ok: false, path: '', version: '', error: mt('risposta {n}', { n: idx.status }) }
    const version = pickStableVersion(await idx.text())
    if (!version) return { ok: false, path: '', version: '', error: mt('non trovo la versione stabile') }
    await download(`${RA_STABLE}${version}/windows/x86_64/RetroArch.7z`, tmp, onProgress, fetchFn)
    mkdirSync(destDir, { recursive: true })
    const r = spawnSync('tar', ['-xf', tmp, '-C', destDir], { windowsHide: true, timeout: 600000 })
    if (r.status !== 0) return { ok: false, path: '', version, error: mt('estrazione non riuscita (serve Windows 10 o 11)') }
    const exe = findFile(destDir, 'retroarch.exe')
    if (!exe) return { ok: false, path: '', version, error: mt('retroarch.exe non trovato nel pacchetto') }
    return { ok: true, path: exe, version }
  } catch (e) {
    return { ok: false, path: '', version: '', error: e instanceof Error ? e.message : String(e) }
  } finally {
    cleanup(tmp)
  }
}

/** Scarica l'ultima versione di MAME dal sito ufficiale (GitHub) ed esegue il pacchetto, che si estrae da solo nella cartella */
export async function installMame(destDir: string, onProgress: (pct: number) => void = () => undefined, fetchFn: typeof fetch = fetch): Promise<ToolResult> {
  const tmp = join(tmpdir(), `mr-mame-${process.pid}.exe`)
  try {
    const rel = await fetchFn(MAME_RELEASES, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'Mr.Emulator', Accept: 'application/vnd.github+json' } })
    if (!rel.ok) return { ok: false, path: '', version: '', error: mt('risposta {n}', { n: rel.status }) }
    const asset = pickMameAsset(await rel.json())
    if (!asset) return { ok: false, path: '', version: '', error: mt('non trovo il pacchetto di MAME per Windows') }
    await download(asset.url, tmp, onProgress, fetchFn)
    mkdirSync(destDir, { recursive: true })
    const code = await new Promise<number>((res) => {
      const c = spawn(tmp, ['-y', `-o${destDir}`], { windowsHide: true, stdio: 'ignore' })
      c.once('error', () => res(-1))
      c.once('exit', (n) => res(n ?? -1))
    })
    const exe = findFile(destDir, 'mame.exe')
    if (code !== 0 || !exe) return { ok: false, path: '', version: asset.version, error: mt('estrazione non riuscita') }
    return { ok: true, path: exe, version: asset.version }
  } catch (e) {
    return { ok: false, path: '', version: '', error: e instanceof Error ? e.message : String(e) }
  } finally {
    cleanup(tmp)
  }
}
