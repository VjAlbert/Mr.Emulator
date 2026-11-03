import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActionId, Binding, CustomControls, PlayerControls } from '@shared/types'
import { ACTIONS, codeToRetro, prettyKey } from '@shared/keys'
import { setModalOpen } from '../hooks/useInput'
import { sfx } from '../sound'

interface Props {
  start: CustomControls
  presets: { laptop: CustomControls; cabinet: CustomControls }
  onSave: (c: CustomControls) => void
  onCancel: () => void
}

const DIRS: ActionId[] = ['up', 'down', 'left', 'right']

const label = (b: Binding | undefined): string => {
  if (!b) return '—'
  const p: string[] = []
  if (b.key) p.push(prettyKey(b.key))
  if (b.btn !== undefined) p.push(`Pad ${b.btn + 1}`)
  if (b.axis) p.push(`Asse ${b.axis[1]} ${b.axis[0] === '-' ? '−' : '+'}`)
  return p.length ? p.join(' / ') : '—'
}
const sig = (b: Binding | undefined): string => (b ? `${b.key ?? ''}|${b.btn ?? ''}|${b.axis ?? ''}` : '')
const empty = (b: Binding | undefined): boolean => !b || (b.key === undefined && b.btn === undefined && !b.axis)

/** Assegnazione manuale dei pulsanti: si sceglie l'azione, si preme il tasto (o il pulsante del pad / encoder) e il programma lo memorizza */
export default function ControlsEditor({ start, presets, onSave, onCancel }: Props): React.JSX.Element {
  const [draft, setDraft] = useState<CustomControls>(() => JSON.parse(JSON.stringify(start)))
  const [player, setPlayer] = useState<'p1' | 'p2'>('p1')
  const [listening, setListening] = useState<ActionId | null>(null)
  const [sequence, setSequence] = useState(false)
  const [note, setNote] = useState('')
  const draftRef = useRef(draft)
  draftRef.current = draft

  // mentre si assegna, i comandi del programma sono sospesi (altrimenti Invio e le frecce farebbero altro)
  useEffect(() => {
    setModalOpen(true)
    return () => setModalOpen(false)
  }, [])

  const assign = useCallback(
    (action: ActionId, b: Binding) => {
      setDraft((d) => ({ ...d, [player]: { ...d[player], [action]: b } }))
      sfx.confirm()
      if (sequence) {
        const i = ACTIONS.findIndex((a) => a.id === action)
        const next = ACTIONS[i + 1]
        window.setTimeout(() => (next ? setListening(next.id) : (setListening(null), setSequence(false))), 280)
        setListening(null)
      } else setListening(null)
    },
    [player, sequence]
  )

  useEffect(() => {
    if (!listening) return
    setNote('')
    const onKey = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape') {
        setListening(null)
        setSequence(false)
        setNote('Annullato (Esc non si può assegnare: serve per annullare).')
        return
      }
      const key = codeToRetro(e.code)
      if (!key) {
        setNote(`Il tasto "${e.key}" non si può assegnare: prova un altro.`)
        return
      }
      assign(listening, { key })
    }
    window.addEventListener('keydown', onKey, true)

    // pad ed encoder che si presentano come pad: si ignora ciò che è già premuto all'inizio
    const base = new Map<number, { b: boolean[]; a: number[] }>()
    for (const pad of navigator.getGamepads()) if (pad) base.set(pad.index, { b: pad.buttons.map((x) => x.pressed), a: [...pad.axes] })
    let raf = 0
    const poll = (): void => {
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue
        const ref = base.get(pad.index) ?? { b: [], a: [] }
        for (let i = 0; i < pad.buttons.length; i++) {
          const down = pad.buttons[i].pressed
          if (down && !ref.b[i]) return assign(listening, { btn: i })
          if (!down) ref.b[i] = false
        }
        if (DIRS.includes(listening)) {
          for (let i = 0; i < pad.axes.length; i++) {
            const v = pad.axes[i]
            if (Math.abs(v) > 0.7 && Math.abs(ref.a[i] ?? 0) < 0.4) return assign(listening, { axis: `${v > 0 ? '+' : '-'}${i}` })
            if (Math.abs(v) < 0.3) ref.a[i] = v
          }
        }
      }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      cancelAnimationFrame(raf)
    }
  }, [listening, assign])

  const pc: PlayerControls = draft[player]
  // stesso collegamento usato due volte dallo stesso giocatore
  const counts = new Map<string, number>()
  for (const a of ACTIONS) if (!empty(pc[a.id])) counts.set(sig(pc[a.id]), (counts.get(sig(pc[a.id])) ?? 0) + 1)
  const conflicts = [...counts.values()].filter((n) => n > 1).length
  const missing = ACTIONS.filter((a) => empty(pc[a.id])).length

  return (
    <div className="ce-back" onClick={(e) => e.target === e.currentTarget && !listening && onCancel()}>
      <div className="ce">
        <h3>Assegna i pulsanti</h3>
        <p className="hint">
          Scegli un&apos;azione e premi il tasto (o il pulsante del pad / dell&apos;encoder) che vuoi usare. Con &quot;Assegna in sequenza&quot; il programma te li chiede uno dopo l&apos;altro. Esc annulla.
        </p>
        <div className="seg">
          <button className={player === 'p1' ? 'on' : ''} onClick={() => !listening && setPlayer('p1')}>GIOCATORE 1</button>
          <button className={player === 'p2' ? 'on' : ''} onClick={() => !listening && setPlayer('p2')}>GIOCATORE 2</button>
        </div>
        <div className="ce-grid">
          {ACTIONS.map((a) => {
            const dup = !empty(pc[a.id]) && (counts.get(sig(pc[a.id])) ?? 0) > 1
            return (
              <button
                key={a.id}
                className={`ce-row ${listening === a.id ? 'listen' : ''} ${dup ? 'dup' : ''} ${empty(pc[a.id]) ? 'none' : ''}`}
                onClick={() => {
                  setSequence(false)
                  setListening(a.id)
                }}
              >
                <span>{a.label}</span>
                <kbd>{listening === a.id ? 'PREMI ORA…' : label(pc[a.id])}</kbd>
                <i
                  title="Cancella"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDraft((d) => ({ ...d, [player]: { ...d[player], [a.id]: {} } }))
                  }}
                >
                  ✕
                </i>
              </button>
            )
          })}
        </div>
        <p className={`ce-note ${conflicts || missing ? 'warn' : ''}`}>
          {note ||
            (conflicts
              ? '⚠ Lo stesso tasto è usato per due azioni: cambialo.'
              : missing
                ? `${missing} azioni senza assegnazione (per i giochi a 1 giocatore va bene lasciare vuoto il giocatore 2).`
                : '✔ Tutto assegnato.')}
        </p>
        <div className="field-row">
          <button className="chip" onClick={() => { setSequence(true); setListening(ACTIONS[0].id) }}>▶ ASSEGNA IN SEQUENZA</button>
          <button className="chip" onClick={() => setDraft(JSON.parse(JSON.stringify(presets.laptop)))}>PARTI DAL PORTATILE</button>
          <button className="chip" onClick={() => setDraft(JSON.parse(JSON.stringify(presets.cabinet)))}>PARTI DAL CABINATO</button>
        </div>
        <div className="field-row">
          <button className="chip save" disabled={conflicts > 0} onClick={() => onSave(draft)}>💾 SALVA E USA</button>
          <button className="chip" onClick={onCancel}>ANNULLA</button>
        </div>
      </div>
    </div>
  )
}
