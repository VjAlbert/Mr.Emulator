import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { loadStats, recordPlay } from '../src/main/stats'

test('statistiche: partite e tempo si sommano, anche dopo un riavvio', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'mr-st-')), 'stats.json')
  assert.deepEqual(loadStats(f), {})
  recordPlay(f, 'nes:zelda.nes', 600, 1000)
  const s = recordPlay(f, 'nes:zelda.nes', 125.4, 2000)
  assert.deepEqual(s, { plays: 2, seconds: 725, last: 2000 })
  recordPlay(f, 'snes:smw.sfc', 60, 3000)
  const all = loadStats(f)
  assert.equal(Object.keys(all).length, 2)
  assert.equal(all['nes:zelda.nes'].seconds, 725)
})

test('statistiche: file rovinato non blocca nulla', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'mr-st-')), 'stats.json')
  writeFileSync(f, '{ non è json')
  assert.deepEqual(loadStats(f), {})
  assert.equal(recordPlay(f, 'x', 30).plays, 1)
})
