import type { ActionId, ArcadeLayout, Binding, ControlRow, CustomControls, InputMapReport, InputScheme, PlayerControls } from '@shared/types'
import { ACTIONS, prettyKey } from '@shared/keys'

/**
 * Comandi da tastiera: portatile (WASD + J/K/L) e pannello arcade con encoder tipo I-PAC.
 * Funzioni pure. I nomi dei tasti sono quelli del file di configurazione di RetroArch.
 */

interface PlayerKeys {
  up: string
  down: string
  left: string
  right: string
  /** Pulsanti fisici 1..6 */
  buttons: [string, string, string, string, string, string]
  start: string
  /** Select = Moneta nei giochi arcade */
  select: string
}

const KEYS: Record<'laptop' | 'cabinet', { p1: PlayerKeys; p2: PlayerKeys }> = {
  laptop: {
    p1: { up: 'w', down: 's', left: 'a', right: 'd', buttons: ['j', 'k', 'l', 'u', 'i', 'o'], start: 'enter', select: 'rshift' },
    p2: {
      up: 'up',
      down: 'down',
      left: 'left',
      right: 'right',
      buttons: ['keypad1', 'keypad2', 'keypad3', 'keypad4', 'keypad5', 'keypad6'],
      start: 'kp_enter',
      select: 'keypad0'
    }
  },
  // preset standard degli encoder I-PAC / MAME
  cabinet: {
    p1: { up: 'up', down: 'down', left: 'left', right: 'right', buttons: ['lctrl', 'lalt', 'space', 'lshift', 'z', 'x'], start: 'num1', select: 'num5' },
    p2: { up: 'r', down: 'f', left: 'd', right: 'g', buttons: ['a', 's', 'q', 'w', 'i', 'k'], start: 'num2', select: 'num6' }
  }
}

/** Pulsanti 1..6 -> pulsanti del RetroPad, in ordine (stessa idea di un pad SNES a 6 tasti) */
const STANDARD = ['b', 'a', 'y', 'x', 'l', 'r']

/** Capcom: pugni (debole, medio, forte) = Y X L; calci = B A R. Su quali pulsanti fisici stanno pugni e calci */
const CAPCOM_ROWS: Record<'laptop' | 'cabinet', { punch: [number, number, number]; kick: [number, number, number] }> = {
  laptop: { punch: [3, 4, 5], kick: [0, 1, 2] }, // U I O in alto, J K L in basso
  cabinet: { punch: [0, 1, 2], kick: [3, 4, 5] } // fila alta del pannello = pugni (come in MAME)
}
/** I comandi assegnati a mano seguono la disposizione del pannello: fila alta = pugni */
const rowsKey = (scheme: InputScheme): 'laptop' | 'cabinet' => (scheme === 'laptop' ? 'laptop' : 'cabinet')

const ACTION_IDS = ACTIONS.map((a) => a.id)
const toControls = (k: PlayerKeys): PlayerControls => ({
  up: { key: k.up }, down: { key: k.down }, left: { key: k.left }, right: { key: k.right },
  b1: { key: k.buttons[0] }, b2: { key: k.buttons[1] }, b3: { key: k.buttons[2] },
  b4: { key: k.buttons[3] }, b5: { key: k.buttons[4] }, b6: { key: k.buttons[5] },
  start: { key: k.start }, select: { key: k.select }
})

/** Punto di partenza per i comandi manuali: una copia dello schema indicato */
export function presetControls(scheme: 'laptop' | 'cabinet'): CustomControls {
  return { p1: toControls(KEYS[scheme].p1), p2: toControls(KEYS[scheme].p2) }
}

/** Comandi in uso per i due giocatori */
export function controlsFor(scheme: InputScheme, custom: CustomControls | null): { p1: PlayerControls; p2: PlayerControls } {
  if (scheme === 'custom') return custom ?? presetControls('cabinet')
  return presetControls(scheme)
}

