import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { findOverlays, matchOverlay, resolveOverlay } from '../src/main/overlays'
import { SYSTEMS } from '../src/main/systems'
import type { Settings } from '../src/shared/types'

// nomi presi dalle raccolte reali (NyNy77 1080 e Nosh01 1440)
const FILES = [
  'NintendoGameBoyColorJaune-nyny77.cfg', 'NintendoGameBoyColorNoir-nyny77.cfg', 'NintendoGameBoy-nyny77.cfg', 'NintendoGameBoyAdvance-nyny77.cfg',
  'NintendoGameCube-nyny77.cfg', 'Atari-Jaguar-Bezel-16x9-2560x1440.cfg', 'SegaDreamcast-nyny77.cfg', 'SegaMegaDrive-nyny77.cfg', 'SegaMegaDriveCD-nyny77.cfg',
  'SegaMega32X-nyny77.cfg', 'NintendoEntertainmentSystem-nyny77.cfg', 'SuperNintendoEntertainmentSystem-nyny77.cfg', 'SNKNeoGeo-nyny77.cfg', 'SNKNeoGeoPocket-nyny77.cfg',
  'SonyPlayStation-nyny77.cfg', 'SonyPlayStation2-nyny77.cfg', 'NECPCEngineCD-nyny77.cfg', 'NECPCEngine-nyny77.cfg', 'MAME-nyny77.cfg'
].map((f) => `C:\\overlays\\16x9 Collections\\${f}`)

test('bordi: ogni sistema trova il suo, senza confondere varianti simili', () => {
  const m = (id: string): string => (matchOverlay(FILES, id) ?? '').replace(/^.*\\/, '')
  assert.equal(m('gb'), 'NintendoGameBoy-nyny77.cfg')
  assert.equal(m('gbc'), 'NintendoGameBoyColorNoir-nyny77.cfg')
  assert.equal(m('gba'), 'NintendoGameBoyAdvance-nyny77.cfg')
  assert.equal(m('megadrive'), 'SegaMegaDrive-nyny77.cfg') // non il Mega CD né il 32X
  assert.equal(m('nes'), 'NintendoEntertainmentSystem-nyny77.cfg') // non il Super Nintendo
  assert.equal(m('snes'), 'SuperNintendoEntertainmentSystem-nyny77.cfg')
  assert.equal(m('neogeo'), 'SNKNeoGeo-nyny77.cfg') // non il Pocket
  assert.equal(m('ngp'), 'SNKNeoGeoPocket-nyny77.cfg')
  assert.equal(m('psx'), 'SonyPlayStation-nyny77.cfg') // non la PS2
  assert.equal(m('pce'), 'NECPCEngine-nyny77.cfg') // non la versione CD
  assert.equal(m('jaguar'), 'Atari-Jaguar-Bezel-16x9-2560x1440.cfg')
  assert.equal(m('dreamcast'), 'SegaDreamcast-nyny77.cfg')
  assert.equal(m('mame'), 'MAME-nyny77.cfg')
  assert.equal(m('msx'), '') // nessun bordo disponibile: nessun errore
  assert.equal(matchOverlay(FILES, 'sistema-inventato'), null)
})

function setup(): { dir: string; s: Settings } {
  const dir = mkdtempSync(join(tmpdir(), 'mr-ov-'))
  mkdirSync(join(dir, 'raccolta'))
  for (const f of ['SegaMegaDrive-nyny77.cfg', 'NintendoGameBoy-nyny77.cfg']) writeFileSync(join(dir, 'raccolta', f), '')
  writeFileSync(join(dir, 'comune.cfg'), '')
  writeFileSync(join(dir, 'mio.cfg'), '')
  return { dir, s: { overlayEnabled: true, overlayDir: dir, overlayPath: '', overlayBySystem: {} } as unknown as Settings }
}

test('bordo di un sistema: scelta a mano > ricerca nella cartella > bordo comune', () => {
  const { dir, s } = setup()
  // ricerca nella cartella (anche nelle sottocartelle)
  assert.match(resolveOverlay(s, 'megadrive') ?? '', /SegaMegaDrive-nyny77\.cfg$/)
  assert.equal(resolveOverlay(s, 'nes'), null)
  // bordo comune per chi non ne ha uno suo
  const comune = join(dir, 'comune.cfg')
  assert.equal(resolveOverlay({ ...s, overlayPath: comune }, 'nes'), comune)
  // la scelta a mano batte la ricerca
  const mio = join(dir, 'mio.cfg')
  assert.equal(resolveOverlay({ ...s, overlayBySystem: { megadrive: mio } }, 'megadrive'), mio)
  // "-" = nessun bordo per quel sistema, anche se ce n'è uno comune
  assert.equal(resolveOverlay({ ...s, overlayPath: comune, overlayBySystem: { megadrive: '-' } }, 'megadrive'), null)
  // file scelto a mano che non esiste più: si torna alla ricerca
  assert.match(resolveOverlay({ ...s, overlayBySystem: { megadrive: join(dir, 'sparito.cfg') } }, 'megadrive') ?? '', /SegaMegaDrive/)
  // tutto spento
  assert.equal(resolveOverlay({ ...s, overlayEnabled: false }, 'megadrive'), null)
})

test('bordi: cartella assente o vuota non dà errori; tutti i sistemi hanno un nome noto', () => {
  assert.deepEqual(Object.values(findOverlays(join(tmpdir(), 'non-esiste-xyz'), ['nes', 'gb'])), [null, null])
  const { dir } = setup()
  const r = findOverlays(dir, SYSTEMS.map((x) => x.id))
  assert.match(r.gb ?? '', /NintendoGameBoy/)
  // ogni sistema attivo ha almeno un nome con cui cercarlo
  for (const sys of SYSTEMS.filter((x) => x.phase === 1)) assert.ok(sys.id in r, sys.id)
})
