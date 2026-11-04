import { existsSync, readFileSync } from 'fs'
import { dirname, isAbsolute, resolve } from 'path'

/** Proprietà che in un preset .slangp appartengono a un singolo passaggio (hanno il numero in fondo: scale_type0, filter_linear1…) */
const PASS_KEYS = new Set([
  'shader', 'filter_linear', 'wrap_mode', 'mipmap_input', 'alias', 'float_framebuffer', 'srgb_framebuffer',
  'scale_type', 'scale_type_x', 'scale_type_y', 'scale', 'scale_x', 'scale_y', 'frame_count_mod'
])

export interface Preset {
  passes: Array<Record<string, string>>
  /** Tutto il resto: texture, parametri… */
  globals: Record<string, string>
}

const fwd = (p: string): string => p.replace(/\\/g, '/')
const unquote = (v: string): string => v.trim().replace(/^"(.*)"$/, '$1')

/**
 * Legge un preset di RetroArch (.slangp). I percorsi dei passaggi diventano assoluti (così il preset si può spostare)
 * e "#reference" viene seguito. read restituisce il testo di un file (o null se manca).
 */
export function parsePreset(text: string, dir: string, read: (file: string) => string | null, depth = 0): Preset {
  const out: Preset = { passes: [], globals: {} }
  const lines = text.split(/\r?\n/)
  // un riferimento ad altro preset fa da base; le righe che seguono lo modificano
  for (const raw of lines) {
    const ref = /^\s*#reference\s+"?([^"]+)"?\s*$/.exec(raw)
    if (ref && depth < 4) {
      const file = isAbsolute(ref[1]) ? ref[1] : resolve(dir, ref[1])
      const t = read(file)
      if (t !== null) {
        const base = parsePreset(t, dirname(file), read, depth + 1)
        out.passes = base.passes
        out.globals = { ...base.globals }
      }
    }
  }
  const props: Record<string, string> = {}
  for (const raw of lines) {
    const line = raw.replace(/\s*(#|\/\/).*$/, '').trim()
    const m = /^([\w.\-]+)\s*=\s*(.*)$/.exec(line)
    if (m) props[m[1]] = unquote(m[2])
  }
  const n = props['shaders'] !== undefined ? Number(props['shaders']) : 0
  const passes: Array<Record<string, string>> = []
  const rest: Record<string, string> = {}
  for (const [k, v] of Object.entries(props)) {
    if (k === 'shaders') continue
    const m = /^(.*?)(\d+)$/.exec(k)
    if (m && PASS_KEYS.has(m[1]) && Number(m[2]) < Math.max(n, 1) + 64) {
      const i = Number(m[2])
      while (passes.length <= i) passes.push({})
      passes[i][m[1]] = m[1] === 'shader' && !isAbsolute(v) ? fwd(resolve(dir, v)) : m[1] === 'shader' ? fwd(v) : v
    } else rest[k] = v
  }
  if (n > 0 || passes.length) {
    // se questo file ridefinisce i passaggi sostituisce quelli del riferimento
    out.passes = passes.slice(0, n || passes.length)
  }
  // le texture hanno percorsi relativi al preset: si rendono assoluti
  const texNames = (props['textures'] ?? '').split(';').map((x) => x.trim()).filter(Boolean)
  for (const name of texNames) if (rest[name] !== undefined && !isAbsolute(rest[name])) rest[name] = fwd(resolve(dir, rest[name]))
  for (const [k, v] of Object.entries(rest)) {
    if (k === 'textures' && out.globals['textures']) out.globals['textures'] = `${out.globals['textures']};${v}`
    else out.globals[k] = v
  }
  return out
}

/** Unisce più preset in uno solo: i passaggi si susseguono nell'ordine dato (il primo lavora per primo) */
export function mergePresets(list: Preset[]): string {
  const passes: Array<Record<string, string>> = []
  const globals: Record<string, string> = {}
  for (const p of list) {
    passes.push(...p.passes)
    for (const [k, v] of Object.entries(p.globals)) {
      if (k === 'textures' && globals['textures']) globals['textures'] = `${globals['textures']};${v}`
      else globals[k] = v
    }
  }
  const lines = [`shaders = ${passes.length}`, '']
  passes.forEach((p, i) => {
    for (const [k, v] of Object.entries(p)) lines.push(`${k}${i} = "${v}"`)
    lines.push('')
  })
  for (const [k, v] of Object.entries(globals)) lines.push(`${k} = "${v}"`)
  return lines.join('\n') + '\n'
}

/** Legge un file di preset dal disco */
export const readPresetFile = (file: string): string | null => {
  try {
    return existsSync(file) ? readFileSync(file, 'utf-8') : null
  } catch {
    return null
  }
}

/** Preset combinato (testo) a partire da più file .slangp */
export function combinePresetFiles(files: string[], read: (f: string) => string | null = readPresetFile): string | null {
  const presets: Preset[] = []
  for (const f of files) {
    const t = read(f)
    if (t === null) return null
    presets.push(parsePreset(t, dirname(f), read))
  }
  return mergePresets(presets)
}
