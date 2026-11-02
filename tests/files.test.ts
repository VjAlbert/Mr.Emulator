import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseRange } from '../src/main/rangeFile'
import { scanSystemFiles, prettyName } from '../src/main/scanner'
import { SYSTEMS } from '../src/main/systems'

test('Range: casi normali e limite', () => {
  assert.equal(parseRange(null, 100), null)
  assert.deepEqual(parseRange('bytes=0-9', 100), { start: 0, end: 9 })
  assert.deepEqual(parseRange('bytes=90-', 100), { start: 90, end: 99 })
  assert.deepEqual(parseRange('bytes=-10', 100), { start: 90, end: 99 })
  assert.deepEqual(parseRange('bytes=50-5000', 100), { start: 50, end: 99 })
  assert.equal(parseRange('bytes=100-', 100), 'invalid')
  assert.equal(parseRange('bytes=9-2', 100), 'invalid')
  assert.equal(parseRange('spazzatura', 100), null)
  assert.equal(parseRange('bytes=0-0', 0), 'invalid')
})

test('nome leggibile dal file', () => {
  assert.equal(prettyName('Sonic The Hedgehog (USA) [!].md'), 'Sonic The Hedgehog')
  assert.equal(prettyName('super_mario.nes'), 'super mario')
})

test('scansione: solo estensioni del sistema, sottocartelle, profondità limitata, cartella assente', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-scan-'))
  const nes = SYSTEMS.find((s) => s.id === 'nes')!
  mkdirSync(join(root, 'a', 'b'), { recursive: true })
  mkdirSync(join(root, 'a', 'b', 'c', 'd', 'e'), { recursive: true })
  writeFileSync(join(root, 'uno.nes'), '')
  writeFileSync(join(root, 'nota.txt'), '')
  writeFileSync(join(root, 'a', 'due.NES'), '')
  writeFileSync(join(root, 'a', 'b', 'tre.zip'), '')
  writeFileSync(join(root, 'a', 'b', 'c', 'd', 'e', 'troppo-in-fondo.nes'), '')
  const files = (await scanSystemFiles(root, nes)).map((f) => f.replace(/\\/g, '/')).sort()
  assert.deepEqual(files, ['a/b/tre.zip', 'a/due.NES', 'uno.nes'])
  assert.deepEqual(await scanSystemFiles(join(root, 'non-esiste'), nes), [])
})

test('sistemi: id unici, cartelle uniche, nessun campo mancante', () => {
  const ids = new Set<string>()
  const folders = new Set<string>()
  for (const s of SYSTEMS) {
    assert.ok(!ids.has(s.id), `id doppio: ${s.id}`)
    ids.add(s.id)
    assert.ok(!folders.has(s.folder), `cartella doppia: ${s.folder}`)
    folders.add(s.folder)
    assert.ok(s.extensions.length > 0, `${s.id} senza estensioni`)
    assert.match(s.color, /^#[0-9a-f]{6}$/i, `${s.id} colore non valido`)
    if (s.phase === 1) assert.ok(s.core || s.engine === 'mame', `${s.id} attivo ma senza core`)
    if (s.phase === 1 && s.engine !== 'mame') assert.ok(s.thumbs, `${s.id} senza copertine`)
  }
})
