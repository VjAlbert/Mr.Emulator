import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { cacheStats, clearImages, clearLocalCopies, moveCache, optimizeCache, pruneCache } from '../src/main/cache'

function make(): { root: string; put: (sys: string, kind: string, name: string, size: number, ageSec?: number) => string } {
  const root = mkdtempSync(join(tmpdir(), 'mr-cache-'))
  const put = (sys: string, kind: string, name: string, size: number, ageSec = 0): string => {
    const dir = join(root, sys, kind)
    mkdirSync(dir, { recursive: true })
    const f = join(dir, name)
    writeFileSync(f, Buffer.alloc(size, 1))
    if (ageSec) utimesSync(f, new Date(Date.now() - ageSec * 1000), new Date(Date.now() - ageSec * 1000))
    return f
  }
  return { root, put }
}

test('cache: conta scaricate e copie dei pacchetti, ignora indici e DAT', async () => {
  const { root, put } = make()
  put('snes', 'Named_Boxarts', 'a.png', 1000)
  put('snes', 'local_snap', 'b.png', 3000)
  mkdirSync(join(root, '_dat'))
  writeFileSync(join(root, '_dat', 'x.dat'), Buffer.alloc(5000))
  const st = await cacheStats(root)
  assert.deepEqual([st.downloaded, st.localCopies, st.total, st.files], [1000, 3000, 4000, 2])
  assert.equal((await cacheStats(join(root, 'non-esiste'))).total, 0)
})

test('cache: l\'ottimizzazione riscrive solo se il file diventa più piccolo e salta le JPEG', async () => {
  const { root, put } = make()
  const big = put('nes', 'Named_Boxarts', 'big.png', 2000)
  const jpg = join(root, 'nes', 'Named_Boxarts', 'ok.png')
  writeFileSync(jpg, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(500)]))
  const same = put('nes', 'Named_Boxarts', 'same.png', 300)
  const fake = (b: Buffer): Buffer => (b.length === 2000 ? Buffer.alloc(200, 2) : b)
  const seen: number[] = []
  const r = await optimizeCache(root, { cancel: false }, (p) => seen.push(p), fake)
  assert.deepEqual([r.files, r.saved], [1, 1800])
  assert.equal(readFileSync(big).length, 200)
  assert.equal(readFileSync(same).length, 300)
  assert.equal(readFileSync(jpg).length, 503)
  assert.equal(seen[seen.length - 1], 100)
})

test('cache: il limite toglie prima le copie, poi le immagini più vecchie', async () => {
  const { root, put } = make()
  const copy = put('mame', 'local_snap', 'c.png', 1000, 10)
  const old = put('mame', 'Named_Boxarts', 'old.png', 1000, 5000)
  const fresh = put('mame', 'Named_Boxarts', 'fresh.png', 1000, 1)
  assert.equal(await pruneCache(root, 0), 0)
  assert.equal(await pruneCache(root, 2000), 1)
  assert.ok(!existsSync(copy) && existsSync(old) && existsSync(fresh))
  assert.equal(await pruneCache(root, 1000), 1)
  assert.ok(!existsSync(old) && existsSync(fresh))
})

test('cache: svuotare le copie o tutto, lasciando indici e DAT', async () => {
  const { root, put } = make()
  put('gb', 'local_title', 'a.png', 10)
  put('gb', 'Named_Titles', 'b.png', 10)
  mkdirSync(join(root, '_dat'))
  writeFileSync(join(root, '_dat', 'x.dat'), 'x')
  assert.equal(await clearLocalCopies(root), 1)
  assert.equal((await cacheStats(root)).files, 1)
  assert.equal(await clearImages(root), 1)
  assert.ok(existsSync(join(root, '_dat', 'x.dat')))
})

test('cache: lo spostamento porta i file nella nuova cartella e toglie la vecchia', async () => {
  const { root, put } = make()
  put('psx', 'Named_Boxarts', 'a.png', 100)
  const dest = join(mkdtempSync(join(tmpdir(), 'mr-dest-')), 'nuova', 'MrEmulator-artwork')
  const seen: number[] = []
  const r = await moveCache(root, dest, (p) => seen.push(p))
  assert.equal(r.ok, true)
  assert.ok(existsSync(join(dest, 'psx', 'Named_Boxarts', 'a.png')))
  assert.ok(!existsSync(root))
  // una dentro l'altra: rifiutato
  assert.equal((await moveCache(dest, join(dest, 'sotto'), () => undefined)).ok, false)
})

test('copertine presenti: si contano quelle scaricate (Named_Boxarts) e quelle estratte dai pacchetti', async () => {
  const { coverCount, setArtRoot } = await import('../src/main/artwork')
  const { root, put } = make()
  put('snes', 'Named_Boxarts', 'a.png', 10)
  put('snes', 'Named_Boxarts', 'b.png', 10)
  put('snes', 'local_boxart', 'c.png', 10)
  put('snes', 'Named_Snaps', 'd.png', 10)
  setArtRoot(root)
  assert.equal(coverCount('snes'), 3)
  assert.equal(coverCount('nes'), 0)
  setArtRoot('')
})

test('cache: le foto delle console seguono la cache (unione di cartelle, senza sovrascrivere)', async () => {
  const { mergeDir } = await import('../src/main/cache')
  const { consoleImagesDir } = await import('../src/main/consoleImages')
  assert.equal(consoleImagesDir('/u'), join('/u', 'consoles'))
  assert.equal(consoleImagesDir('/u', '/d/MrEmulator-artwork'), join('/d/MrEmulator-artwork', '_consoles'))
  const a = mkdtempSync(join(tmpdir(), 'mr-cons-a-'))
  const b = join(mkdtempSync(join(tmpdir(), 'mr-cons-b-')), '_consoles')
  mkdirSync(b, { recursive: true })
  writeFileSync(join(a, 'snes.png'), 'vecchia')
  writeFileSync(join(a, 'nes.png'), 'nes')
  writeFileSync(join(b, 'snes.png'), 'nuova')
  mergeDir(a, b)
  assert.equal(readFileSync(join(b, 'nes.png'), 'utf-8'), 'nes')
  assert.equal(readFileSync(join(b, 'snes.png'), 'utf-8'), 'nuova')
  assert.ok(!existsSync(a))
  mergeDir(join(a, 'non-esiste'), b)
})
