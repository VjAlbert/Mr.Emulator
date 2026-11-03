import { closeSync, mkdirSync, openSync, readFileSync, statSync, writeSync } from 'fs'
import { dirname } from 'path'
import { promises as fsp } from 'fs'
import { crc32, deflateRawSync } from 'zlib'
import type { ZipEntry } from './zipinfo'

/** Ora e data nel formato DOS usato dagli ZIP */
function dosTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: (Math.max(0, d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  }
}

export interface ZipSource {
  /** Nome dentro lo ZIP (con "/" come separatore) */
  name: string
  /** File da cui leggere i dati */
  path: string
}

/** Crea uno ZIP (compressione deflate). Pensato per i salvataggi: niente ZIP64, quindi al massimo ~4 GB e 65.000 file. */
export function createZip(dest: string, files: ZipSource[]): number {
  if (files.length > 65000) throw new Error('Troppi file per un solo ZIP')
  mkdirSync(dirname(dest), { recursive: true })
  const fd = openSync(dest, 'w')
  const central: Buffer[] = []
  let offset = 0
  try {
    for (const f of files) {
      const data = readFileSync(f.path)
      const comp = data.length ? deflateRawSync(data) : data
      const method = data.length ? 8 : 0
      const name = Buffer.from(f.name, 'utf8')
      const { time, date } = dosTime(statSync(f.path).mtime)
      const crc = crc32(data)
      const lh = Buffer.alloc(30)
      lh.writeUInt32LE(0x04034b50, 0)
      lh.writeUInt16LE(20, 4)
      lh.writeUInt16LE(0x0800, 6) // nomi in UTF-8
      lh.writeUInt16LE(method, 8)
      lh.writeUInt16LE(time, 10)
      lh.writeUInt16LE(date, 12)
      lh.writeUInt32LE(crc >>> 0, 14)
      lh.writeUInt32LE(comp.length, 18)
      lh.writeUInt32LE(data.length, 22)
      lh.writeUInt16LE(name.length, 26)
      writeSync(fd, Buffer.concat([lh, name, comp]))
      const ch = Buffer.alloc(46)
      ch.writeUInt32LE(0x02014b50, 0)
      ch.writeUInt16LE(20, 4)
      ch.writeUInt16LE(20, 6)
      ch.writeUInt16LE(0x0800, 8)
      ch.writeUInt16LE(method, 10)
      ch.writeUInt16LE(time, 12)
      ch.writeUInt16LE(date, 14)
      ch.writeUInt32LE(crc >>> 0, 16)
      ch.writeUInt32LE(comp.length, 20)
      ch.writeUInt32LE(data.length, 24)
      ch.writeUInt16LE(name.length, 28)
      ch.writeUInt32LE(offset, 42)
      central.push(Buffer.concat([ch, name]))
      offset += 30 + name.length + comp.length
      if (offset > 0xf0000000) throw new Error('I salvataggi superano i 4 GB: non entrano in un solo ZIP')
    }
    const cd = Buffer.concat(central)
    const eo = Buffer.alloc(22)
    eo.writeUInt32LE(0x06054b50, 0)
    eo.writeUInt16LE(files.length, 8)
    eo.writeUInt16LE(files.length, 10)
    eo.writeUInt32LE(cd.length, 12)
    eo.writeUInt32LE(offset, 16)
    writeSync(fd, Buffer.concat([cd, eo]))
  } finally {
    closeSync(fd)
  }
  return files.length
}

/** Elenco di tutte le voci di uno ZIP (senza filtri né unioni: servono i percorsi completi). null = non è uno ZIP leggibile. */
export async function listZip(file: string): Promise<ZipEntry[] | null> {
  let fh
  try {
    fh = await fsp.open(file, 'r')
    const { size } = await fh.stat()
    if (size < 22) return null
    const tailLen = Math.min(size, 65557)
    const tail = Buffer.alloc(tailLen)
    await fh.read(tail, 0, tailLen, size - tailLen)
    let eocd = -1
    for (let i = tailLen - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === 0x06054b50) {
        eocd = i
        break
      }
    }
    if (eocd < 0) return null
    const total = tail.readUInt16LE(eocd + 10)
    const cdSize = tail.readUInt32LE(eocd + 12)
    const cdOffset = tail.readUInt32LE(eocd + 16)
    if (cdOffset === 0xffffffff || cdSize === 0xffffffff || total === 0xffff || cdOffset + cdSize > size) return null
    const cd = Buffer.alloc(cdSize)
    await fh.read(cd, 0, cdSize, cdOffset)
    const out: ZipEntry[] = []
    let p = 0
    for (let n = 0; n < total && p + 46 <= cdSize; n++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) return null
      const flags = cd.readUInt16LE(p + 8)
      const method = cd.readUInt16LE(p + 10)
      const csize = cd.readUInt32LE(p + 20)
      const usize = cd.readUInt32LE(p + 24)
      const nameLen = cd.readUInt16LE(p + 28)
      const extraLen = cd.readUInt16LE(p + 30)
      const commentLen = cd.readUInt16LE(p + 32)
      const offset = cd.readUInt32LE(p + 42)
      const name = cd.toString(flags & 0x0800 ? 'utf8' : 'latin1', p + 46, p + 46 + nameLen)
      p += 46 + nameLen + extraLen + commentLen
      if (!name.endsWith('/')) out.push({ name, method, csize, size: usize, offset })
    }
    return out
  } catch {
    return null
  } finally {
    await fh?.close()
  }
}
