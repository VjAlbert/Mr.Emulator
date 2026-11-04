import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { discNumber, groupDiscs, makeDiscEntries, withoutDisc } from '../src/main/discs'

test('disco nel nome: varie scritture', () => {
  assert.equal(discNumber('Final Fantasy VII (USA) (Disc 2)'), 2)
  assert.equal(discNumber('Metal Gear Solid (Europe) (Disk 1)'), 1)
  assert.equal(discNumber('Xenogears (CD2)'), 2)
  assert.equal(discNumber('Final Fantasy IX (Disc 3 of 4)'), 3)
  assert.equal(discNumber('Gioco [Disc 02]'), 2)
  assert.equal(discNumber('Crash Bandicoot (USA)'), null)
  assert.equal(withoutDisc('Final Fantasy VII (USA) (Disc 2)'), 'Final Fantasy VII (USA)')
  assert.equal(withoutDisc('Final Fantasy VII (Disc 2) (USA)'), 'Final Fantasy VII (USA)')
})

test('raggruppa solo i dischi dello stesso gioco, nella stessa cartella, con numeri diversi', () => {
  const files = [
    'Final Fantasy VII (USA) (Disc 3).cue', 'Final Fantasy VII (USA) (Disc 1).cue', 'Final Fantasy VII (USA) (Disc 2).cue',
    'Final Fantasy VII (Europe) (Disc 1).cue', // altra regione, un solo disco: resta solo
    'Crash Bandicoot (USA).cue',
    'altra/Xenogears (USA) (Disc 1).chd', 'altra/Xenogears (USA) (Disc 2).chd',
    'Gioco (Disc 1).cue', 'Gioco (Disc 1) (Rev 1).cue' // numeri ripetuti: non si uniscono
  ]
  const { groups, rest } = groupDiscs(files)
  assert.deepEqual(groups.map((g) => [g.base, g.discs.length]).sort(), [['Final Fantasy VII (USA)', 3], ['Xenogears (USA)', 2]])
  assert.deepEqual(groups.find((g) => g.base.startsWith('Final'))!.discs, ['Final Fantasy VII (USA) (Disc 1).cue', 'Final Fantasy VII (USA) (Disc 2).cue', 'Final Fantasy VII (USA) (Disc 3).cue'])
  assert.ok(rest.includes('Crash Bandicoot (USA).cue') && rest.includes('Final Fantasy VII (Europe) (Disc 1).cue'))
  assert.equal(rest.length, 4)
})

test('file .m3u: dischi in ordine con percorso completo, al posto dei singoli dischi', () => {
  const out = mkdtempSync(join(tmpdir(), 'mr-m3u-'))
  const files = ['FF7 (USA) (Disc 2).cue', 'FF7 (USA) (Disc 1).cue', 'Crash (USA).cue']
  const entries = makeDiscEntries(files, 'D:\\roms\\psx', out)
  assert.equal(entries.length, 2)
  assert.ok(entries.includes('Crash (USA).cue'))
  const m3u = entries.find((e) => e.endsWith('.m3u'))!
  assert.equal(m3u, join(out, 'FF7 (USA).m3u'))
  const lines = readFileSync(m3u, 'utf8').trim().split('\n')
  assert.equal(lines.length, 2)
  assert.match(lines[0], /FF7 \(USA\) \(Disc 1\)\.cue$/)
  assert.match(lines[1], /FF7 \(USA\) \(Disc 2\)\.cue$/)
  assert.deepEqual(readdirSync(out), ['FF7 (USA).m3u'])
  // nessun gioco a più dischi: l'elenco resta com'è e non si crea nulla
  const same = ['A.cue', 'B.cue']
  assert.equal(makeDiscEntries(same, 'x', join(out, 'vuoto')), same)
})
