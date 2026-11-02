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
