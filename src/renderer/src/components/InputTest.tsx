import { useCallback, useEffect, useRef, useState } from 'react'
import type { ArcadeLayout, InputMapReport, InputScheme, Settings } from '@shared/types'
import { useInput } from '../hooks/useInput'
import Orbs from './Orbs'
import ControlsEditor from './ControlsEditor'
import type { CustomControls } from '@shared/types'
import { t } from '../i18n'

/** Da tasto fisico (event.code) al nome usato da RetroArch */
function codeToKey(code: string): string {
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1].toLowerCase()
  const digit = /^Digit(\d)$/.exec(code)
  if (digit) return `num${digit[1]}`
  const pad = /^Numpad(\d)$/.exec(code)
  if (pad) return `keypad${pad[1]}`
  const fixed: Record<string, string> = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', ControlLeft: 'lctrl', ControlRight: 'rctrl',
    AltLeft: 'lalt', AltRight: 'ralt', ShiftLeft: 'lshift', ShiftRight: 'rshift', Space: 'space', Enter: 'enter',
    NumpadEnter: 'kp_enter', Escape: 'escape'
  }
  return fixed[code] ?? code.toLowerCase()
}

interface PadState {
  index: number
  id: string
  pressed: number[]
  buttons: number
}

function Seg<T extends string>(props: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }): React.JSX.Element {
  return (
    <div className="seg">
      {props.options.map(([v, label]) => (
        <button key={v} className={props.value === v ? 'on' : ''} onClick={() => props.onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function InputTest({ onBack, onChanged }: { onBack: () => void; onChanged: (s: Settings) => void }): React.JSX.Element {
  const [map, setMap] = useState<InputMapReport | null>(null)
  const [s, setS] = useState<Settings | null>(null)
  const [down, setDown] = useState<Set<string>>(new Set())
  const [last, setLast] = useState<string>('')
  const [pads, setPads] = useState<PadState[]>([])
  const bodyRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<{ start: CustomControls; presets: { laptop: CustomControls; cabinet: CustomControls } } | null>(null)

  const load = useCallback(async () => {
    const [m, st] = await Promise.all([window.mr.getInputMap(), window.mr.getSettings()])
    setMap(m)
    setS(st)
  }, [])
  useEffect(() => {
    load()
  }, [load])

  // tasti premuti in tempo reale (tastiera o encoder che si presenta come tastiera)
  useEffect(() => {
    let lastEsc = 0
    const kd = (e: KeyboardEvent): void => {
      e.preventDefault()
      const k = codeToKey(e.code)
      if (k === 'escape') {
        if (Date.now() - lastEsc < 900) onBack()
        lastEsc = Date.now()
      }
      setLast(k)
      setDown((d) => new Set(d).add(k))
    }
    const ku = (e: KeyboardEvent): void => {
      const k = codeToKey(e.code)
      setDown((d) => {
        const n = new Set(d)
        n.delete(k)
        return n
      })
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [onBack])

  // pad collegati (compaiono dopo aver premuto un pulsante: è una regola del browser)
  useEffect(() => {
    let raf = 0
    let prev = ''
    const tick = (): void => {
      const list: PadState[] = []
      for (const g of navigator.getGamepads()) {
        if (!g) continue
        const pressed: number[] = []
        g.buttons.forEach((b, i) => b.pressed && pressed.push(i))
        if (g.axes[0] < -0.5) pressed.push(100)
        if (g.axes[0] > 0.5) pressed.push(101)
        if (g.axes[1] < -0.5) pressed.push(102)
        if (g.axes[1] > 0.5) pressed.push(103)
        list.push({ index: g.index, id: g.id, pressed, buttons: g.buttons.length })
      }
      const sig = JSON.stringify(list)
      if (sig !== prev) {
        prev = sig
        setPads(list)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  // qui la tastiera serve solo a provare i tasti: si esce con il pulsante, con il pad (B) o premendo Esc due volte
  useInput(
    {
      onBack,
      onMove: (d) => {
        if (d === 'up' || d === 'down') bodyRef.current?.scrollBy({ top: d === 'up' ? -160 : 160, behavior: 'smooth' })
      }
    },
    { keyboard: false }
  )

  const patch = async (p: Partial<Settings>): Promise<void> => {
    if (!s) return
    const next = await window.mr.saveSettings({ ...s, ...p })
    setS(next)
    onChanged(next)
    setMap(await window.mr.getInputMap())
  }

  const openEditor = async (): Promise<void> => {
    if (!s) return
    const presets = await window.mr.getControlPresets()
    // si parte dai comandi personalizzati già salvati, altrimenti da una copia dello schema in uso
    setEditor({ start: s.customControls ?? (s.inputScheme === 'laptop' ? presets.laptop : presets.cabinet), presets })
  }

  if (!map || !s) return <div className="loading">{t('Caricamento…')}</div>

  return (
    <div className="screen report" style={{ ['--accent' as string]: '#ff6a00' }}>
      <Orbs />
      <header className="topbar">
        <button className="chip" onClick={onBack}>
          {t('◀ INDIETRO')}
        </button>
        <h2 className="sys-title">{t('Comandi')}</h2>
        <span className="counter">{last ? `ultimo tasto: ${last}` : t('premi un tasto per provare · Esc due volte per uscire')}</span>
      </header>

      <div className="report-body" ref={bodyRef}>
        <section className="card wide">
          <h3>{t('Che comandi usi?')}</h3>
          <Seg<InputScheme>
            value={s.inputScheme}
            options={[['laptop', t('TASTIERA DEL PORTATILE')], ['cabinet', t('PANNELLO ARCADE (I-PAC)')], ['custom', t('PERSONALIZZATI')]]}
            onChange={(v) => (v === 'custom' && !s.customControls ? openEditor() : patch({ inputScheme: v }))}
          />
          <div className="opt-row">
            <span>{t('Sistema Arcade: disposizione a 6 pulsanti')}</span>
            <Seg<ArcadeLayout>
              value={s.arcadeLayout}
              options={[['standard', t('STANDARD (1-6 IN ORDINE)')], ['capcom', t('CAPCOM (PUGNI / CALCI)')]]}
              onChange={(v) => patch({ arcadeLayout: v })}
            />
          </div>
          <p className="hint">
            {s.inputScheme === 'laptop'
              ? t('Giocatore 1: WASD per muoversi, J K L U I O per i pulsanti. Giocatore 2: frecce e tastierino numerico.')
              : s.inputScheme === 'cabinet'
                ? t('Preset standard degli encoder I-PAC (gli stessi tasti di MAME). Si esce da un gioco tenendo premuta Moneta 1 e premendo Start 1.')
                : t('Comandi assegnati da te (tastiera, pad o encoder). Si esce da un gioco tenendo premuta Moneta 1 e premendo Start 1.')}
          </p>
          <div className="field-row">
            <button className="chip" onClick={openEditor}>{t('🎛 ASSEGNA I PULSANTI A MANO')}</button>
            {s.inputScheme === 'custom' && (
              <button className="chip" onClick={() => patch({ inputScheme: 'cabinet' })}>{t('↩ TORNA AL PRESET AUTOMATICO')}</button>
            )}
          </div>
        </section>

        <section className="card wide">
          <h3>{t('Uscire dal gioco e aprire il menu')}</h3>
          <p className="hint">{t('Mentre giochi non serve la tastiera: queste combinazioni funzionano con il joypad e con il pannello arcade.')}</p>
          <div className="opt-row">
            <span>{t('Joypad: per uscire dal gioco')}</span>
            <select value={s.padExit} onChange={(e) => patch({ padExit: e.target.value as Settings['padExit'] })}>
              <option value="start-select">{t('Select + Start (consigliata)')}</option>
              <option value="hold-select">{t('Tieni premuto Select per 2 secondi (evita uscite accidentali)')}</option>
              <option value="l3-r3">{t('L3 + R3 (premi le due leve)')}</option>
              <option value="none">{t('Nessuna')}</option>
            </select>
          </div>
          <div className="opt-row">
            <span>{t('Joypad: per aprire il menu del gioco')}</span>
            <select value={s.padMenu} onChange={(e) => patch({ padMenu: e.target.value as Settings['padMenu'] })}>
              <option value="hold-start">{t('Tieni premuto Start per 2 secondi (consigliata)')}</option>
              <option value="l3-r3">{t('L3 + R3 (premi le due leve)')}</option>
              <option value="l1-r1-start-select">{t('L1 + R1 + Start + Select')}</option>
              <option value="none">{t('Nessuna')}</option>
            </select>
          </div>
          <div className="keys exitmap">
            <div className="keyrow">
              <span>{t('Tastiera')}</span>
              <kbd>{t('Esc = esci · F1 = menu di RetroArch · Tab = menu di MAME')}</kbd>
            </div>
            <div className="keyrow">
              <span>{t('Pannello arcade (I-PAC)')}</span>
              <kbd>{t('Tieni Moneta 1 e premi Start 1 = esci · Tieni Moneta 1 e premi Pulsante 1 = menu del gioco')}</kbd>
            </div>
            <div className="keyrow">
              <span>{t('Joypad Xbox e simili')}</span>
              <kbd>
                {({ 'start-select': t('Select + Start = esci'), 'hold-select': t('tieni Select 2 secondi = esci'), 'l3-r3': t('L3 + R3 = esci'), none: t('uscita da joypad disattivata') } as const)[s.padExit]}
                {' · '}
                {({ 'hold-start': t('tieni Start 2 secondi = menu di RetroArch'), 'l3-r3': t('L3 + R3 = menu di RetroArch'), 'l1-r1-start-select': t('L1 + R1 + Start + Select = menu di RetroArch'), none: t('menu da joypad disattivato') } as const)[s.padMenu]}
              </kbd>
            </div>
            <div className="keyrow">
              <span>{t('Joypad in MAME')}</span>
              <kbd>{t('Select + Start = esci · Select + Pulsante 1 (A) = menu di MAME (DIP switch, comandi, reset)')}</kbd>
            </div>
          </div>
          <p className="hint">{t('Sul joypad Xbox: Select è il tasto Back (due rettangoli), Start è il tasto Menu (tre righe).')}</p>
        </section>

        {map.players.map((p) => (
          <section className="card" key={p.player}>
            <h3>{p.title}</h3>
            <div className="keys">
              {p.rows.map((r) => (
                <div key={r.action} className={`keyrow ${down.has(r.key) ? 'on' : ''}`}>
                  <span>{r.action}</span>
                  <kbd>{r.shown}</kbd>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="card wide">
          <h3>{t('Come si usano i pulsanti')}</h3>
          {map.layouts.map((l) => (
            <div key={l.title} className="layout">
              <b>{l.title}</b>
              <ul>
                {l.rows.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ))}
          {map.hotkeys.map((h) => (
            <div key={h.action} className={`keyrow ${down.has(h.key) ? 'on' : ''}`}>
              <span>{h.action}</span>
              <kbd>{h.shown}</kbd>
            </div>
          ))}
        </section>

        <section className="card wide">
          <h3>{t('Pad collegati')}</h3>
          {pads.length === 0 ? (
            <p className="hint">{t('Nessun pad rilevato. Collegalo e premi un suo pulsante: il browser lo mostra solo dopo la prima pressione.')}</p>
          ) : (
            pads.map((g) => (
              <div key={g.index} className="padbox">
                <div className="padname">{g.id}</div>
                <div className="padbtns">
                  {Array.from({ length: g.buttons }, (_, i) => (
                    <i key={i} className={g.pressed.includes(i) ? 'on' : ''}>
                      {i}
                    </i>
                  ))}
                  {[['←', 100], ['→', 101], ['↑', 102], ['↓', 103]].map(([l, n]) => (
                    <i key={String(n)} className={g.pressed.includes(n as number) ? 'on' : ''}>
                      {l}
                    </i>
                  ))}
                </div>
              </div>
            ))
          )}
          <p className="hint">{t('Per i pad più comuni (Xbox, PlayStation, 8BitDo) RetroArch riconosce i pulsanti da solo.')}</p>
        </section>
      </div>
      {editor && (
        <ControlsEditor
          start={editor.start}
          presets={editor.presets}
          onCancel={() => setEditor(null)}
          onSave={async (c) => {
            setEditor(null)
            await patch({ inputScheme: 'custom', customControls: c })
          }}
        />
      )}
    </div>
  )
}
