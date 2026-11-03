import { useEffect, useState } from 'react'
import type { Game } from '@shared/types'
import { setModalOpen, useInput } from '../hooks/useInput'
import { sfx } from '../sound'
import { formatDate, t } from '../i18n'
import { splitTitle } from '../search'

export type ResumeChoice = 'continue' | 'new' | 'cancel'

interface Props {
  game: Game
  systemName: string
  color: string
  /** Quando è stato salvato lo stato (millisecondi) */
  time: number
  onChoice: (c: ResumeChoice) => void
}

/** Prima di avviare un gioco con un salvataggio: continuare da dove eri o ricominciare */
export default function ResumeDialog({ game, systemName, color, time, onChoice }: Props): React.JSX.Element {
  const [sel, setSel] = useState<'continue' | 'new'>('continue')

  useEffect(() => {
    setModalOpen(true)
    sfx.confirm()
    return () => setModalOpen(false)
  }, [])

  const pick = (c: ResumeChoice): void => {
    sfx.confirm()
    onChoice(c)
  }

  useInput(
    {
      onMove: (d) => {
        if (d === 'left' || d === 'right' || d === 'up' || d === 'down') {
          setSel((s) => (s === 'continue' ? 'new' : 'continue'))
          sfx.move()
        }
      },
      onConfirm: () => pick(sel),
      onBack: () => pick('cancel')
    },
    { modal: true }
  )

  const title = splitTitle(game.name)
  return (
    <div className="rd-back" style={{ ['--accent' as string]: color }} onClick={(e) => e.target === e.currentTarget && pick('cancel')}>
      <div className="rd">
        <div className="rd-top">
          <span className="rd-ic">💾</span>
          <span>{t('SALVATAGGIO TROVATO')}</span>
        </div>
        <div className="rd-game">{title.main}</div>
        <div className="rd-sys">
          {systemName} · {t('salvato il {d}', { d: formatDate(time) })}
        </div>
        <div className="rd-choices">
          <button className={`rd-btn ${sel === 'continue' ? 'on' : ''}`} onMouseEnter={() => setSel('continue')} onClick={() => pick('continue')}>
            <b>{t('▶ CONTINUA')}</b>
            <small>{t('Riparti esattamente da dove avevi lasciato')}</small>
          </button>
          <button className={`rd-btn ${sel === 'new' ? 'on' : ''}`} onMouseEnter={() => setSel('new')} onClick={() => pick('new')}>
            <b>{t('✦ NUOVA PARTITA')}</b>
            <small>{t('Il salvataggio attuale resta come copia di sicurezza')}</small>
          </button>
        </div>
        <div className="rd-hint">{t('◀ ▶ SCEGLI · INVIO CONFERMA · ESC ANNULLA')}</div>
      </div>
    </div>
  )
}
