import { useEffect, useState } from 'react'
import type { Feedback, GameEnded } from '@shared/types'
import { setModalOpen, useInput } from '../hooks/useInput'

interface Props {
  ended: GameEnded
  onAnswer: (a: Feedback) => void
  onSkip: () => void
}

const CHOICES: Array<{ key: Feedback; icon: string; label: string; hint: string }> = [
  { key: 'ok', icon: '👍', label: 'PERFETTO', hint: 'Va tutto bene così' },
  { key: 'slow', icon: '🐢', label: 'A SCATTI', hint: 'Abbassa la qualità' },
  { key: 'better', icon: '✨', label: 'PIÙ QUALITÀ', hint: 'Il PC regge, alza gli effetti' }
]

/** Domanda dopo la partita: le risposte regolano il livello di qualità di quel sistema */
export default function FeedbackPrompt({ ended, onAnswer, onSkip }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    setModalOpen(true)
    return () => setModalOpen(false)
  }, [])

  const answer = (a: Feedback): void => {
    if (done) return
    const msg = a === 'slow' ? 'Ricevuto: la prossima volta uso meno effetti.' : a === 'better' ? 'Ricevuto: la prossima volta alzo la qualità.' : 'Perfetto, lascio tutto com’è.'
    setDone(msg)
    onAnswer(a)
    window.setTimeout(onSkip, 1400)
  }

  useInput(
    {
      onMove: (d) => setIndex((i) => (d === 'left' ? Math.max(0, i - 1) : d === 'right' ? Math.min(CHOICES.length - 1, i + 1) : i)),
      onConfirm: () => answer(CHOICES[index].key),
      onBack: onSkip
    },
    { modal: true }
  )

  return (
    <div className="modal">
      <div className="modal-box">
        <div className="modal-title">COM'È ANDATA?</div>
        <div className="modal-sub">
          {ended.gameName} · {ended.systemName}
        </div>
        {done ? (
          <div className="modal-done">{done}</div>
        ) : (
          <>
            <div className="choices">
              {CHOICES.map((c, i) => (
                <button key={c.key} className={`choice ${i === index ? 'active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => answer(c.key)}>
                  <span className="choice-icon">{c.icon}</span>
                  <span className="choice-label">{c.label}</span>
                  <span className="choice-hint">{c.hint}</span>
                </button>
              ))}
            </div>
            <div className="modal-note">Così Mr. Emulator impara cosa regge il tuo PC per {ended.systemName}. (ESC per saltare)</div>
          </>
        )}
      </div>
    </div>
  )
}
