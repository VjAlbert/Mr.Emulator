import { useEffect, useState } from 'react'
import type { SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import ArtShowcase from './ArtShowcase'
import Orbs from './Orbs'

const COLS = 4

interface Props {
  systems: SystemInfo[]
  onOpen: (s: SystemInfo) => void
  onSettings: () => void
}

export default function SystemSelect({ systems, onOpen, onSettings }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const sel = systems[index]

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, systems.length - 1)))
  }, [systems.length])

  useInput({
    onMove: (dir) =>
      setIndex((i) => {
        const n = systems.length
        if (dir === 'left') return Math.max(0, i - 1)
        if (dir === 'right') return Math.min(n - 1, i + 1)
        if (dir === 'up') return i - COLS >= 0 ? i - COLS : i
        return i + COLS < n ? i + COLS : i
      }),
    onConfirm: () => sel && sel.phase === 1 && onOpen(sel),
    onMenu: onSettings
  })

  if (!sel) return <div className="loading">Caricamento…</div>

  return (
    <div className="screen select" style={{ ['--accent' as string]: sel.color }}>
      <Orbs />
      {sel.phase === 1 && <ArtShowcase systemId={sel.id} />}
      <header className="topbar">
        <h1 className="logo">
          MR. <span>EMULATOR</span>
        </h1>
        <button className="chip" onClick={onSettings}>
          ⚙ IMPOSTAZIONI
        </button>
      </header>

      <div className="select-body">
        <section className="hero" key={sel.id}>
          <div className="hero-short">{sel.short}</div>
          <div className="hero-name">{sel.name}</div>
          <div className="hero-count">
            {sel.phase !== 1 ? 'IN ARRIVO' : `${sel.gameCount} ${sel.gameCount === 1 ? 'GIOCO' : 'GIOCHI'}`}
          </div>
        </section>

        <section className="grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {systems.map((s, i) => (
            <button
              key={s.id}
              className={`tile ${i === index ? 'active' : ''} ${s.phase !== 1 ? 'locked' : ''}`}
              style={{ ['--tile' as string]: s.color }}
              onMouseEnter={() => setIndex(i)}
              onClick={() => s.phase === 1 && onOpen(s)}
            >
              <span className="tile-short">{s.short}</span>
              <span className="tile-name">{s.name}</span>
              {s.phase !== 1 && <span className="tile-lock">SOON</span>}
            </button>
          ))}
        </section>
      </div>

      <footer className="hints">
        <span>◀▲▼▶ MUOVI</span>
        <span>INVIO / A CONFERMA</span>
        <span>TAB / START IMPOSTAZIONI</span>
      </footer>
    </div>
  )
}
