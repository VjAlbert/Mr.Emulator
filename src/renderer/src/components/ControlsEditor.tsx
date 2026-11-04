import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActionId, Binding, CustomControls, PlayerControls } from '@shared/types'
import { ACTIONS, PAD_HINT, codeToRetro, hatFromAxes, prettyKey } from '@shared/keys'
import { setModalOpen } from '../hooks/useInput'
import { sfx } from '../sound'
import { t } from '../i18n'

interface Props {
  start: CustomControls
  presets: { laptop: CustomControls; cabinet: CustomControls }
  onSave: (c: CustomControls) => void
  onCancel: () => void
}

const DIRS: ActionId[] = ['up', 'down', 'left', 'right']
/** Azioni che si possono assegnare anche a un asse (le direzioni e i grilletti L2 / R2) */
const AXIS_OK: ActionId[] = [...DIRS, 'l2', 'r2']

const label = (b: Binding | undefined): string => {
  if (!b) return '—'
  const p: string[] = []
  if (b.key) p.push(prettyKey(b.key))
  if (b.btn !== undefined) p.push(`Pad ${b.btn + 1}`)
  if (b.axis) p.push(`Asse ${b.axis[1]} ${b.axis[0] === '-' ? '−' : '+'}`)
  if (b.hat) p.push(`Croce ${{ up: '↑', down: '↓', left: '←', right: '→' }[b.hat]}`)
  return p.length ? p.join(' / ') : '—'
}
const sig = (b: Binding | undefined): string => (b ? `${b.key ?? ''}|${b.btn ?? ''}|${b.axis ?? ''}|${b.hat ?? ''}` : '')
const empty = (b: Binding | undefined): boolean => !b || (b.key === undefined && b.btn === undefined && !b.axis && !b.hat)

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
        setNote(t('Annullato (Esc non si può assegnare: serve per annullare).'))
        return
      }
      const key = codeToRetro(e.code)
      if (!key) {
        setNote(t('Il tasto "{k}" non si può assegnare: prova un altro.', { k: e.key }))
        return
      }
      assign(listening, { key })
    }
    window.addEventListener('keydown', onKey, true)

    // pad ed encoder che si presentano come pad: si ignora ciò che è già premuto all'inizio
    const base = new Map<number, { b: boolean[]; a: number[]; hatRest: boolean }>()
    for (const pad of navigator.getGamepads()) if (pad) base.set(pad.index, { b: pad.buttons.map((x) => x.pressed), a: [...pad.axes], hatRest: !(hatFromAxes(pad.axes) && hatFromAxes(pad.axes) !== 'rest') })
    let raf = 0
    const poll = (): void => {
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue
        const ref = base.get(pad.index) ?? { b: [], a: [], hatRest: true }
        for (let i = 0; i < pad.buttons.length; i++) {
          const down = pad.buttons[i].pressed
          if (down && !ref.b[i]) return assign(listening, { btn: i })
          if (!down) ref.b[i] = false
        }
        // croce direzionale presentata come "hat" (molti pad non Xbox, per esempio i cloni del pad PS3)
        const hat = hatFromAxes(pad.axes)
        if (DIRS.includes(listening) && hat && hat !== 'rest' && ref.hatRest) return assign(listening, { hat })
        if (hat === 'rest') ref.hatRest = true // si assegna solo dopo che la croce è tornata a riposo
        if (AXIS_OK.includes(listening)) {
          for (let i = 0; i < pad.axes.length; i++) {
            if (i === 9 && hat !== null) continue // quell'asse è la croce, già gestita qui sopra
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
        <h3>{t('Assegna i pulsanti')}</h3>
        <p className="hint">
          {t('Scegli un\'azione e premi il tasto (o il pulsante del pad / dell\'encoder) che vuoi usare. Con "Assegna in sequenza" il programma te li chiede uno dopo l\'altro. Esc annulla.')}
        </p>
        <div className="seg">
          <button className={player === 'p1' ? 'on' : ''} onClick={() => !listening && setPlayer('p1')}>{t('GIOCATORE 1')}</button>
          <button className={player === 'p2' ? 'on' : ''} onClick={() => !listening && setPlayer('p2')}>{t('GIOCATORE 2')}</button>
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
                <span>
                  {t(a.label)}
                  {PAD_HINT[a.id] && <em className="ce-h">{PAD_HINT[a.id]}</em>}
                </span>
                <kbd>{listening === a.id ? t('PREMI ORA…') : label(pc[a.id])}</kbd>
                <i
                  title={t('Cancella')}
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
        {navigator.getGamepads().some((g) => g?.mapping === 'standard') && (
          <p className="hint">{t('Il pad collegato è riconosciuto come standard (Xbox e simili): RetroArch lo configura da solo. L\'assegnazione manuale serve per i pad non riconosciuti.')}</p>
        )}
        <p className={`ce-note ${conflicts || missing ? 'warn' : ''}`}>
          {note ||
            (conflicts
              ? t('⚠ Lo stesso tasto è usato per due azioni: cambialo.')
              : missing
                ? t('{n} azioni senza assegnazione (per i giochi a 1 giocatore va bene lasciare vuoto il giocatore 2).', { n: missing })
                : t('✔ Tutto assegnato.'))}
        </p>
        <div className="field-row">
          <button className="chip" onClick={() => { setSequence(true); setListening(ACTIONS[0].id) }}>{t('▶ ASSEGNA IN SEQUENZA')}</button>
          <button className="chip" onClick={() => setDraft(JSON.parse(JSON.stringify(presets.laptop)))}>{t('PARTI DAL PORTATILE')}</button>
          <button className="chip" onClick={() => setDraft(JSON.parse(JSON.stringify(presets.cabinet)))}>{t('PARTI DAL CABINATO')}</button>
        </div>
        <div className="field-row">
          <button className="chip save" disabled={conflicts > 0} onClick={() => onSave(draft)}>{t('💾 SALVA E USA')}</button>
          <button className="chip" onClick={onCancel}>{t('ANNULLA')}</button>
        </div>
      </div>
    </div>
  )
}
