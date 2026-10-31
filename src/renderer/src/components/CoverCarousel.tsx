import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Game } from '@shared/types'
import { loadAll, loadCover, pickArt } from '../hooks/useArt'

const RANGE = 3
// ordine in cui si scaricano le copertine: prima quella scelta, poi le vicine
const ORDER = [0, 1, -1, 2, -2, 3, -3]

interface Props {
  games: Game[]
  index: number
  onSelect: (i: number) => void
  onActivate: () => void
  /** Chiamata quando arriva una nuova immagine, per aggiornare anche lo sfondo */
  onLoaded: () => void
}

/** Carosello 3D: le copertine ruotano attorno a quella selezionata */
export default function CoverCarousel({ games, index, onSelect, onActivate, onLoaded }: Props): React.JSX.Element {
  const [, bump] = useState(0)

  useEffect(() => {
    let cancelled = false
    // piccola attesa: scorrendo velocemente non si scarica ogni titolo
    const t = window.setTimeout(async () => {
      for (const o of ORDER) {
        const g = games[index + o]
        if (!g || g.demo) continue
        // il gioco scelto: tutte le immagini (copertina + sfondo); i vicini: solo la copertina
        await (o === 0 ? loadAll(g) : loadCover(g))
        if (cancelled) return
        bump((n) => n + 1)
        onLoaded()
      }
    }, 160)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [games, index]) // eslint-disable-line react-hooks/exhaustive-deps

  const items: React.JSX.Element[] = []
  for (let o = -RANGE; o <= RANGE; o++) {
    const g = games[index + o]
    if (!g) continue
    const sign = Math.sign(o)
    const abs = Math.abs(o)
    const x = o === 0 ? 0 : sign * (190 + (abs - 1) * 80)
    const style: CSSProperties = {
      transform: `translate(-50%, -50%) translateX(${x}px) translateZ(${-abs * 80}px) rotateY(${-sign * 55}deg) scale(${o === 0 ? 1.12 : 1})`,
      opacity: abs === 0 ? 1 : Math.max(0.15, 0.85 - abs * 0.25),
      zIndex: 10 - abs
    }
    const url = pickArt(g.id).cover
    items.push(
      <div
        key={g.id}
        className={`cv ${o === 0 ? 'center' : ''}`}
        style={style}
        onClick={() => (o === 0 ? onActivate() : onSelect(index + o))}
      >
        <div className="cv-inner">
          {url ? <img src={url} alt={g.name} draggable={false} /> : <div className="cv-ph">{g.name.slice(0, 1)}</div>}
        </div>
      </div>
    )
  }
  return <div className="carousel">{items}</div>
}
