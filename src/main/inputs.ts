import type { ArcadeLayout, ControlRow, InputMapReport, InputScheme } from '@shared/types'

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

const KEYS: Record<InputScheme, { p1: PlayerKeys; p2: PlayerKeys }> = {
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
const CAPCOM_ROWS: Record<InputScheme, { punch: [number, number, number]; kick: [number, number, number] }> = {
  laptop: { punch: [3, 4, 5], kick: [0, 1, 2] }, // U I O in alto, J K L in basso
  cabinet: { punch: [0, 1, 2], kick: [3, 4, 5] } // fila alta del pannello = pugni (come in MAME)
}

/** Per ogni pulsante fisico (0..5): a quale pulsante del RetroPad corrisponde */
function buttonTargets(scheme: InputScheme, layout: ArcadeLayout): string[] {
  if (layout === 'standard') return STANDARD
  const rows = CAPCOM_ROWS[scheme]
  const t = new Array<string>(6).fill('')
  ;['y', 'x', 'l'].forEach((pad, i) => (t[rows.punch[i]] = pad))
  ;['b', 'a', 'r'].forEach((pad, i) => (t[rows.kick[i]] = pad))
  return t
}

/** Impostazioni di RetroArch per i comandi di tastiera di entrambi i giocatori */
export function buildInputConfig(scheme: InputScheme, layout: ArcadeLayout, isArcade: boolean): Record<string, string> {
  const c: Record<string, string> = {}
  const targets = buttonTargets(scheme, isArcade ? layout : 'standard')
  ;([['1', KEYS[scheme].p1], ['2', KEYS[scheme].p2]] as const).forEach(([n, k]) => {
    c[`input_player${n}_up`] = k.up
    c[`input_player${n}_down`] = k.down
    c[`input_player${n}_left`] = k.left
    c[`input_player${n}_right`] = k.right
    c[`input_player${n}_start`] = k.start
    c[`input_player${n}_select`] = k.select
    k.buttons.forEach((key, i) => (c[`input_player${n}_${targets[i]}`] = key))
  })

  if (scheme === 'cabinet') {
    // senza tastiera sul cabinato: si esce tenendo premuto Moneta 1 e premendo Start 1
    c['input_enable_hotkey'] = KEYS.cabinet.p1.select
    c['input_exit_emulator'] = KEYS.cabinet.p1.start
  } else {
    c['input_exit_emulator'] = 'escape'
  }
  return c
}

const RETRO_LABEL: Record<string, string> = {
  up: '↑', down: '↓', left: '←', right: '→', space: 'Spazio', enter: 'Invio', kp_enter: 'Invio tastierino',
  lctrl: 'Ctrl sinistro', lalt: 'Alt sinistro', lshift: 'Maiusc sinistro', rshift: 'Maiusc destro', escape: 'Esc'
}

export function prettyKey(key: string): string {
  if (RETRO_LABEL[key]) return RETRO_LABEL[key]
  const num = /^num(\d)$/.exec(key)
  if (num) return num[1]
  const pad = /^keypad(\d)$/.exec(key)
  if (pad) return `Tastierino ${pad[1]}`
  return key.length === 1 ? key.toUpperCase() : key
}

const PAD_NAME: Record<string, string> = { b: 'B', a: 'A', y: 'Y', x: 'X', l: 'L', r: 'R' }

function rows(k: PlayerKeys): ControlRow[] {
  const r = (action: string, key: string): ControlRow => ({ action, key, shown: prettyKey(key) })
  return [
    r('Su', k.up),
    r('Giù', k.down),
    r('Sinistra', k.left),
    r('Destra', k.right),
    ...k.buttons.map((key, i) => r(`Pulsante ${i + 1}`, key)),
    r('Start', k.start),
    r('Moneta / Select', k.select)
  ]
}

export function buildInputMap(scheme: InputScheme, layout: ArcadeLayout): InputMapReport {
  const k = KEYS[scheme]
  const std = k.p1.buttons.map((key, i) => `Pulsante ${i + 1} (${prettyKey(key)}) → ${PAD_NAME[STANDARD[i]]}`)
  const cap = CAPCOM_ROWS[scheme]
  const names = (idx: number[]): string => idx.map((i) => prettyKey(k.p1.buttons[i])).join(' · ')
  return {
    scheme,
    players: [
      { player: 1, title: scheme === 'laptop' ? 'Giocatore 1 · tastiera' : 'Giocatore 1 · pannello', rows: rows(k.p1) },
      { player: 2, title: scheme === 'laptop' ? 'Giocatore 2 · tastierino numerico' : 'Giocatore 2 · pannello', rows: rows(k.p2) }
    ],
    hotkeys:
      scheme === 'cabinet'
        ? [{ action: 'Esci dal gioco', key: k.p1.start, shown: `tieni ${prettyKey(k.p1.select)} + premi ${prettyKey(k.p1.start)}` }]
        : [{ action: 'Esci dal gioco', key: 'escape', shown: 'Esc' }],
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
    kp_enter: 'KEYCODE_ENTER_PAD', space: 'KEYCODE_SPACE', lctrl: 'KEYCODE_LCONTROL', lalt: 'KEYCODE_LALT',
    lshift: 'KEYCODE_LSHIFT', rshift: 'KEYCODE_RSHIFT', escape: 'KEYCODE_ESC'
  }
  if (fixed[key]) return fixed[key]
  const pad = /^keypad(\d)$/.exec(key)
  if (pad) return `KEYCODE_${pad[1]}_PAD`
  const num = /^num(\d)$/.exec(key)
  if (num) return `KEYCODE_${num[1]}`
  return `KEYCODE_${key.toUpperCase()}`
}

/**
 * File di mappatura per MAME ("ctrlr"). Con il pannello arcade I-PAC i tasti predefiniti di MAME sono già
 * quelli giusti: serve solo la combinazione per uscire (Moneta 1 + Start 1). Per la tastiera del portatile
 * si assegnano WASD + J/K/L; i pad restano utilizzabili grazie ai comandi predefiniti di MAME.
 */
export function buildMameCtrlr(scheme: InputScheme, layout: ArcadeLayout): { name: string; xml: string } {
  const port = (type: string, seq: string): string =>
    `            <port type="${type}">\n                <newseq type="standard">${seq}</newseq>\n            </port>\n`
  let body = ''
  if (scheme === 'cabinet') {
    body += port('UI_CANCEL', 'KEYCODE_ESC OR KEYCODE_5 KEYCODE_1')
  } else {
    const k = KEYS.laptop
    // "capcom": i pugni (pulsanti 1-3) stanno sulla fila alta della tastiera (U I O), i calci (4-6) su J K L
    const order = layout === 'capcom' ? [3, 4, 5, 0, 1, 2] : [0, 1, 2, 3, 4, 5]
    ;([['1', k.p1], ['2', k.p2]] as const).forEach(([n, pk]) => {
      body += port(`P${n}_JOYSTICK_UP`, `${mameKey(pk.up)} OR JOYCODE_${n}_YAXIS_UP_SWITCH OR JOYCODE_${n}_DPADUP`)
      body += port(`P${n}_JOYSTICK_DOWN`, `${mameKey(pk.down)} OR JOYCODE_${n}_YAXIS_DOWN_SWITCH OR JOYCODE_${n}_DPADDOWN`)
      body += port(`P${n}_JOYSTICK_LEFT`, `${mameKey(pk.left)} OR JOYCODE_${n}_XAXIS_LEFT_SWITCH OR JOYCODE_${n}_DPADLEFT`)
      body += port(`P${n}_JOYSTICK_RIGHT`, `${mameKey(pk.right)} OR JOYCODE_${n}_XAXIS_RIGHT_SWITCH OR JOYCODE_${n}_DPADRIGHT`)
      order.forEach((idx, b) => (body += port(`P${n}_BUTTON${b + 1}`, `${mameKey(pk.buttons[idx])} OR JOYCODE_${n}_BUTTON${b + 1}`)))
      body += port(`START${n}`, `${mameKey(pk.start)} OR JOYCODE_${n}_BUTTON9`)
      body += port(`COIN${n}`, `${mameKey(pk.select)} OR JOYCODE_${n}_BUTTON10`)
    })
    body += port('UI_CANCEL', 'KEYCODE_ESC')
  }
  const xml = `<?xml version="1.0"?>\n<mameconfig version="10">\n    <system name="default">\n        <input>\n${body}        </input>\n    </system>\n</mameconfig>\n`
  return { name: scheme === 'cabinet' ? 'mrcabinet' : 'mrlaptop', xml }
}
