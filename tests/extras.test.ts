import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { achievementsConfig, cheatsConfig, libraryNameOf } from '../src/main/extras'
import { findInstalls, OFFICIAL } from '../src/main/detect'
import { resumeFor, retroSaveConfig } from '../src/main/saves'
import { SYSTEMS } from '../src/main/systems'
import type { Game, Settings } from '../src/shared/types'

const sys = (id: string) => SYSTEMS.find((s) => s.id === id)!

test('rilevamento di RetroArch e MAME nei posti comuni', () => {
  const d = mkdtempSync(join(tmpdir(), 'mr-det-'))
  mkdirSync(join(d, 'RetroArch-Win64'))
  writeFileSync(join(d, 'RetroArch-Win64', 'retroarch.exe'), 'x')
  mkdirSync(join(d, 'Emulatori', 'MAME 0.229'), { recursive: true })
  writeFileSync(join(d, 'Emulatori', 'MAME 0.229', 'mame.exe'), 'x')
  mkdirSync(join(d, 'Altro'))
  writeFileSync(join(d, 'Altro', 'mame.exe'), 'x')
  assert.deepEqual(findInstalls('retroarch', [d, join(d, 'non-esiste')]), [join(d, 'RetroArch-Win64', 'retroarch.exe')])
  assert.deepEqual(findInstalls('mame', [d]), [join(d, 'Emulatori', 'MAME 0.229', 'mame.exe')])
  assert.deepEqual(findInstalls('mame', []), [])
})

test('si aprono solo i siti ufficiali', () => {
  for (const url of Object.values(OFFICIAL)) assert.ok(/^https:\/\/www\.(retroarch\.com|mamedev\.org)\//.test(url))
})

test('trofei: si attivano solo con utente e password', () => {
  const base = { raEnabled: true, raUser: 'mario', raPassword: 'pw', raHardcore: false } as Settings
  assert.equal(achievementsConfig(base).cheevos_enable, 'true')
  assert.equal(achievementsConfig(base).cheevos_username, 'mario')
  assert.equal(achievementsConfig({ ...base, raHardcore: true }).cheevos_hardcore_mode_enable, 'true')
  assert.equal(achievementsConfig({ ...base, raPassword: '' }).cheevos_enable, 'false')
  assert.equal(achievementsConfig({ ...base, raEnabled: false }).cheevos_enable, 'false')
})

test('ripresa per singola console: la scelta del sistema vince sull\'interruttore generale', () => {
  const s = { resumeConsoles: true, resumeBySystem: { psx: false }, resumeArcade: {} } as unknown as Settings
  const g = { id: 'a', name: 'a', fileName: 'a.cue', path: '/a.cue', systemId: 'psx' } as Game
  assert.equal(resumeFor(s, sys('psx'), g), false)
  assert.equal(resumeFor(s, sys('snes'), g), true)
  assert.equal(retroSaveConfig({ ...s, romsDir: join(tmpdir(), 'mr-x', 'roms') } as Settings, sys('psx'), g).savestate_auto_save, 'false')
})

test('trucchi: copia il file giusto dove RetroArch lo cerca e chiede di applicarlo', () => {
  const ra = mkdtempSync(join(tmpdir(), 'mr-ch-'))
  const exe = join(ra, 'retroarch.exe')
  const cheats = join(ra, 'cheats', sys('snes').thumbs!)
  mkdirSync(cheats, { recursive: true })
  writeFileSync(join(cheats, 'Super Mario World (USA).cht'), 'cheats = 1')
  const s = { retroarchPath: exe, cheatsAuto: true, raEnabled: false, raHardcore: false } as Settings
  const g = { id: 'm', name: 'Super Mario World', fileName: 'smw.sfc', path: join(ra, 'Super Mario World (Europe).sfc'), systemId: 'snes' } as Game
  const r = cheatsConfig(s, sys('snes'), g)
  assert.equal(r.config.apply_cheats_after_load, 'true')
  assert.equal(r.found, 'Super Mario World (USA)')
  assert.ok(existsSync(join(ra, 'cheats', 'Snes9x', 'Super Mario World (Europe).cht')))
  // spento, o con hardcore: non fa nulla
  assert.deepEqual(cheatsConfig({ ...s, cheatsAuto: false }, sys('snes'), g).config, {})
  assert.deepEqual(cheatsConfig({ ...s, raEnabled: true, raHardcore: true }, sys('snes'), g).config, {})
  assert.equal(libraryNameOf(exe, 'genesis_plus_gx_libretro'), 'Genesis Plus GX')
})
