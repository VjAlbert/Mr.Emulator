import { useEffect, useRef } from 'react'
import type { CustomControls } from '@shared/types'
import { retroToCode } from '@shared/keys'

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface InputHandlers {
  onMove?: (dir: Dir) => void
  onConfirm?: () => void
  onBack?: () => void
  onMenu?: () => void
  /** Salto di pagina: tasti PageUp/PageDown o pulsanti dorsali del pad (LB/RB) */
  onPage?: (dir: -1 | 1) => void
  /** Apre la ricerca: pulsante superiore sinistro del pad (Y / X) */
  onSearch?: () => void
  /** Azione secondaria: X del pad o F2 (preferito nella lista, cambio tastiera nella ricerca) */
  onAlt?: () => void
  /** Colonna sonora: pausa / riprendi o avvia (Select del pad, F3) */
  onMusic?: () => void
}

const REPEAT_FIRST = 380
const REPEAT_NEXT = 110

/**
 * Intervallo tra due ripetizioni tenendo premuto. Per le liste (su/giù) accelera gradualmente
 * (110 ms, poi 70, poi 45), sempre di UNA riga alla volta: così si può rilasciare e fermarsi dove si vuole.
 */
const repeatEvery = (held: number, accel: boolean): number => (!accel ? REPEAT_NEXT : held < 900 ? REPEAT_NEXT : held < 1800 ? 70 : 45)
const DEADZONE = 0.55

/**
 * Input unico per tutto il programma: tastiera, gamepad (qualunque pad HID/XInput)
 * ed encoder arcade (che si presentano come tastiera o joystick).
 */
let modalOpen = false
/** I tasti del pannello arcade (Ctrl, Alt, 1, 5…) valgono solo con lo schema "cabinato": sul portatile Ctrl e Alt servono per le scorciatoie */
let cabinetKeys = false
export function setCabinetKeys(on: boolean): void {
  cabinetKeys = on
}
/** Tasti scelti dall'utente (comandi manuali): codice del tasto -> cosa fa nel menu del launcher */
let customCodes: Record<string, 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'menu'> | null = null
export function setCustomKeys(c: CustomControls | null): void {
  if (!c) {
    customCodes = null
    return
  }
  const m: NonNullable<typeof customCodes> = {}
  for (const pc of [c.p2, c.p1]) {
    const add = (k: string | undefined, a: NonNullable<typeof customCodes>[string]): void => {
      const code = k ? retroToCode(k) : null
      if (code) m[code] = a
    }
    add(pc.up?.key, 'up')
    add(pc.down?.key, 'down')
    add(pc.left?.key, 'left')
    add(pc.right?.key, 'right')
    add(pc.b1?.key, 'confirm')
    add(pc.start?.key, 'confirm')
    add(pc.b2?.key, 'back')
    add(pc.select?.key, 'menu')
  }
  customCodes = m
}
/** Vero se è aperta una finestra che si prende tutti i comandi (ricerca, domanda dopo il gioco…) */
export const isModalOpen = (): boolean => modalOpen
/** Pulsanti del pad già premuti quando una finestra si apre o si chiude: vanno ignorati finché non vengono rilasciati */
const blocked = new Set<string>()

/** Stato dei pulsanti di un pad, per nome (su, giù, sinistra, destra, ricerca, pagine, A, B, Start) */
function padState(pad: Gamepad): Record<string, boolean> {
  const b = pad.buttons
  const ax = pad.axes[0] ?? 0
  const ay = pad.axes[1] ?? 0
  return {
    u: !!b[12]?.pressed || ay < -DEADZONE,
    d: !!b[13]?.pressed || ay > DEADZONE,
    l: !!b[14]?.pressed || ax < -DEADZONE,
    r: !!b[15]?.pressed || ax > DEADZONE,
    se: !!b[3]?.pressed,
    x: !!b[2]?.pressed,
    sel: !!b[8]?.pressed,
    pl: !!b[4]?.pressed,
    pr: !!b[5]?.pressed,
    a: !!b[0]?.pressed,
    b: !!b[1]?.pressed,
    s: !!b[9]?.pressed
  }
}

/** Mentre una finestra modale è aperta, solo i suoi comandi funzionano */
export function setModalOpen(open: boolean): void {
  modalOpen = open
  // il pulsante che ha aperto o chiuso la finestra è ancora giù: non deve valere anche per la schermata sotto
  for (const pad of navigator.getGamepads()) {
    if (!pad) continue
    for (const [k, v] of Object.entries(padState(pad))) if (v) blocked.add(`${pad.index}${k}`)
  }
}

