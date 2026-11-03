import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'http'
import { deflateRawSync } from 'zlib'
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { installCores, missingCores } from '../src/main/cores'
import { SYSTEMS } from '../src/main/systems'
import type { Settings } from '../src/shared/types'

function crc32(b: Buffer): number {
  let c = ~0
  for (const x of b) {
    c ^= x
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

/** ZIP minimo (una voce, deflate) come quelli del sito dei core */
function makeZip(name: string, data: Buffer): Buffer {
  const comp = deflateRawSync(data)
  const nm = Buffer.from(name)
  const lh = Buffer.alloc(30)
  lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(8, 8)
  lh.writeUInt32LE(crc32(data), 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nm.length, 26)
  const cd = Buffer.alloc(46)
  cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(8, 10)
  cd.writeUInt32LE(crc32(data), 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(nm.length, 28); cd.writeUInt32LE(0, 42)
  const eo = Buffer.alloc(22)
  const cdOff = 30 + nm.length + comp.length
  eo.writeUInt32LE(0x06054b50, 0); eo.writeUInt16LE(1, 8); eo.writeUInt16LE(1, 10); eo.writeUInt32LE(46 + nm.length, 12); eo.writeUInt32LE(cdOff, 16)
  return Buffer.concat([lh, nm, comp, cd, nm, eo])
}

import { randomBytes } from 'crypto'
const dll = Buffer.concat([Buffer.from('MZ'), randomBytes(4000)])
const notDll = randomBytes(4000)

test('core: scaricato, estratto e controllato; errori chiari senza fermare gli altri', async () => {
  const server = createServer((req, res) => {
    const f = (req.url ?? '').split('/').pop()
    if (f === 'buono_libretro.dll.zip') return res.end(makeZip('buono_libretro.dll', dll))
    if (f === 'rotto_libretro.dll.zip') return res.end(makeZip('rotto_libretro.dll', notDll))
    res.statusCode = 404
    res.end()
  })
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r))
  const port = (server.address() as { port: number }).port
  const dir = join(mkdtempSync(join(tmpdir(), 'mr-core-')), 'cores')
  const r = await installCores(['buono_libretro', 'rotto_libretro', 'assente_libretro', 'Nome Strano'], dir, `http://127.0.0.1:${port}/`)
  server.close()
  assert.deepEqual(r.map((x) => x.ok), [true, false, false, false], JSON.stringify(r))
  assert.match(r[1].error ?? '', /danneggiato/)
  assert.match(r[2].error ?? '', /non esiste/)
  assert.match(r[3].error ?? '', /non valido/)
  assert.deepEqual(readFileSync(join(dir, 'buono_libretro.dll')), dll)
  assert.ok(!existsSync(join(dir, 'rotto_libretro.dll')))
})

test('core mancanti: solo quelli dei sistemi attivi, senza duplicati', () => {
  const root = mkdtempSync(join(tmpdir(), 'mr-cm-'))
  mkdirSync(join(root, 'cores'))
  writeFileSync(join(root, 'cores', 'nestopia_libretro.dll'), '')
  const s = { retroarchPath: join(root, 'retroarch.exe'), coresDir: '' } as Settings
  const all = missingCores(s, SYSTEMS)
  assert.ok(!all.includes('nestopia_libretro'))
  assert.ok(all.includes('flycast_libretro'))
  assert.equal(new Set(all).size, all.length)
  const onlyNes = missingCores(s, SYSTEMS, (id) => (id === 'snes' ? 3 : 0))
  assert.deepEqual(onlyNes, ['snes9x_libretro'])
  assert.deepEqual(missingCores({ retroarchPath: '', coresDir: '' } as Settings, SYSTEMS), [])
})
