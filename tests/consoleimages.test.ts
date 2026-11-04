import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { findConsoleImage, listConsoleImages, readConsoleImage } from '../src/main/consoleImages'

const snes = { id: 'snes', name: 'Super Nintendo', short: 'SNES' }
const md = { id: 'megadrive', name: 'Mega Drive', short: 'MD' }

test('foto delle console: il file si riconosce da id, nome o sigla', () => {
  const d = mkdtempSync(join(tmpdir(), 'mr-ci-'))
  writeFileSync(join(d, 'Super Nintendo.PNG'), 'x')
  writeFileSync(join(d, 'mega-drive.jpg'), 'x')
  writeFileSync(join(d, 'note.txt'), 'x')
  assert.equal(findConsoleImage(d, snes), join(d, 'Super Nintendo.PNG'))
  assert.equal(findConsoleImage(d, md), join(d, 'mega-drive.jpg'))
  assert.equal(findConsoleImage(d, { id: 'nes', name: 'NES', short: 'NES' }), null)
  assert.equal(findConsoleImage(join(d, 'non-esiste'), snes), null)
  // l'id ha la precedenza sul nome
  writeFileSync(join(d, 'snes.webp'), 'x')
  assert.equal(findConsoleImage(d, snes), join(d, 'snes.webp'))
  assert.deepEqual(listConsoleImages(d, [snes, md]), { snes: join(d, 'snes.webp'), megadrive: join(d, 'mega-drive.jpg') })
})

test('foto delle console: lettura come data URL, con i limiti', () => {
  const d = mkdtempSync(join(tmpdir(), 'mr-ci-'))
  writeFileSync(join(d, 'a.png'), Buffer.from([137, 80, 78, 71]))
  assert.equal(readConsoleImage(join(d, 'a.png')), 'data:image/png;base64,iVBORw==')
  assert.equal(readConsoleImage(join(d, 'sparita.png')), null)
  assert.equal(readConsoleImage(null), null)
  writeFileSync(join(d, 'b.gif'), 'x')
  assert.equal(readConsoleImage(join(d, 'b.gif')), null)
})
