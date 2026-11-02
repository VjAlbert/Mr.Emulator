import { useSyncExternalStore } from 'react'
import { music } from '../music'

/** Barra della musica in basso a sinistra: compare quando la colonna sonora di un gioco è in riproduzione */
export default function MiniPlayer(): React.JSX.Element | null {
  const s = useSyncExternalStore(music.subscribe, music.getState)
  if (!s.active) return null
  return (
    <div className={`mp ${s.playing ? 'playing' : ''}`}>
      <div className="mp-eq" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="mp-text">
        <div className="mp-track">{s.track}</div>
        <div className="mp-game">
          ♪ {s.game} · brano {s.index + 1} di {s.count}
        </div>
      </div>
      <button onClick={() => music.prev()} title="Brano precedente">
        ⏮
      </button>
      <button onClick={() => music.toggle()} title="Pausa / riprendi">
        {s.playing ? '⏸' : '▶'}
      </button>
      <button onClick={() => music.next()} title="Brano successivo">
        ⏭
      </button>
      <button onClick={() => music.stop()} title="Ferma">
        ✕
      </button>
    </div>
  )
}
