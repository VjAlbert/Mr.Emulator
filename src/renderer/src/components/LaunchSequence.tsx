import { useEffect } from 'react'
import type { Game } from '@shared/types'
import { setModalOpen, useInput } from '../hooks/useInput'
import { pickArt } from '../hooks/useArt'
import { sfx } from '../sound'
import GeneratedCover from './GeneratedCover'
import { splitTitle } from '../search'

interface Props {
  game: Game
  systemName: string
  color: string
  onDone: () => void
}

/** Breve sequenza prima dell'avvio: "INSERT COIN" poi "PLAYER 1 READY". Un pulsante qualsiasi la salta. */
export default function LaunchSequence({ game, systemName, color, onDone }: Props): React.JSX.Element {
  const cover = pickArt(game.id).cover
  const title = splitTitle(game.name).main

  useEffect(() => {
    setModalOpen(true)
    sfx.coin()
    const ready = window.setTimeout(() => sfx.ready(), 560)
    const done = window.setTimeout(onDone, 1350)
    return () => {
      window.clearTimeout(ready)
      window.clearTimeout(done)
      setModalOpen(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useInput({ onConfirm: onDone, onBack: onDone }, { modal: true })

  return (
    <div className="ls" style={{ ['--accent' as string]: color }} onClick={onDone}>
      <div className="ls-slash" />
      <div className="ls-cover">{cover ? <img src={cover} alt="" draggable={false} /> : <GeneratedCover id={game.id} name={game.name} system={systemName} color={color} year={game.year} shot={pickArt(game.id).back} />}</div>
      <div className="ls-text">
        <div className="ls-sys">{systemName}</div>
        <div className="ls-title">{title}</div>
        <div className="ls-coin">INSERT COIN</div>
        <div className="ls-ready">PLAYER 1 READY!</div>
      </div>
      <div className="ls-bar">
        <i />
      </div>
    </div>
  )
}
