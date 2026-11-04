import type { ActionId } from './types'

/** Azioni assegnabili, nell'ordine in cui le chiede la procedura guidata */
export const ACTIONS: Array<{ id: ActionId; label: string }> = [
  { id: 'up', label: 'Su' },
  { id: 'down', label: 'Giù' },
  { id: 'left', label: 'Sinistra' },
  { id: 'right', label: 'Destra' },
  { id: 'b1', label: 'Pulsante 1' },
  { id: 'b2', label: 'Pulsante 2' },
  { id: 'b3', label: 'Pulsante 3' },
  { id: 'b4', label: 'Pulsante 4' },
  { id: 'b5', label: 'Pulsante 5' },
  { id: 'b6', label: 'Pulsante 6' },
  { id: 'l2', label: 'L2' },
  { id: 'r2', label: 'R2' },
  { id: 'l3', label: 'L3 (stick sinistro premuto)' },
  { id: 'r3', label: 'R3 (stick destro premuto)' },
  { id: 'start', label: 'Start' },
  { id: 'select', label: 'Moneta / Select' }
]

const FIXED: Record<string, string> = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Enter: 'enter', NumpadEnter: 'kp_enter', Space: 'space', Tab: 'tab', Backspace: 'backspace',
  ControlLeft: 'lctrl', ControlRight: 'rctrl', AltLeft: 'lalt', AltRight: 'ralt', ShiftLeft: 'lshift', ShiftRight: 'rshift',
  Insert: 'insert', Delete: 'del', Home: 'home', End: 'end', PageUp: 'pgup', PageDown: 'pgdown',
  Minus: 'minus', Equal: 'equals', Comma: 'comma', Period: 'period', Slash: 'slash', Semicolon: 'semicolon', Quote: 'quote',
  BracketLeft: 'leftbracket', BracketRight: 'rightbracket', Backslash: 'backslash', Backquote: 'tilde',
  NumpadAdd: 'add', NumpadSubtract: 'subtract', NumpadMultiply: 'multiply', NumpadDivide: 'divide', NumpadDecimal: 'period'
}

/** Tasto fisico del browser (KeyboardEvent.code) -> nome del tasto nel file di RetroArch; null = non assegnabile (Esc è riservato) */
export function codeToRetro(code: string): string | null {
  if (FIXED[code]) return FIXED[code]
  let m = /^Key([A-Z])$/.exec(code)
  if (m) return m[1].toLowerCase()
  m = /^Digit(\d)$/.exec(code)
  if (m) return `num${m[1]}`
  m = /^Numpad(\d)$/.exec(code)
  if (m) return `keypad${m[1]}`
  m = /^F(\d{1,2})$/.exec(code)
  if (m) return `f${m[1]}`
  return null
}

const REVERSE: Record<string, string> = {}
for (const [code, name] of Object.entries(FIXED)) if (!(name in REVERSE)) REVERSE[name] = code

/** Il contrario: serve al menu del launcher per riconoscere i tasti scelti dall'utente */
export function retroToCode(name: string): string | null {
  if (REVERSE[name]) return REVERSE[name]
  if (/^[a-z]$/.test(name)) return `Key${name.toUpperCase()}`
  let m = /^num(\d)$/.exec(name)
  if (m) return `Digit${m[1]}`
  m = /^keypad(\d)$/.exec(name)
  if (m) return `Numpad${m[1]}`
  m = /^f(\d{1,2})$/.exec(name)
  if (m) return `F${m[1]}`
  return null
}

const RETRO_LABEL: Record<string, string> = {
  up: '↑', down: '↓', left: '←', right: '→', space: 'Spazio', enter: 'Invio', kp_enter: 'Invio tastierino',
  lctrl: 'Ctrl sinistro', rctrl: 'Ctrl destro', lalt: 'Alt sinistro', ralt: 'Alt destro', lshift: 'Maiusc sinistro', rshift: 'Maiusc destro', escape: 'Esc'
}

export function prettyKey(key: string): string {
  if (RETRO_LABEL[key]) return RETRO_LABEL[key]
  const num = /^num(\d)$/.exec(key)
  if (num) return num[1]
  const pad = /^keypad(\d)$/.exec(key)
  if (pad) return `Tastierino ${pad[1]}`
  return key.length === 1 ? key.toUpperCase() : key
}


/** Nome dei pulsanti su un pad stile PlayStation (i pulsanti 1-6 corrispondono a B A Y X L R di RetroArch) */
export const PAD_HINT: Partial<Record<ActionId, string>> = {
  b1: '✕',
  b2: '○',
  b3: '□',
  b4: '△',
  b5: 'L1',
  b6: 'R1'
}

/**
 * Molti pad non Xbox (compresi i cloni del pad PS3) presentano la croce direzionale come un asse "hat"
 * (indice 9) con valori fissi: -1 su, -0,43 destra, 0,14 giù, 0,71 sinistra, 1,29 a riposo.
 */
export function hatFromAxes(axes: readonly number[]): 'up' | 'down' | 'left' | 'right' | null | 'rest' {
  if (axes.length < 10) return null
  const v = axes[9]
  if (Math.abs(v - 1.28571) < 0.05) return 'rest'
  const near = (t: number): boolean => Math.abs(v - t) < 0.06
  if (near(-1)) return 'up'
  if (near(-0.42857)) return 'right'
  if (near(0.14286)) return 'down'
  if (near(0.71429)) return 'left'
  return null
}