export function useInput(handlers: InputHandlers, opts: { modal?: boolean; keyboard?: boolean } = {}): void {
  const ref = useRef(handlers)
  ref.current = handlers
  const modal = useRef(!!opts.modal)
  modal.current = !!opts.modal
  const kbd = useRef(opts.keyboard !== false)
  kbd.current = opts.keyboard !== false

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!kbd.current || (modalOpen && !modal.current)) return
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const h = ref.current
      // pannello arcade (I-PAC): pulsante 1 = conferma, pulsante 2 = indietro, Start 1 = conferma, Moneta 1 = menu
      const byCode: Record<string, () => void> = {
        ControlLeft: () => h.onConfirm?.(),
        AltLeft: () => h.onBack?.(),
        Digit1: () => h.onConfirm?.(),
        Digit5: () => h.onMenu?.()
      }
      const mine = customCodes?.[e.code]
      if (mine) {
        e.preventDefault()
        if (mine === 'confirm') h.onConfirm?.()
        else if (mine === 'back') h.onBack?.()
        else if (mine === 'menu') h.onMenu?.()
        else h.onMove?.(mine)
        return
      }
      if (cabinetKeys && byCode[e.code]) {
        e.preventDefault()
        byCode[e.code]()
        return
      }
      const map: Record<string, () => void> = {
        ArrowUp: () => h.onMove?.('up'),
        ArrowDown: () => h.onMove?.('down'),
        ArrowLeft: () => h.onMove?.('left'),
        ArrowRight: () => h.onMove?.('right'),
        Enter: () => h.onConfirm?.(),
        ' ': () => h.onConfirm?.(),
        F2: () => h.onAlt?.(),
        F3: () => h.onMusic?.(),
        PageUp: () => h.onPage?.(-1),
        PageDown: () => h.onPage?.(1),
        Escape: () => h.onBack?.(),
        Backspace: () => h.onBack?.(),
        Tab: () => h.onMenu?.()
      }
      const fn = map[e.key]
      if (fn) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', onKey)

    // Gamepad: polling con ripetizione per i tasti tenuti premuti
    const held = new Map<string, { since: number; last: number; n: number }>()
    let raf = 0

    const press = (key: string, down: boolean, now: number, fire: () => void, accel = false): void => {
      if (blocked.has(key)) {
        if (!down) blocked.delete(key)
        held.delete(key)
        return
      }
      if (!down) {
        held.delete(key)
        return
      }
      const st = held.get(key)
      if (!st) {
        held.set(key, { since: now, last: now, n: 0 })
        fire()
      } else if (now - st.since > REPEAT_FIRST && now - st.last > repeatEvery(now - st.since, accel)) {
        st.last = now
        fire()
      }
    }

    const tick = (now: number): void => {
      const h = ref.current
      if (modalOpen && !modal.current) {
        raf = requestAnimationFrame(tick)
        return
      }
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue
        const b = pad.buttons
        const ax = pad.axes[0] ?? 0
        const ay = pad.axes[1] ?? 0
        const id = pad.index
        press(`${id}u`, !!b[12]?.pressed || ay < -DEADZONE, now, () => h.onMove?.('up'), true)
        press(`${id}d`, !!b[13]?.pressed || ay > DEADZONE, now, () => h.onMove?.('down'), true)
        press(`${id}l`, !!b[14]?.pressed || ax < -DEADZONE, now, () => h.onMove?.('left'))
        press(`${id}r`, !!b[15]?.pressed || ax > DEADZONE, now, () => h.onMove?.('right'))
        press(`${id}se`, !!b[3]?.pressed, now, () => h.onSearch?.())
        press(`${id}x`, !!b[2]?.pressed, now, () => h.onAlt?.())
        press(`${id}sel`, !!b[8]?.pressed, now, () => h.onMusic?.())
        press(`${id}pl`, !!b[4]?.pressed, now, () => h.onPage?.(-1))
        press(`${id}pr`, !!b[5]?.pressed, now, () => h.onPage?.(1))
        press(`${id}a`, !!b[0]?.pressed, now, () => h.onConfirm?.())
        press(`${id}b`, !!b[1]?.pressed, now, () => h.onBack?.())
        press(`${id}s`, !!b[9]?.pressed, now, () => h.onMenu?.())
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('keydown', onKey)
      cancelAnimationFrame(raf)
    }
  }, [])
}
