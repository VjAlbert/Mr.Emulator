import { promises as fsp, renameSync, writeFileSync, rmSync } from 'fs'

/**
 * Scrive un file in modo "tutto o niente": prima in un file temporaneo, poi lo rinomina.
 * Se manca la corrente o il programma si chiude a metà, il file vecchio resta intatto.
 */
export function writeFileAtomic(path: string, data: string | Buffer): void {
  const tmp = `${path}.${process.pid}.tmp`
  try {
    writeFileSync(tmp, data)
    renameSync(tmp, path)
  } catch (e) {
    try {
      rmSync(tmp, { force: true })
    } catch {
      // niente da togliere
    }
    throw e
  }
}

export async function writeFileAtomicAsync(path: string, data: string | Buffer): Promise<void> {
  const tmp = `${path}.${process.pid}.tmp`
  try {
    await fsp.writeFile(tmp, data)
    await fsp.rename(tmp, path)
  } catch (e) {
    await fsp.rm(tmp, { force: true }).catch(() => undefined)
    throw e
  }
}
