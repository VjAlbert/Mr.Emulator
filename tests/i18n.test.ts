import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { EN } from '../src/renderer/src/en'

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(n) && n !== 'en.ts' ? [p] : []
  })
}

// parole che si scrivono uguali nelle due lingue
const SAME = new Set(['GB', 'Hz', 'MAME', 'MR.', 'EMULATOR', 'RetroArch', 'SOON', 'core', 'mamedev.org', 'retroarch.com', '● PLAY', 'Italiano', 'English'])

test('ogni frase tradotta con t() ha la sua traduzione inglese', () => {
  const missing: string[] = []
  for (const f of files('src/renderer/src')) {
    const src = readFileSync(f, 'utf8')
    for (const m of src.matchAll(/\bt\('((?:[^'\\]|\\.)*)'/g)) {
      const key = m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\')
      if (!(key in EN) && !SAME.has(key)) missing.push(`${f}: ${key}`)
    }
  }
  assert.deepEqual(missing, [])
})

test('traduzioni: i segnaposto {x} coincidono nelle due lingue', () => {
  const holders = (s: string): string => (s.match(/\{[a-z]+\}/g) ?? []).sort().join(',')
  for (const [it, en] of Object.entries(EN)) assert.equal(holders(en), holders(it), `${it} → ${en}`)
})
