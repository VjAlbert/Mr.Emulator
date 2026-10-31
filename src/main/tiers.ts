import type { PerfLevel, Tier, Vendor } from '@shared/types'

/** Funzioni pure (senza Electron): classificano CPU, scheda video e PC nel suo insieme. */

export function vendorFromId(id: number): Vendor {
  if (id === 0x10de) return 'nvidia'
  if (id === 0x1002 || id === 0x1022) return 'amd'
  if (id === 0x8086) return 'intel'
  return 'other'
}

export function classifyGpu(name: string, vendor: Vendor): Tier {
  const n = name.toLowerCase()
  // schede potenti: RTX, RX di fascia alta (4 cifre), GTX 1070 e superiori, Arc dedicate
  if (/rtx|titan|rx\s?[5-9]\d{3}|gtx\s?(1070|1080|1660)|arc\s?a[5-7]\d{2}/.test(n)) return 'high'
  // integrate e vecchie schede di base
  if (
    vendor === 'intel' ||
    /\bgt\s?[1-7]\d{2}\b|uhd|iris|hd graphics|vega\s?\d{1,2}\b|radeon\(tm\) graphics|basic render|swiftshader|llvmpipe/.test(n)
  ) {
    return 'low'
  }
  if (/gtx|rx\s?\d{3}|radeon|quadro|geforce|arc/.test(n)) return 'mid'
  return vendor === 'nvidia' || vendor === 'amd' ? 'mid' : 'low'
}

export function classifyCpu(threads: number, mhz: number): Tier {
  if (threads >= 12) return 'high'
  if (threads >= 8) return 'mid'
  if (threads >= 6 && mhz >= 2400) return 'mid'
  return 'low'
}

const SCORE: Record<Tier, number> = { low: 0, mid: 1, high: 2 }

export function overallLevel(cpu: Tier, gpu: Tier): PerfLevel {
  const s = SCORE[cpu] + SCORE[gpu]
  return s >= 4 ? 'max' : s >= 2 ? 'balanced' : 'light'
}

export const LEVELS: PerfLevel[] = ['light', 'balanced', 'max']
export const LEVEL_LABEL: Record<PerfLevel, string> = { light: 'Leggero', balanced: 'Bilanciato', max: 'Massimo' }

/** Applica una correzione (-2..+1) mantenendosi nei limiti */
export function shiftLevel(base: PerfLevel, delta: number): PerfLevel {
  const i = Math.min(2, Math.max(0, LEVELS.indexOf(base) + delta))
  return LEVELS[i]
}
