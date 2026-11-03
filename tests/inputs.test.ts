import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildInputConfig, buildMameCtrlr, buildInputMap, presetControls, prettyBinding } from '../src/main/inputs'
import { codeToRetro, retroToCode } from '../src/shared/keys'
import type { CustomControls } from '../src/shared/types'

test('tasti: da codice del browser a RetroArch e ritorno', () => {
  for (const [code, name] of [['KeyA', 'a'], ['Digit5', 'num5'], ['Numpad3', 'keypad3'], ['ArrowUp', 'up'], ['ControlLeft', 'lctrl'], ['Space', 'space'], ['F4', 'f4'], ['NumpadEnter', 'kp_enter']]) {
    assert.equal(codeToRetro(code), name, code)
    assert.equal(retroToCode(name), code, name)
  }
  assert.equal(codeToRetro('Escape'), null)
  assert.equal(codeToRetro('MediaPlayPause'), null)
})

test('schemi automatici: invariati (portatile e cabinato)', () => {
  const l = buildInputConfig('laptop', 'standard', false)
  assert.equal(l.input_player1_up, 'w')
  assert.equal(l.input_player1_b, 'j')
  assert.equal(l.input_exit_emulator, 'escape')
  const c = buildInputConfig('cabinet', 'standard', false)
  assert.equal(c.input_player1_b, 'lctrl')
  assert.equal(c.input_enable_hotkey, 'num5')
  assert.equal(c.input_exit_emulator, 'num1')
  // Capcom: pugni Y X L sulla fila alta del cabinato
  const cap = buildInputConfig('cabinet', 'capcom', true)
  assert.equal(cap.input_player1_y, 'lctrl')
  assert.equal(cap.input_player1_b, 'lshift')
})

function custom(): CustomControls {
  const c = presetControls('cabinet')
  c.p1.up = { axis: '-1' }
  c.p1.b1 = { btn: 4 }
  c.p1.b2 = { key: 'q' }
  c.p1.start = { btn: 9 }
  c.p1.select = { btn: 8 }
  return c
}

test('comandi manuali: tasti, pulsanti e assi arrivano a RetroArch', () => {
  const c = buildInputConfig('custom', 'standard', false, custom())
  assert.equal(c.input_player1_up_axis, '-1')
  assert.equal(c.input_player1_up, undefined)
  assert.equal(c.input_player1_b_btn, '4')
  assert.equal(c.input_player1_a, 'q')
  assert.equal(c.input_enable_hotkey_btn, '8')
  assert.equal(c.input_exit_emulator_btn, '9')
  assert.equal(c.input_player2_b, 'a') // il giocatore 2 resta quello del preset cabinato
})

test('comandi manuali: file di MAME con tasti, pulsanti e assi', () => {
  const { name, xml } = buildMameCtrlr('custom', 'standard', custom())
  assert.equal(name, 'mrcustom')
  assert.match(xml, /P1_JOYSTICK_UP[\s\S]*?JOYCODE_1_YAXIS_UP_SWITCH<\/newseq>/)
  assert.match(xml, /P1_BUTTON1[\s\S]*?JOYCODE_1_BUTTON5<\/newseq>/)
  assert.match(xml, /P1_BUTTON2[\s\S]*?KEYCODE_Q OR JOYCODE_1_BUTTON2<\/newseq>/)
  assert.match(xml, /START1[\s\S]*?JOYCODE_1_BUTTON10<\/newseq>/)
  assert.ok(xml.includes('</mameconfig>'))
})

test('comandi manuali: un\'azione vuota non produce righe rotte', () => {
  const c = custom()
  c.p2.b3 = {}
  const cfg = buildInputConfig('custom', 'standard', false, c)
  assert.ok(!('input_player2_y' in cfg))
  const { xml } = buildMameCtrlr('custom', 'standard', c)
  assert.match(xml, /P2_BUTTON3[\s\S]*?JOYCODE_2_BUTTON3<\/newseq>/) // ricade sul predefinito del pad
})

test('mappa mostrata all\'utente', () => {
  const m = buildInputMap('custom', 'standard', custom())
  assert.equal(m.scheme, 'custom')
  assert.equal(m.players[0].rows[0].shown, 'Asse 1 −')
  assert.equal(prettyBinding({ btn: 0 }), 'Pad 1')
  assert.equal(prettyBinding(undefined), '—')
})
