import { test } from 'node:test'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { mergePresets, parsePreset, combinePresetFiles } from '../src/main/shaderchain'
import { buildProfile, sharpnessAllowed } from '../src/main/profiles'

const EASYMODE = 'shaders = 1\n\nshader0 = shaders/crt-easymode.slang\nfilter_linear0 = false\nscale_type0 = viewport\n'
const XBRZ = 'shaders = 1\n\nshader0 = shaders/xbrz-freescale.slang\nfilter_linear0 = false\nscale_type0 = viewport\nscale0 = 1.0\n'
const none = (): string | null => null
/** Percorso come lo produce il programma sul sistema in uso (su Windows /ra diventa D:/ra) */
const R = (p: string): string => resolve(p).replace(/\\/g, '/')
const esc = (p: string): string => R(p).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const fwd = (p: string): string => p.replace(/\\/g, '/').replace(/^[A-Za-z]:/, '')

test('preset: percorsi dei passaggi resi assoluti, proprietà per passaggio lette', () => {
  const p = parsePreset(EASYMODE, '/ra/shaders/shaders_slang/crt', none)
  assert.equal(p.passes.length, 1)
  assert.equal(p.passes[0].shader, R('/ra/shaders/shaders_slang/crt/shaders/crt-easymode.slang'))
  assert.equal(p.passes[0].scale_type, 'viewport')
  assert.equal(p.passes[0].filter_linear, 'false')
})

test('preset: due preset uniti = passaggi in sequenza e numerazione rifatta', () => {
  const text = mergePresets([parsePreset(XBRZ, '/ra/s/edge-smoothing/xbrz', none), parsePreset(EASYMODE, '/ra/s/crt', none)])
  assert.match(text, /^shaders = 2\n/)
  assert.match(text, new RegExp(`shader0 = "${esc('/ra/s/edge-smoothing/xbrz/shaders/xbrz-freescale.slang')}"`))
  assert.match(text, /scale0 = "1\.0"/)
  assert.match(text, new RegExp(`shader1 = "${esc('/ra/s/crt/shaders/crt-easymode.slang')}"`))
  assert.match(text, /scale_type1 = "viewport"/)
  // il risultato si rilegge uguale
  const again = parsePreset(text, '/altrove', none)
  assert.equal(again.passes.length, 2)
  assert.equal(again.passes[1].shader, R('/ra/s/crt/shaders/crt-easymode.slang'))
})

test('preset: "#reference" e parametri/texture dei due preset si fondono', () => {
  const files: Record<string, string> = {
    '/ra/a/base.slangp': 'shaders = 1\nshader0 = "../stock.slang"\ntextures = "lut"\nlut = "../lut.png"\nbrightness = 1.2\n',
    '/ra/a/ref.slangp': '#reference "base.slangp"\nbrightness = 1.5\n',
    '/ra/b/crt.slangp': 'shaders = 1\nshader0 = crt.slang\ntextures = "mask"\nmask = mask.png\n'
  }
  const read = (f: string): string | null => files[fwd(f)] ?? null
  const text = combinePresetFiles(['/ra/a/ref.slangp', '/ra/b/crt.slangp'], read)!
  assert.match(text, new RegExp(`shader0 = "${esc('/ra/stock.slang')}"`))
  assert.match(text, /textures = "lut;mask"/)
  assert.match(text, new RegExp(`lut = "${esc('/ra/lut.png')}"`))
  assert.match(text, new RegExp(`mask = "${esc('/ra/b/mask.png')}"`))
  assert.match(text, /brightness = "1\.5"/)
  assert.equal(combinePresetFiles(['/non/esiste.slangp'], read), null)
})

test('nitidezza: "morbida" sempre, "alta" solo con una scheda video adeguata e sistemi non pesanti', () => {
  const ok = { level: 'balanced' as const, gpuTier: 'mid' as const, cost: 'light' as const }
  assert.equal(sharpnessAllowed('soft', { ...ok, gpuTier: 'low' }).ok, true)
  assert.equal(sharpnessAllowed('high', ok).ok, true)
  assert.equal(sharpnessAllowed('high', { ...ok, gpuTier: 'low' }).ok, false)
  assert.equal(sharpnessAllowed('high', { ...ok, level: 'light' }).ok, false)
  assert.equal(sharpnessAllowed('high', { ...ok, cost: 'heavy' }).ok, false)
  assert.equal(sharpnessAllowed('high', { ...ok, cost: 'medium' }).ok, false)
  assert.equal(sharpnessAllowed('high', { ...ok, cost: 'medium', gpuTier: 'high' }).ok, true)
})

const base = { crtChoice: 'crt-easymode', level: 'balanced' as const, cost: 'light' as const, cpuTier: 'mid' as const, gpuTier: 'high' as const, display: { width: 2560, height: 1440, hz: 60 }, imageStyle: 'fit' as const, fullscreen: true, biosDir: 'C:/bios', shaderDir: 'C:/ra/crt', shadersAvailable: new Set(['crt-easymode']), monitorIndex: 0 }
const ups = { soft: 'C:/ra/sb.slangp', high: 'C:/ra/xbrz.slangp' }

test('profilo: nitidezza sola, insieme al CRT, declassata o assente', () => {
  const off = buildProfile({ ...base, sharpness: 'off', upscalers: ups })
  assert.deepEqual(off.presets, ['C:/ra/crt/crt-easymode.slangp'])
  const high = buildProfile({ ...base, sharpness: 'high', upscalers: ups })
  assert.deepEqual(high.presets, ['C:/ra/xbrz.slangp', 'C:/ra/crt/crt-easymode.slangp'])
  assert.equal(high.sharpness, 'high')
  // con il CRT su automatico la nitidezza ha la precedenza
  assert.deepEqual(buildProfile({ ...base, crtChoice: 'auto', sharpness: 'high', upscalers: ups }).presets, ['C:/ra/xbrz.slangp'])
  assert.deepEqual(buildProfile({ ...base, crtChoice: 'auto', sharpness: 'off', upscalers: ups }).presets, ['C:/ra/crt/crt-easymode.slangp'])
  const only = buildProfile({ ...base, shadersAvailable: new Set<string>(), sharpness: 'high', upscalers: ups })
  assert.deepEqual(only.presets, ['C:/ra/xbrz.slangp'])
  assert.equal(only.config.video_shader, 'C:/ra/xbrz.slangp')
  assert.equal(only.config.video_shader_enable, 'true')
  // PC debole: "alta" scende a "morbida"
  const weak = buildProfile({ ...base, gpuTier: 'low', level: 'balanced', shadersAvailable: new Set<string>(), sharpness: 'high', upscalers: ups })
  assert.equal(weak.sharpness, 'soft')
  assert.deepEqual(weak.presets, ['C:/ra/sb.slangp'])
  // shader non installati: niente, e nessun errore
  const missing = buildProfile({ ...base, shadersAvailable: new Set<string>(), sharpness: 'high', upscalers: { soft: null, high: null } })
  assert.equal(missing.sharpness, 'off')
  assert.equal(missing.config.video_shader_enable, 'false')
  // alta mancante ma morbida presente
  assert.equal(buildProfile({ ...base, shadersAvailable: new Set<string>(), sharpness: 'high', upscalers: { soft: 'C:/ra/sb.slangp', high: null } }).sharpness, 'soft')
})
