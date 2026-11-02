import { useEffect, useRef } from 'react'

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface InputHandlers {
  onMove?: (dir: Dir) => void
  onConfirm?: () => void
  onBack?: () => void
  onMenu?: () => void
  /** Salto di pagina: tasti PageUp/PageDown o pulsanti dorsali del pad (LB/RB) */
  onPage?: (dir: -1 | 1) => void
}

const REPEAT_FIRST = 380
const REPEAT_NEXT = 110
const DEADZONE = 0.55

/**
 * Input unico per tutto il programma: tastiera, gamepad (qualunque pad HID/XInput)
 * ed encoder arcade (che si presentano come tastiera o joystick).
 */
let modalOpen = false
/** Mentre una finestra modale è aperta, solo i suoi comandi funzionano */
export function setModalOpen(open: boolean): void {
  modalOpen = open
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
      if (byCode[e.code]) {
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
      if (!down) {
        held.delete(key)
        return
      }
      const st = held.get(key)
      if (!st) {
        held.set(key, { since: now, last: now, n: 0 })
        fire()
      } else if (now - st.since > REPEAT_FIRST && now - st.last > REPEAT_NEXT) {
        st.last = now
        st.n++
        fire()
        // tenendo premuto a lungo, la lista scorre sempre più veloce (utile con migliaia di titoli)
        if (accel && st.n > 10) {
          fire()
          fire()
          if (st.n > 25) for (let i = 0; i < 6; i++) fire()
        }
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