/** Per ogni pulsante fisico (0..5): a quale pulsante del RetroPad corrisponde */
function buttonTargets(scheme: InputScheme, layout: ArcadeLayout): string[] {
  if (layout === 'standard') return STANDARD
  const rows = CAPCOM_ROWS[rowsKey(scheme)]
  const t = new Array<string>(6).fill('')
  ;['y', 'x', 'l'].forEach((pad, i) => (t[rows.punch[i]] = pad))
  ;['b', 'a', 'r'].forEach((pad, i) => (t[rows.kick[i]] = pad))
  return t
}

const DIRS: ActionId[] = ['up', 'down', 'left', 'right']

/** Impostazioni di RetroArch per i comandi di entrambi i giocatori (tastiera, pulsanti e assi del pad) */
export function buildInputConfig(scheme: InputScheme, layout: ArcadeLayout, isArcade: boolean, custom: CustomControls | null = null): Record<string, string> {
  const c: Record<string, string> = {}
  const targets = buttonTargets(scheme, isArcade ? layout : 'standard')
  const ctl = controlsFor(scheme, custom)
  ;([['1', ctl.p1], ['2', ctl.p2]] as const).forEach(([n, pc]) => {
    for (const id of ACTION_IDS) {
      const target = id.startsWith('b') && id.length === 2 ? targets[Number(id[1]) - 1] : id
      if (!target) continue
      const b = pc[id] ?? {}
      const base = `input_player${n}_${target}`
      if (b.key) c[base] = b.key
      if (b.btn !== undefined) c[`${base}_btn`] = String(b.btn)
      if (b.axis && DIRS.includes(id)) c[`${base}_axis`] = b.axis
    }
  })

  if (scheme === 'laptop') {
    c['input_exit_emulator'] = 'escape'
  } else {
    // senza tastiera sul cabinato: si esce tenendo premuto Moneta 1 e premendo Start 1
    const sel = ctl.p1.select ?? {}
    const st = ctl.p1.start ?? {}
    if (sel.key) c['input_enable_hotkey'] = sel.key
    if (sel.btn !== undefined) c['input_enable_hotkey_btn'] = String(sel.btn)
    if (st.key) c['input_exit_emulator'] = st.key
    if (st.btn !== undefined) c['input_exit_emulator_btn'] = String(st.btn)
  }
  return c
}

export { prettyKey }

/** Come si mostra un collegamento: tasto, pulsante del pad o asse (più il nome se ce n'è più di uno) */
export function prettyBinding(b: Binding | undefined): string {
  if (!b) return '—'
  const parts: string[] = []
  if (b.key) parts.push(prettyKey(b.key))
  if (b.btn !== undefined) parts.push(`Pad ${b.btn + 1}`)
  if (b.axis) parts.push(`Asse ${b.axis[1]} ${b.axis[0] === '-' ? '−' : '+'}`)
  return parts.length ? parts.join(' / ') : '—'
}

const PAD_NAME: Record<string, string> = { b: 'B', a: 'A', y: 'Y', x: 'X', l: 'L', r: 'R' }

function rows(pc: PlayerControls): ControlRow[] {
  return ACTIONS.map((a) => ({ action: a.label, key: pc[a.id]?.key ?? '', shown: prettyBinding(pc[a.id]) }))
}

