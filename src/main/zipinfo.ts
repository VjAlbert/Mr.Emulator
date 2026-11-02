import { inflateRawSync } from 'zlib'
import { promises as fsp } from 'fs'

export interface ZipInfo {
  /** Dimensione del file ZIP in byte */
  size: number
  /** Nomi dei file contenuti (solo il nome, senza cartelle) */
  names: string[]
}

/**
 * Legge l'elenco dei file di uno ZIP dalla sua "directory centrale", senza estrarre niente
 * (veloce anche per ZIP da centinaia di MB). Restituisce null se il file non è uno ZIP leggibile
 * (ZIP64 molto grandi inclusi: in quel caso la diagnosi semplicemente non c'è).
 */
export async function readZipInfo(file: string): Promise<ZipInfo | null> {
  let fh
  try {
    fh = await fsp.open(file, 'r')
    const { size } = await fh.stat()
    if (size < 22) return null
    // il "fine archivio" sta negli ultimi byte (può essere seguito da un commento di al massimo 64 KB)
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
    if (cdOffset === 0xffffffff || cdSize === 0xffffffff || total === 0xffff) return null // ZIP64
    if (cdOffset + cdSize > size) return null
    const cd = Buffer.alloc(cdSize)
    await fh.read(cd, 0, cdSize, cdOffset)
    const names: string[] = []
    let p = 0
    for (let n = 0; n < total && p + 46 <= cdSize; n++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) return null
      const nameLen = cd.readUInt16LE(p + 28)
      const extraLen = cd.readUInt16LE(p + 30)
      const commentLen = cd.readUInt16LE(p + 32)
      const name = cd.toString('utf8', p + 46, p + 46 + nameLen)
      if (!name.endsWith('/')) names.push(name.split('/').pop() ?? name)
      p += 46 + nameLen + extraLen + commentLen
    }
    return { size, names }
  } catch {
    return null
  } finally {
    await fh?.close()
  }
}

export interface ZipEntry {
  name: string
  /** 0 = non compresso, 8 = deflate */
  method: number
  csize: number
  size: number
  /** Posizione dell'intestazione locale nel file */
  offset: number
}

export interface ZipArchive {
  file: string
  /** Chiave: nome del file senza cartelle e senza estensione, in minuscolo */
  entries: Map<string, ZipEntry>
}

/** Legge la directory centrale di uno ZIP con i dati necessari a estrarre i singoli file (no ZIP64) */
export async function openZip(file: string, accept: (ext: string) => boolean): Promise<ZipArchive | null> {
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
    const entries = new Map<string, ZipEntry>()
    let p = 0
    for (let n = 0; n < total && p + 46 <= cdSize; n++) {
      if (cd.readUInt32LE(p) !== 0x02014b50) return null
      const method = cd.readUInt16LE(p + 10)
      const csize = cd.readUInt32LE(p + 20)
      const usize = cd.readUInt32LE(p + 24)
      const nameLen = cd.readUInt16LE(p + 28)
      const extraLen = cd.readUInt16LE(p + 30)
      const commentLen = cd.readUInt16LE(p + 32)
      const offset = cd.readUInt32LE(p + 42)
      const name = cd.toString('utf8', p + 46, p + 46 + nameLen)
      p += 46 + nameLen + extraLen + commentLen
      if (name.endsWith('/')) continue
      const base = name.split('/').pop() ?? name
      const dot = base.lastIndexOf('.')
      const ext = dot >= 0 ? base.slice(dot).toLowerCase() : ''
      if (!accept(ext)) continue
      const key = (dot >= 0 ? base.slice(0, dot) : base).toLowerCase()
      if (!entries.has(key)) entries.set(key, { name, method, csize, size: usize, offset })
    }
    return { file, entries }
  } catch {
    return null
  } finally {
    await fh?.close()
  }
}

/** Estrae un file dallo ZIP (non compresso o deflate) */
export async function readZipEntry(file: string, e: ZipEntry): Promise<Buffer> {
  const fh = await fsp.open(file, 'r')
  try {
    const head = Buffer.alloc(30)
    await fh.read(head, 0, 30, e.offset)
    if (head.readUInt32LE(0) !== 0x04034b50) throw new Error('intestazione ZIP non valida')
    const start = e.offset + 30 + head.readUInt16LE(26) + head.readUInt16LE(28)
    const raw = Buffer.alloc(e.csize)
    await fh.read(raw, 0, e.csize, start)
    if (e.method === 0) return raw
    if (e.method === 8) return inflateRawSync(raw)
    throw new Error(`metodo di compressione ${e.method} non supportato`)
  } finally {
    await fh.close()
  }
}
