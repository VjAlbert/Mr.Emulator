import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, mkdirSync, chmodSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { launchGame } from '../src/main/launcher'
import { SYSTEMS } from '../src/main/systems'
import type { Game, Settings } from '../src/shared/types'

const sys = (id: string) => SYSTEMS.find((s) => s.id === id)!

function setup() {
  const root = mkdtempSync(join(tmpdir(), 'mr-launch-'))
  process.env.MR_TEST_DATA = root
  const ra = join(root, 'retroarch.sh')
  writeFileSync(ra, '#!/bin/sh\nexit 0\n')
  chmodSync(ra, 0o755)
  const cores = join(root, 'cores')
  const bios = join(root, 'bios')
  mkdirSync(cores)
  mkdirSync(bios)
  for (const c of ['flycast_libretro', 'pcsx_rearmed_libretro', 'fbneo_libretro']) writeFileSync(join(cores, `${c}.dll`), '')
  const gamePath = join(root, 'game.cue')
  writeFileSync(gamePath, '')
  const settings = { retroarchPath: ra, coresDir: cores, biosDir: bios, romsDir: root } as Settings
  const game = { id: 'x', name: 'x', fileName: 'game.cue', path: gamePath, systemId: 'psx' } as Game
  return { root, settings, game, bios }
}

test('gioco di esempio: rifiutato con messaggio', () => {
  const { settings, game } = setup()
  const r = launchGame({ ...game, demo: true }, sys('psx'), settings, '', () => {}, () => {})
  assert.equal(r.ok, false)
})

test('RetroArch assente: messaggio chiaro', () => {
  const { settings, game } = setup()
  const r = launchGame(game, sys('psx'), { ...settings, retroarchPath: '/non/esiste' }, '', () => {}, () => {})
  assert.equal(r.ok, false)
  assert.match(r.error ?? '', /RetroArch non trovato/)
})

test('core mancante: dice quale', () => {
  const { settings, game } = setup()
  const r = launchGame(game, sys('psx'), { ...settings, coresDir: join(settings.romsDir, 'vuota') }, '', () => {}, () => {})
  assert.match(r.error ?? '', /pcsx_rearmed_libretro/)
})

test('PS1 senza BIOS: dice cosa manca; con BIOS parte e il ritorno avviene una volta sola', async () => {
  const { settings, game, bios } = setup()
  const noBios = launchGame(game, sys('psx'), settings, '', () => {}, () => {})
  assert.match(noBios.error ?? '', /BIOS PlayStation/)
  writeFileSync(join(bios, 'scph5501.bin'), '')
  let started = 0
  let ended = 0
  const r = launchGame(game, sys('psx'), settings, '# cfg', () => started++, () => ended++)
  assert.equal(r.ok, true)
  await new Promise((res) => setTimeout(res, 600))
  assert.equal(started, 1)
  assert.equal(ended, 1)
})

test('Dreamcast e Naomi: BIOS richiesti', () => {
  const { settings, game, bios } = setup()
  assert.match(launchGame(game, sys('dreamcast'), settings, '', () => {}, () => {}).error ?? '', /dc_boot\.bin/)
  assert.match(launchGame(game, sys('naomi'), settings, '', () => {}, () => {}).error ?? '', /naomi\.zip/)
  mkdirSync(join(bios, 'dc'))
  writeFileSync(join(bios, 'dc', 'dc_boot.bin'), '')
  assert.equal(launchGame(game, sys('dreamcast'), settings, '', () => {}, () => {}).ok, true)
})

test('Neo Geo senza neogeo.zip: messaggio chiaro', () => {
  const { settings, game } = setup()
  const r = launchGame({ ...game, systemId: 'neogeo', path: join(settings.romsDir, 'game.cue') }, sys('neogeo'), settings, '', () => {}, () => {})
  assert.match(r.error ?? '', /neogeo\.zip/)
})
