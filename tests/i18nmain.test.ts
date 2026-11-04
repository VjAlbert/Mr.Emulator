import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { EN_MAIN } from '../src/main/en-main'
import { mt, setMainLang } from '../src/main/mt'

const dir = join(__dirname, '..', 'src', 'main')
const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'en-main.ts' && f !== 'mt.ts')

test('ogni messaggio mt(\'…\') ha la traduzione inglese con gli stessi segnaposto', () => {
  const missing: string[] = []
  const bad: string[] = []
  const ph = (s: string): string => (s.match(/\{\w+\}/g) ?? []).sort().join(',')
  for (const f of files) {
    const src = readFileSync(join(dir, f), 'utf-8')
    for (const m of src.matchAll(/\bmt\('((?:[^'\\\n]|\\.)*)'/g)) {
      const key = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
      const en = EN_MAIN[key]
      if (en === undefined) missing.push(`${f}: ${key}`)
      else if (ph(en) !== ph(key)) bad.push(`${f}: ${key}`)
    }
  }
  assert.deepEqual(missing, [])
  assert.deepEqual(bad, [])
})

test('mt traduce e riempie i segnaposto', () => {
  setMainLang('en')
  assert.equal(mt('Core mancante: {core}', { core: 'x_libretro' }), 'Missing core: x_libretro')
  setMainLang('it')
  assert.equal(mt('Core mancante: {core}', { core: 'x_libretro' }), 'Core mancante: x_libretro')
})
