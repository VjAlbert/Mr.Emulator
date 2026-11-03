import type { ImageStyle } from './types'

export interface Source {
  /** Righe dell'immagine originale (es. 224 o 240) */
  height: number
  /** Proporzioni con cui l'immagine va mostrata (es. 4/3) */
  aspect: number
}

export interface Viewport {
  width: number
  height: number
  /** Quanto dello schermo è occupato (0..1) */
  coverW: number
  coverH: number
  /** Ingrandimento intero, se la modalità lo usa */
  factor: number | null
}

/**
 * Dimensione con cui il gioco appare sullo schermo nelle quattro modalità.
 * Serve all'anteprima nelle impostazioni, ed è lo stesso ragionamento che fanno RetroArch e MAME.
 */
export function computeViewport(screen: { width: number; height: number }, src: Source, mode: ImageStyle): Viewport {
  const { width: sw, height: sh } = screen
  const done = (w: number, h: number, factor: number | null): Viewport => ({ width: Math.round(w), height: Math.round(h), coverW: w / sw, coverH: h / sh, factor })
  if (mode === 'stretch') return done(sw, sh, null)
  // adattato: tutta l'altezza possibile, mantenendo le proporzioni
  const fitH = Math.min(sh, sw / src.aspect)
  if (mode === 'fit') return done(fitH * src.aspect, fitH, null)
  if (mode === 'pixel-height') {
    const k = Math.max(1, Math.floor(fitH / src.height))
    const h = src.height * k
    return done(h * src.aspect, h, k)
  }
  // pixel perfetti: multiplo intero che sta sia in altezza sia in larghezza
  const k = Math.max(1, Math.floor(Math.min(sh / src.height, sw / (src.height * src.aspect))))
  return done(src.height * k * src.aspect, src.height * k, k)
}

/** Esempi di immagini per l'anteprima */
export const SOURCES: Array<{ id: string; label: string; src: Source }> = [
  { id: 'arcade', label: 'Arcade e Neo Geo (4:3, 224 righe)', src: { height: 224, aspect: 4 / 3 } },
  { id: 'console', label: 'Console 16 bit (4:3, 240 righe)', src: { height: 240, aspect: 4 / 3 } },
  { id: 'tate', label: 'Arcade verticale (3:4, 256 righe)', src: { height: 256, aspect: 3 / 4 } },
  { id: 'gb', label: 'Game Boy (10:9, 144 righe)', src: { height: 144, aspect: 10 / 9 } }
]
