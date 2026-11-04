import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, mkdtempSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { canon, loadIndex, makeMatcher, parseGithubTree, parseListingHtml } from '../src/main/thumbIndex'

const lines = (f: string): string[] => readFileSync(join('tests', 'fixtures', f), 'utf8').split(/\r?\n/).filter(Boolean)
// elenchi reali dei nomi presenti nell'archivio delle copertine (estratti)
const psx = makeMatcher(lines('psx-names.txt'))
const snes = makeMatcher(lines('snes-names.txt'))

test('forme confrontabili: articoli, simboli e maiuscole', () => {
  assert.equal(canon('Legend of Zelda, The - A Link to the Past (USA)'), canon('The Legend of Zelda: A Link to the Past'))
  assert.equal(canon("Castlevania - Symphony of the Night (USA)"), canon('Castlevania: Symphony of the Night'))
  assert.equal(canon('Rock & Roll Racing'), canon('Rock and Roll Racing (USA)'))
})

test('PlayStation: regioni, dischi e varianti', () => {
  assert.equal(psx('Crash Bandicoot (USA)'), 'Crash Bandicoot (USA)')
  assert.equal(psx('Crash Bandicoot'), 'Crash Bandicoot (USA)') // senza indicazioni si preferisce USA
  assert.equal(psx('Crash Bandicoot (Europe)'), 'Crash Bandicoot (Europe)') // non la variante EDC
  assert.equal(psx('Crash Bandicoot 2: Cortex Strikes Back (USA)'), 'Crash Bandicoot 2 - Cortex Strikes Back (USA)')
  assert.equal(psx('Final Fantasy VII (USA) (Disc 2)'), 'Final Fantasy VII (USA) (Disc 2)')
  assert.equal(psx('Final Fantasy VII (USA) (Disc 3)'), 'Final Fantasy VII (USA) (Disc 3)')
  assert.equal(psx('Final Fantasy VII (Europe) (Disc 1)'), 'Final Fantasy VII (Europe) (Disc 1)')
  assert.equal(psx('Castlevania - Symphony of the Night (Japan)') === null, false) // se manca la regione si ripiega su un'altra
  assert.match(psx('Castlevania: Symphony of the Night') ?? '', /^Castlevania - Symphony of the Night \(USA\)$/)
})

test('SNES: articolo in coda, versioni e prototipi', () => {
  assert.equal(snes('The Legend of Zelda - A Link to the Past (USA)'), 'Legend of Zelda, The - A Link to the Past (USA)')
  assert.equal(snes('Legend of Zelda, The - A Link to the Past (Europe)'), 'Legend of Zelda, The - A Link to the Past (Europe)')
  assert.equal(snes('Chrono Trigger'), 'Chrono Trigger (USA)') // non il campione giapponese
  assert.equal(snes('Mega Man X (USA)'), 'Mega Man X (USA)') // non la Rev 1
  assert.equal(snes('Super Mario World'), 'Super Mario World (USA)')
})

test('titoli sconosciuti: nessuna copertina sbagliata', () => {
  assert.equal(psx('Gioco Inventato Che Non Esiste (USA)'), null)
  assert.equal(psx(''), null)
  assert.equal(snes('Crash Bandicoot'), null)
})

test('elenco dal sito: nomi con spazi, simboli e voci da ignorare', () => {
  const html = '<a href="../">..</a><a href="Crash%20Bandicoot%20(USA).png">x</a><a href="Rock%20&amp;%20Roll.png">y</a><a href="sub/x.png">z</a><a href="leggimi.txt">t</a>'
  assert.deepEqual(parseListingHtml(html), ['Crash Bandicoot (USA)', 'Rock & Roll'])
  assert.deepEqual(parseGithubTree({ tree: [{ path: 'Named_Boxarts/A (USA).png' }, { path: 'Named_Snaps/B.png' }, { path: 'Named_Boxarts/sub/C.png' }] }, 'Named_Boxarts'), ['A (USA)'])
  assert.deepEqual(parseGithubTree(null, 'Named_Boxarts'), [])
})

test('indice: dal sito, poi salvato su disco; se il sito non c\'è si usa GitHub', async () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-idx-'))
  let calls = 0
  const site = (async (url: string) => {
    calls++
    return url.startsWith('https://thumbnails.libretro.com/') ? new Response('<a href="Zelda%20(USA).png">z</a>') : new Response('{}', { status: 500 })
  }) as unknown as typeof fetch
  assert.deepEqual(await loadIndex(root, 'Nintendo - NES', 'Named_Boxarts', site), ['Zelda (USA)'])
  const n = calls
  const fail = (async () => new Response('', { status: 500 })) as unknown as typeof fetch
  // seconda volta (altra istanza in memoria non presente): arriva dal disco, senza rete
  assert.deepEqual(await loadIndex(root, 'Nintendo - NES', 'Named_Boxarts', fail), ['Zelda (USA)'])
  assert.ok(calls === n)
  // sito giù, GitHub risponde
  const root2 = mkdtempSync(join(tmpdir(), 'mr-idx-'))
  const gh = (async (url: string) => (url.startsWith('https://api.github.com/') ? new Response(JSON.stringify({ tree: [{ path: 'Named_Boxarts/Metroid (USA).png' }] })) : new Response('', { status: 503 }))) as unknown as typeof fetch
  assert.deepEqual(await loadIndex(root2, 'Nintendo - SNES', 'Named_Boxarts', gh), ['Metroid (USA)'])
  // niente rete e niente copia: null (si riprova più tardi)
  assert.equal(await loadIndex(mkdtempSync(join(tmpdir(), 'mr-idx-')), 'Sega - X', 'Named_Boxarts', fail), null)
})
