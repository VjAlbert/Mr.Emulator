import { spawn } from 'child_process'
import { createInterface } from 'readline'
import { dirname } from 'path'

/**
 * Controllo delle ROM con il verificatore di MAME (-verifyroms): è lui a sapere cosa serve a ogni
 * gioco nella versione in uso. Per gli ZIP legge solo i checksum già scritti negli archivi, quindi
 * anche per decine di GB richiede minuti, non ore.
 */

export interface VerifyIssue {
  /** Archivio (set) a cui manca o è sbagliato il file */
  set: string
  file: string
  /** "NOT FOUND", "INCORRECT CHECKSUM", "INCORRECT LENGTH…" */
  reason: string
}

export interface VerifyBad {
  name: string
  /** Gioco principale (la cui cartella/ZIP contiene i file) */
  parent: string
  issues: VerifyIssue[]
}

export interface VerifyResult {
  at: number
  version: string
  /** Set controllati (trovati sul disco) */
  checked: number
  good: number
  bad: VerifyBad[]
  cancelled: boolean
  /** Ultime righe di output, utili se il formato non è quello atteso */
  tail: string[]
}

// motivi che NON sono un problema: il file è a posto o è facoltativo / non esiste una copia buona
const HARMLESS = /^(OK|NEEDS REDUMP|NO GOOD DUMP KNOWN|NOT FOUND BUT OPTIONAL|NOT FOUND - NO GOOD DUMP KNOWN)\b/

/** Legge l'output riga per riga: righe di problema, poi il verdetto "romset X [Y] is good/bad" */
export class VerifyParser {
  checked = 0
  good = 0
  bad: VerifyBad[] = []
  tail: string[] = []
  private pending: VerifyIssue[] = []

  feed(raw: string): void {
    const line = raw.replace(/\s+$/, '')
    if (!line) return
    this.tail.push(line)
    if (this.tail.length > 12) this.tail.shift()

    const verdict = /^romset (\S+) (?:\[(\S+)\] )?is (good|bad|best available)$/.exec(line)
    if (verdict) {
      this.checked++
      if (verdict[3] === 'bad') {
        this.bad.push({ name: verdict[1], parent: verdict[2] ?? verdict[1], issues: this.pending })
      } else this.good++
      this.pending = []
      return
    }
    // "kof96        : 214-c6.c6 (4194304 bytes) - NOT FOUND (tried in kof96 neogeo)"
    const issue = /^(\S+)\s*:\s+(.+?)(?: \((\d+) bytes\))? - (.+)$/.exec(line)
    if (issue && !HARMLESS.test(issue[4])) {
      this.pending.push({ set: issue[1], file: issue[2], reason: issue[4].replace(/:$/, '') })
    }
  }
}

export function runVerify(
  exe: string,
  args: string[],
  onProgress?: (checked: number, bad: number) => void
): { done: Promise<VerifyResult>; cancel: () => void } {
  const child = spawn(exe, args, { cwd: dirname(exe), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
  const parser = new VerifyParser()
  let cancelled = false
  let last = 0
  const feed = (l: string): void => {
    parser.feed(l)
    const now = Date.now()
    if (now - last > 400) {
      last = now
      onProgress?.(parser.checked, parser.bad.length)
    }
  }
  const rlOut = createInterface({ input: child.stdout!, crlfDelay: Infinity })
  const rlErr = createInterface({ input: child.stderr!, crlfDelay: Infinity })
  rlOut.on('line', feed)
  rlErr.on('line', feed)
  const done = new Promise<VerifyResult>((resolve) => {
    const finish = (): void => {
      onProgress?.(parser.checked, parser.bad.length)
      resolve({ at: Date.now(), version: '', checked: parser.checked, good: parser.good, bad: parser.bad, cancelled, tail: parser.tail })
    }
    child.once('error', finish)
    child.once('close', () => setTimeout(finish, 50)) // il tempo di leggere le ultime righe
  })
  return {
    done,
    cancel: () => {
      cancelled = true
      child.kill()
    }
  }
}
