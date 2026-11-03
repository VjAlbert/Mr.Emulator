import { useState } from 'react'
import type { ImageStyle } from '@shared/types'
import { SOURCES, computeViewport } from '@shared/viewport'

export const IMAGE_MODES: Array<[ImageStyle, string, string]> = [
  ['fit', 'ALTEZZA PIENA', 'Il gioco occupa tutta l\'altezza dello schermo, con le proporzioni originali. Nitido e il più grande possibile.'],
  ['pixel', 'PIXEL PERFETTI', 'Solo ingrandimenti interi (×4, ×5…): ogni pixel è un quadrato perfetto. Un po\' più piccolo.'],
  ['pixel-height', 'PIXEL PERFETTI IN ALTEZZA', 'Altezza a multipli interi, larghezza libera: pixel nitidi in verticale e immagine quasi a tutta altezza.'],
  ['stretch', 'TUTTO SCHERMO (STIRATO)', 'Riempie tutto lo schermo ma deforma l\'immagine: cerchi che diventano ovali.']
]

/** Mostra come apparirebbe il gioco sul tuo schermo nelle quattro modalità, con le misure vere */
export default function ScreenPreview({ screen, mode }: { screen: { width: number; height: number }; mode: ImageStyle }): React.JSX.Element {
  const [srcId, setSrcId] = useState('arcade')
  const src = (SOURCES.find((s) => s.id === srcId) ?? SOURCES[0]).src
  const W = 440
  const k = W / screen.width
  const v = computeViewport(screen, src, mode)
  return (
    <div className="spv">
      <div className="spv-top">
        <select value={srcId} onChange={(e) => setSrcId(e.target.value)}>
          {SOURCES.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <span className="hint" style={{ margin: 0 }}>Il tuo schermo: {screen.width}×{screen.height}</span>
      </div>
      <div className="spv-screen" style={{ width: W, height: Math.round(screen.height * k) }}>
        <div className="spv-game" style={{ width: Math.round(v.width * k), height: Math.round(v.height * k) }}>
          {v.width}×{v.height}
        </div>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        Occupa il {Math.round(v.coverW * 100)}% della larghezza e il {Math.round(v.coverH * 100)}% dell&apos;altezza{v.factor ? ` · ingrandimento ×${v.factor}` : ''}.
      </p>
      <ul className="spv-list">
        {IMAGE_MODES.map(([id, name]) => {
          const x = computeViewport(screen, src, id)
          return (
            <li key={id} className={id === mode ? 'on' : ''}>
              <b>{name}</b> {x.width}×{x.height} <span>({Math.round(x.coverH * 100)}% altezza{x.factor ? `, ×${x.factor}` : ''})</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
