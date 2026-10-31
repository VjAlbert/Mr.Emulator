import { useEffect, useRef, useState } from 'react'
import type { Game, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'

interface Props {
  system: SystemInfo
  games: Game[]
  message: string
  onLaunch: (g: Game) => void
  onBack: () => void
}

export default function GameList({ system, games, message, onLaunch, onBack }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const [art, setArt] = useState<{ id: string; url: string } | null>(null)
  const game = games[index]

  useEffect(() => {
    listRef.current?.querySelector('.row.active')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  useEffect(() => {
    if (!game || game.demo) return
    let cancelled = false
    // piccola attesa: scorrendo velocemente la lista non si scarica ogni gioco
    const t = window.setTimeout(() => {
      window.mr.getArt(game).then((url) => {
        if (!cancelled && url) setArt({ id: game.id, url })
      })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [game])

  useInput({
    onMove: (dir) =>
      setIndex((i) => {
        const n = games.length
        if (!n) return 0
        if (dir === 'up') return Math.max(0, i - 1)
        if (dir === 'down') return Math.min(n - 1, i + 1)
        if (dir === 'left') return Math.max(0, i - 10)
        return Math.min(n - 1, i + 10)
      }),
    onConfirm: () => game && onLaunch(game),
    onBack
  })

  return (
    <div className="screen games" style={{ ['--accent' as string]: system.color }}>
      <header className="topbar">
        <button className="chip" onClick={onBack}>
          ◀ INDIETRO
        </button>
        <h2 className="sys-title">{system.name}</h2>
      </header>

      <div className="games-body">
        <div className="list" ref={listRef}>
          {games.length === 0 && (
            <div className="empty">
              Nessun gioco trovato in <b>{system.folder}</b>.
              <br />
              Controlla la cartella ROM nelle impostazioni.
            </div>
          )}
          {games.map((g, i) => (
            <button
              key={g.id}
              className={`row ${i === index ? 'active' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onClick={() => onLaunch(g)}
            >
              <span className="row-num">{String(i + 1).padStart(3, '0')}</span>
              <span className="row-name">{g.name}</span>
            </button>
          ))}
        </div>

        <aside className="preview">
          {game ? (
            <div key={game.id} className="preview-card">
              <div className="preview-art">
                {art && art.id === game.id ? <img src={art.url} alt={game.name} /> : game.name.slice(0, 1)}
              </div>
              <div className="preview-name">{game.name}</div>
              <div className="preview-meta">
                {system.name}
                {game.demo ? ' · DEMO' : ''}
              </div>
              <div className="preview-file">{game.fileName}</div>
              <div className="preview-start">▶ PREMI INVIO PER GIOCARE</div>
            </div>
          ) : null}
        </aside>
      </div>

      {message && <div className="toast">{message}</div>}
    </div>
  )
}