export function buildInputMap(scheme: InputScheme, layout: ArcadeLayout, custom: CustomControls | null = null): InputMapReport {
  const ctl = controlsFor(scheme, custom)
  const label = (a: ActionId, i: number): string => prettyBinding(ctl.p1[a]) + (i < 0 ? '' : '')
  const bs: ActionId[] = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']
  const std = bs.map((a, i) => `Pulsante ${i + 1} (${label(a, i)}) → ${PAD_NAME[STANDARD[i]]}`)
  const cap = CAPCOM_ROWS[rowsKey(scheme)]
  const names = (idx: number[]): string => idx.map((i) => label(bs[i], i)).join(' · ')
  const who = scheme === 'laptop' ? ['Giocatore 1 · tastiera', 'Giocatore 2 · tastierino numerico'] : scheme === 'custom' ? ['Giocatore 1 · personalizzato', 'Giocatore 2 · personalizzato'] : ['Giocatore 1 · pannello', 'Giocatore 2 · pannello']
  return {
    scheme,
    players: [
      { player: 1, title: who[0], rows: rows(ctl.p1) },
      { player: 2, title: who[1], rows: rows(ctl.p2) }
    ],
    hotkeys:
      scheme === 'laptop'
        ? [{ action: 'Esci dal gioco', key: 'escape', shown: 'Esc' }]
        : [{ action: 'Esci dal gioco', key: ctl.p1.start?.key ?? '', shown: `tieni ${prettyBinding(ctl.p1.select)} + premi ${prettyBinding(ctl.p1.start)}` }],
    layouts: [
      { title: layout === 'standard' ? 'Sistema Arcade · layout standard' : 'Sistema Arcade · layout Capcom', rows: layout === 'standard' ? std : [`Pugni (debole, medio, forte): ${names(cap.punch)} → Y X L`, `Calci (debole, medio, forte): ${names(cap.kick)} → B A R`] },
      { title: 'Neo Geo, console e portatili', rows: ['Pulsanti 1, 2, 3, 4 = A, B, C, D (Neo Geo)', ...std.slice(0, 4)] }
    ]
  }
}

/** Nome del tasto in RetroArch -> nome in MAME */
function mameKey(key: string): string {
  const fixed: Record<string, string> = {
    up: 'KEYCODE_UP', down: 'KEYCODE_DOWN', left: 'KEYCODE_LEFT', right: 'KEYCODE_RIGHT', enter: 'KEYCODE_ENTER',
    kp_enter: 'KEYCODE_ENTER_PAD', space: 'KEYCODE_SPACE', lctrl: 'KEYCODE_LCONTROL', rctrl: 'KEYCODE_RCONTROL', lalt: 'KEYCODE_LALT', ralt: 'KEYCODE_RALT',
    lshift: 'KEYCODE_LSHIFT', rshift: 'KEYCODE_RSHIFT', escape: 'KEYCODE_ESC', tab: 'KEYCODE_TAB', backspace: 'KEYCODE_BACKSPACE',
    del: 'KEYCODE_DEL', insert: 'KEYCODE_INSERT', home: 'KEYCODE_HOME', end: 'KEYCODE_END', pgup: 'KEYCODE_PGUP', pgdown: 'KEYCODE_PGDN',
    minus: 'KEYCODE_MINUS', equals: 'KEYCODE_EQUALS', comma: 'KEYCODE_COMMA', period: 'KEYCODE_STOP', slash: 'KEYCODE_SLASH',
    semicolon: 'KEYCODE_COLON', quote: 'KEYCODE_QUOTE', leftbracket: 'KEYCODE_OPENBRACE', rightbracket: 'KEYCODE_CLOSEBRACE',
    backslash: 'KEYCODE_BACKSLASH', tilde: 'KEYCODE_TILDE', add: 'KEYCODE_PLUS_PAD', subtract: 'KEYCODE_MINUS_PAD',
    multiply: 'KEYCODE_ASTERISK', divide: 'KEYCODE_SLASH_PAD'
  }
  if (fixed[key]) return fixed[key]
  const pad = /^keypad(\d)$/.exec(key)
  if (pad) return `KEYCODE_${pad[1]}_PAD`
  const num = /^num(\d)$/.exec(key)
  if (num) return `KEYCODE_${num[1]}`
  return `KEYCODE_${key.toUpperCase()}`
}

