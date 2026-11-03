import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildDiagnostics } from '../src/main/diagnostics'
import { SYSTEMS } from '../src/main/systems'
import type { Settings } from '../src/shared/types'
import type { BiosRule } from '../src/shared/bios'

const base = (over: Partial<Settings>): Settings => ({ romsDir: '', biosDir: '', retroarchPath: '', coresDir: '', mamePath: '', datDir: '', mediaDir: '', hiddenSystems: [], ...over }) as Settings

test('diagnostica: tutto mancante -> problemi chiari con la soluzione', () => {
  const r = buildDiagnostics({ settings: base({}), systems: SYSTEMS, gameCount: () => 0, userData: tmpdir(), version: 't', os: 't' })
  assert.ok(r.checks.some((k) => k.level === 'bad' && /Cartella ROM/.test(k.title) && k.fix))
  assert.match(r.text, /\[PROBLEMA\]/)
})

test('diagnostica: disco esterno scollegato, core e BIOS mancanti', () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-dg-'))
  const ra = join(root, 'retroarch.exe')
  writeFileSync(ra, '')
  mkdirSync(join(root, 'cores'))
  const counts: Record<string, number> = { psx: 3 }
  const r = buildDiagnostics({
    settings: base({ romsDir: join(root, 'disco-scollegato'), biosDir: join(root, 'bios'), retroarchPath: ra, coresDir: join(root, 'cores') }),
    systems: SYSTEMS, gameCount: (id) => counts[id] ?? 0, userData: root, version: 't', os: 't'
  })
  const titles = r.checks.map((k) => k.title).join('|')
  assert.match(titles, /non raggiungibile/)
  assert.match(titles, /Core mancante: pcsx_rearmed_libretro/)
  assert.match(titles, /BIOS mancante per PlayStation/)
  assert.ok(r.problems >= 3)
})

test('diagnostica: configurazione completa -> nessun problema', () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-dg-'))
  for (const d of ['roms', 'bios', 'cores']) mkdirSync(join(root, d))
  const ra = join(root, 'retroarch.exe')
  writeFileSync(ra, '')
  writeFileSync(join(root, 'cores', 'nestopia_libretro.dll'), '')
  const r = buildDiagnostics({
    settings: base({ romsDir: join(root, 'roms'), biosDir: join(root, 'bios'), retroarchPath: ra, coresDir: join(root, 'cores') }),
    systems: SYSTEMS, gameCount: (id) => (id === 'nes' ? 5 : 0), userData: root, version: 't', os: 't'
  })
  assert.equal(r.problems, 0)
})

test('BIOS: assente, riconosciuto, non riconosciuto, senza controllo', async () => {
  const { biosStatus } = await import('../src/main/diagnostics')
  const { createHash } = await import('crypto')
  const root = mkdtempSync(join(tmpdir(), 'mr-bios-'))
  mkdirSync(join(root, 'dc'))
  const good = Buffer.from('contenuto noto')
  writeFileSync(join(root, 'giusto.bin'), good)
  writeFileSync(join(root, 'sbagliato.bin'), 'altro')
  writeFileSync(join(root, 'dc', 'libero.zip'), 'x')
  const md5 = createHash('md5').update(good).digest('hex')
  const rules: BiosRule[] = [
    { systemId: 'a', name: 'A', anyOf: ['giusto.bin'], where: 'bios', note: '', md5: { 'giusto.bin': [md5] } },
    { systemId: 'b', name: 'B', anyOf: ['sbagliato.bin'], where: 'bios', note: '', md5: { 'sbagliato.bin': [md5] } },
    { systemId: 'c', name: 'C', anyOf: ['libero.zip'], where: 'bios\\dc', note: '' },
    { systemId: 'd', name: 'D', anyOf: ['manca.bin'], where: 'bios', note: '' }
  ]
  const r = biosStatus({ biosDir: root } as Settings, rules)
  assert.deepEqual(r.map((x) => x.verified), ['ok', 'unknown', 'unchecked', null])
  assert.deepEqual(r.map((x) => x.found), ['giusto.bin', 'sbagliato.bin', 'libero.zip', null])
})
