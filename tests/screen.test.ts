import { test } from 'node:test'
import assert from 'node:assert/strict'
import { computeViewport, SOURCES } from '../src/shared/viewport'
import { buildProfile, buildMameProfile } from '../src/main/profiles'
import type { ImageStyle } from '../src/shared/types'

const arcade = SOURCES[0].src
const console240 = SOURCES[1].src

test('ultrawide 2560x1080 (il monitor di Alberto): 4:3 a tutta altezza = 1440x1080, il 56% della larghezza', () => {
  const v = computeViewport({ width: 2560, height: 1080 }, arcade, 'fit')
  assert.deepEqual([v.width, v.height], [1440, 1080])
  assert.equal(Math.round(v.coverW * 100), 56)
})

test('pixel perfetti su 1080p: 224 righe x4 = 896, 240 righe x4 = 960', () => {
  const a = computeViewport({ width: 1920, height: 1080 }, arcade, 'pixel')
  assert.deepEqual([a.factor, a.height], [4, 896])
  assert.equal(computeViewport({ width: 2560, height: 1080 }, console240, 'pixel').height, 960)
})

test('moltiplicatori perfetti: 1920x1200 x5, 1440p x6, 4K x9', () => {
  assert.equal(computeViewport({ width: 1920, height: 1200 }, console240, 'pixel').height, 1200)
  assert.equal(computeViewport({ width: 2560, height: 1440 }, console240, 'pixel').height, 1440)
  assert.equal(computeViewport({ width: 3840, height: 2160 }, console240, 'pixel').height, 2160)
})

test('stirata: riempie tutto; altezza intera: parte dall\'altezza piena', () => {
  const s = computeViewport({ width: 2560, height: 1080 }, arcade, 'stretch')
  assert.deepEqual([s.width, s.height], [2560, 1080])
  const h = computeViewport({ width: 2560, height: 1080 }, arcade, 'pixel-height')
  assert.equal(h.height, 896)
})

test('schermo piccolo o stretto: mai più grande dello schermo', () => {
  for (const mode of ['fit', 'pixel', 'pixel-height', 'stretch'] as ImageStyle[]) {
    for (const src of SOURCES) {
      const v = computeViewport({ width: 800, height: 480 }, src.src, mode)
      assert.ok(v.width <= 800 + 1 && v.height <= 480 + 1 || v.factor === 1, `${mode} ${src.id} ${v.width}x${v.height}`)
    }
  }
})

const base = { level: 'balanced' as const, cost: 'light' as const, cpuTier: 'mid' as const, gpuTier: 'mid' as const, display: { width: 2560, height: 1080, hz: 60 }, fullscreen: true, biosDir: 'C:/bios', shaderDir: null, shadersAvailable: new Set<string>(), monitorIndex: 0 }

test('RetroArch: le quattro modalità e il bordo grafico', () => {
  const fit = buildProfile({ ...base, imageStyle: 'fit' }).config
  assert.equal(fit.video_scale_integer, 'false')
  assert.equal(fit.aspect_ratio_index, undefined)
  const px = buildProfile({ ...base, imageStyle: 'pixel' }).config
  assert.equal(px.video_scale_integer, 'true')
  const ph = buildProfile({ ...base, imageStyle: 'pixel-height' }).config
  assert.equal(ph.video_scale_integer, 'true')
  assert.equal(ph.video_scale_integer_axis, '1')
  const st = buildProfile({ ...base, imageStyle: 'stretch', overlay: 'C:\\RetroArch\\overlays\\bezel.cfg' }).config
  assert.equal(st.aspect_ratio_index, '24')
  assert.equal(st.input_overlay_enable, 'true')
  assert.equal(st.input_overlay, 'C:/RetroArch/overlays/bezel.cfg')
})

test('MAME: modalità immagine e rotazione per monitor verticale', () => {
  const m = (imageStyle: ImageStyle, tate?: 'off' | 'cw' | 'ccw') => buildMameProfile({ level: 'balanced', gpuTier: 'mid', display: { width: 2560, height: 1080, hz: 60 }, imageStyle, fullscreen: true, tate }).ini
  assert.deepEqual([m('fit').keepaspect, m('fit').unevenstretch, m('fit').unevenstretchx], ['1', '1', '0'])
  assert.deepEqual([m('pixel').unevenstretch, m('pixel').unevenstretchx], ['0', '0'])
  assert.deepEqual([m('pixel-height').unevenstretch, m('pixel-height').unevenstretchx], ['0', '1'])
  assert.equal(m('stretch').keepaspect, '0')
  assert.deepEqual([m('fit', 'cw').autoror, m('fit', 'cw').autorol], ['1', '0'])
  assert.deepEqual([m('fit', 'ccw').autoror, m('fit', 'ccw').autorol], ['0', '1'])
  assert.deepEqual([m('fit').autoror, m('fit').autorol], ['0', '0'])
})

test('bordi: se attivi ma assenti per un sistema, RetroArch viene spento; se spenti nel programma, non si tocca nulla', () => {
  const none = buildProfile({ ...base, imageStyle: 'fit', overlay: null }).config
  assert.equal(none.input_overlay_enable, 'false')
  assert.equal(none.input_overlay, undefined)
  const off = buildProfile({ ...base, imageStyle: 'fit' }).config
  assert.equal(off.input_overlay_enable, undefined)
  const on = buildProfile({ ...base, imageStyle: 'fit', overlay: 'C:/x/b.cfg' }).config
  assert.deepEqual([on.input_overlay_enable, on.input_overlay], ['true', 'C:/x/b.cfg'])
})
