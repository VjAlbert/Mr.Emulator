import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { achievementsConfig, cheatsConfig, libraryNameOf } from '../src/main/extras'
import { findFile, pickMameAsset, pickStableVersion } from '../src/main/tools'
import { resumeFor, retroSaveConfig } from '../src/main/saves'
import { SYSTEMS } from '../src/main/systems'
import type { Game, Settings } from '../src/shared/types'

const sys = (id: string) => SYSTEMS.find((s) => s.id === id)!

test('versione stabile di RetroArch: la più alta dell\'indice, confrontata come numeri', () => {
  const html = '<a href="1.9.14/">1.9.14/</a><a href="1.19.1/">1.19.1/</a><a href="1.10.0/">1.10.0/</a><a href="../">..</a>'
  assert.equal(pickStableVersion(html), '1.19.1')
  assert.equal(pickStableVersion('<html></html>'), null)
})

test('MAME: sceglie il pacchetto Windows a 64 bit dalla release di GitHub', () => {
  const json = { assets: [{ name: 'mame0276s.zip', browser_download_url: 'https://github.com/mamedev/mame/x.zip' }, { name: 'mame0276b_x64.exe', browser_download_url: 'https://github.com/mamedev/mame/releases/download/mame0276/mame0276b_x64.exe' }] }
  const a = pickMameAsset(json)
  assert.equal(a?.version, '0276')
  assert.ok(a?.url.endsWith('.exe'))
  assert.equal(pickMameAsset({ assets: [{ name: 'mame0276b_x64.exe', browser_download_url: 'https://evil.example/m.exe' }] }), null)
  assert.equal(pickMameAsset({}), null)
})

test('findFile cerca nelle sottocartelle', () => {
  const d = mkdtempSync(join(tmpdir(), 'mr-ff-'))
  mkdirSync(join(d, 'RetroArch-Win64'))
  writeFileSync(join(d, 'RetroArch-Win64', 'RetroArch.exe'), 'x')
  assert.equal(findFile(d, 'retroarch.exe'), join(d, 'RetroArch-Win64', 'RetroArch.exe'))
  assert.equal(findFile(d, 'mame.exe'), null)
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
