import { useEffect, useRef } from 'react'

export type Dir = 'up' | 'down' | 'left' | 'right'

export interface InputHandlers {
  onMove?: (dir: Dir) => void
  onConfirm?: () => void
  onBack?: () => void
  onMenu?: () => void
}

const REPEAT_FIRST = 380
const REPEAT_NEXT = 110
const DEADZONE = 0.55

/**
 * Input unico per tutto il programma: tastiera, gamepad (qualunque pad HID/XInput)
 * ed encoder arcade (che si presentano come tastiera o joystick).
 */
export function useInput(handlers: InputHandlers): void {
  const ref = useRef(handlers)
  ref.current = handlers

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      const h = ref.current
      const map: Record<string, () => void> = {
        ArrowUp: () => h.onMove?.('up'),
        ArrowDown: () => h.onMove?.('down'),
        ArrowLeft: () => h.onMove?.('left'),
        ArrowRight: () => h.onMove?.('right'),
        Enter: () => h.onConfirm?.(),
        ' ': () => h.onConfirm?.(),
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
    const held = new Map<string, { since: number; last: number }>()
    let raf = 0

    const press = (key: string, down: boolean, now: number, fire: () => void): void => {
      if (!down) {
        held.delete(key)
        return
      }
      const st = held.get(key)
      if (!st) {
        held.set(key, { since: now, last: now })
        fire()
      } else if (now - st.since > REPEAT_FIRST && now - st.last > REPEAT_NEXT) {
        st.last = now
        fire()
      }
    }

    const tick = (now: number): void => {
      const h = ref.current
      for (const pad of navigator.getGamepads()) {
        if (!pad) continue
        const b = pad.buttons
        const ax = pad.axes[0] ?? 0
        const ay = pad.axes[1] ?? 0
        const id = pad.index
        press(`${id}u`, !!b[12]?.pressed || ay < -DEADZONE, now, () => h.onMove?.('up'))
        press(`${id}d`, !!b[13]?.pressed || ay > DEADZONE, now, () => h.onMove?.('down'))
        press(`${id}l`, !!b[14]?.pressed || ax < -DEADZONE, now, () => h.onMove?.('left'))
        press(`${id}r`, !!b[15]?.pressed || ax > DEADZONE, now, () => h.onMove?.('right'))
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