/** Collegamento -> espressione di MAME (tasto OR pulsante OR asse); "extra" sono i collegamenti predefiniti da tenere se l'utente non ne ha scelto uno suo */
function mameSeq(n: string, b: Binding | undefined, extra: string[]): string {
  const parts: string[] = []
  if (b?.key) parts.push(mameKey(b.key))
  if (b?.btn !== undefined) parts.push(`JOYCODE_${n}_BUTTON${b.btn + 1}`)
  if (b?.axis) {
    const [sign, idx] = [b.axis[0], Number(b.axis[1])]
    const name = ['XAXIS', 'YAXIS'][idx]
    if (name) {
      const dir = idx === 0 ? (sign === '-' ? 'LEFT' : 'RIGHT') : sign === '-' ? 'UP' : 'DOWN'
      parts.push(`JOYCODE_${n}_${name}_${dir}_SWITCH`)
    }
  }
  if (b?.btn === undefined && !b?.axis) parts.push(...extra)
  return parts.join(' OR ')
}

/**
 * File di mappatura per MAME ("ctrlr"). Con il pannello arcade I-PAC i tasti predefiniti di MAME sono già
 * quelli giusti: serve solo la combinazione per uscire (Moneta 1 + Start 1). Per la tastiera del portatile
 * e per i comandi manuali si assegnano i tasti scelti; i pad restano utilizzabili grazie ai comandi predefiniti di MAME.
 */
export function buildMameCtrlr(scheme: InputScheme, layout: ArcadeLayout, custom: CustomControls | null = null): { name: string; xml: string } {
  const port = (type: string, seq: string): string =>
    `            <port type="${type}">\n                <newseq type="standard">${seq}</newseq>\n            </port>\n`
  let body = ''
  if (scheme === 'cabinet') {
    body += port('UI_CANCEL', 'KEYCODE_ESC OR KEYCODE_5 KEYCODE_1')
  } else {
    const ctl = controlsFor(scheme, custom)
    // "capcom" sul portatile: i pugni (pulsanti 1-3) stanno sulla fila alta della tastiera (U I O), i calci (4-6) su J K L
    const order = scheme === 'laptop' && layout === 'capcom' ? [3, 4, 5, 0, 1, 2] : [0, 1, 2, 3, 4, 5]
    const bs: ActionId[] = ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']
    ;([['1', ctl.p1], ['2', ctl.p2]] as const).forEach(([n, pc]) => {
      body += port(`P${n}_JOYSTICK_UP`, mameSeq(n, pc.up, [`JOYCODE_${n}_YAXIS_UP_SWITCH`, `JOYCODE_${n}_DPADUP`]))
      body += port(`P${n}_JOYSTICK_DOWN`, mameSeq(n, pc.down, [`JOYCODE_${n}_YAXIS_DOWN_SWITCH`, `JOYCODE_${n}_DPADDOWN`]))
      body += port(`P${n}_JOYSTICK_LEFT`, mameSeq(n, pc.left, [`JOYCODE_${n}_XAXIS_LEFT_SWITCH`, `JOYCODE_${n}_DPADLEFT`]))
      body += port(`P${n}_JOYSTICK_RIGHT`, mameSeq(n, pc.right, [`JOYCODE_${n}_XAXIS_RIGHT_SWITCH`, `JOYCODE_${n}_DPADRIGHT`]))
      order.forEach((idx, b) => (body += port(`P${n}_BUTTON${b + 1}`, mameSeq(n, pc[bs[idx]], [`JOYCODE_${n}_BUTTON${b + 1}`]))))
      body += port(`START${n}`, mameSeq(n, pc.start, [`JOYCODE_${n}_BUTTON9`]))
      body += port(`COIN${n}`, mameSeq(n, pc.select, [`JOYCODE_${n}_BUTTON10`]))
    })
    const sel = ctl.p1.select?.key
    const st = ctl.p1.start?.key
    body += port('UI_CANCEL', scheme === 'custom' && sel && st ? `KEYCODE_ESC OR ${mameKey(sel)} ${mameKey(st)}` : 'KEYCODE_ESC')
  }
  const xml = `<?xml version="1.0"?>\n<mameconfig version="10">\n    <system name="default">\n        <input>\n${body}        </input>\n    </system>\n</mameconfig>\n`
  return { name: scheme === 'cabinet' ? 'mrcabinet' : scheme === 'custom' ? 'mrcustom' : 'mrlaptop', xml }
}
