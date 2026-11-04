import { existsSync, readFileSync } from 'fs'
import type { PlayStat } from '@shared/types'
import { writeFileAtomic } from './atomic'

export function loadStats(file: string): Record<string, PlayStat> {
  try {
    if (existsSync(file)) {
      const j = JSON.parse(readFileSync(file, 'utf8')) as Record<string, PlayStat>
      if (j && typeof j === 'object') return j
    }
  } catch {
    // file rovinato: si riparte da zero
  }
  return {}
}

/** Registra una partita finita: tempo giocato, numero di partite e quando */
export function recordPlay(file: string, id: string, seconds: number, now = Date.now()): PlayStat {
  const all = loadStats(file)
  const cur = all[id] ?? { plays: 0, seconds: 0, last: 0 }
  const next = { plays: cur.plays + 1, seconds: cur.seconds + Math.max(0, Math.round(seconds)), last: now }
  all[id] = next
  writeFileAtomic(file, JSON.stringify(all))
  return next
}
