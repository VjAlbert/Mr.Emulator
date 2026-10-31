import { useEffect, useState } from 'react'
import type { Game, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import CoverCarousel from './CoverCarousel'
import Orbs from './Orbs'
import FadeBackdrop from './FadeBackdrop'
import { pickArt } from '../hooks/useArt'

/** "Titolo (dettagli)" -> parte principale + dettagli tecnici mostrati più piccoli */
function splitTitle(name: string): { main: string; tag: string } {
  const i = name.indexOf(' (')
  return i > 0 ? { main: name.slice(0, i), tag: name.slice(i + 1) } : { main: name, tag: '' }
}

interface Props {
  system: SystemInfo
  games: Game[]
  message: string
  onLaunch: (g: Game) => void
  onBack: () => void
}

export default function GameList({ system, games, message, onLaunch, onBack }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const [, setTick] = useState(0)
  const game = games[index]
  const title = game ? splitTitle(game.name) : null
  // schermata di gioco (orizzontale) mostrata in dissolvenza dietro l'interfaccia
  const back = game ? pickArt(game.id).back : null

  useInput({
    onMove: (dir) =>
      setIndex((i) => {
        const n = games.length
        if (!n) return 0
        return dir === 'up' || dir === 'left' ? Math.max(0, i - 1) : Math.min(n - 1, i + 1)
      }),
    onConfirm: () => game && onLaunch(game),
    onBack
  })

  // tastiera: premendo una lettera si salta al prossimo titolo che inizia così
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1 || !/[a-z0-9]/i.test(e.key)) return
      const ch = e.key.toLowerCase()
      setIndex((i) => {
        const n = games.length
        for (let k = 1; k <= n; k++) {
          const j = (i + k) % n
          if (games[j].name.toLowerCase().replace(/^[^a-z0-9]+/, '').startsWith(ch)) return j
        }
        return i
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [games])

  // la riga selezionata resta sempre visibile
  const scrollTo = (el: HTMLButtonElement | null): void => el?.scrollIntoView({ block: 'nearest' })

  return (
    <div className="screen games" style={{ ['--accent' as string]: system.color }}>
      <FadeBackdrop url={back} />
      <Orbs />
      <header className="topbar">
        <button className="chip" onClick={onBack}>
          ◀ INDIETRO
        </button>
        <h2 className="sys-title">{system.name}</h2>
        <span className="counter">
          {games.length ? `${index + 1} / ${games.length}` : ''}
        </span>
      </header>

      <div className="games-body">
        <div className="list">
          {games.length === 0 && (
            <div className="empty">
              Nessun gioco trovato in <b>{system.folder}</b>.
              <br />
              Copia qui le tue ROM e riapri questo sistema.
              <br />
              <button className="chip" onClick={() => window.mr.openFolder(system.id)}>
                APRI LA CARTELLA
              </button>
            </div>
          )}
          {games.map((g, i) => {
            const t = splitTitle(g.name)
            return (
              <button
                key={g.id}
                ref={i === index ? scrollTo : undefined}
                className={`row ${i === index ? 'active' : ''}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => onLaunch(g)}
              >
                <span className="row-num">{String(i + 1).padStart(3, '0')}</span>
                <span className="row-name">
                  {t.main}
                  {t.tag && <small>{t.tag}</small>}
                </span>
              </button>
            )
          })}
        </div>

        <aside className="preview">
          {game && title ? (
            <>
              <CoverCarousel games={games} index={index} onSelect={setIndex} onActivate={() => onLaunch(game)} onLoaded={() => setTick((n) => n + 1)} />
              <div key={game.id} className="preview-card">
                <div className="preview-name">{title.main}</div>
                {title.tag && <div className="preview-tag">{title.tag}</div>}
                <div className="preview-meta">
                  {system.name}
                  {game.demo ? ' · DEMO' : ''}
                </div>
                <div className="preview-start">▶ PREMI INVIO PER GIOCARE</div>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {message && <div className="toast">{message}</div>}
    </div>
  )
}
