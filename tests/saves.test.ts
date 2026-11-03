import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { tmpdir } from 'os'
import { backupSaves, hiscoreSupported, importSaves, mameSaveIni, prepareFresh, restoreSaves, retroSaveConfig, saveInfo, savesRoot, saveStats, stateFile } from '../src/main/saves'
import { createZip, listZip } from '../src/main/zipwrite'
import { SYSTEMS } from '../src/main/systems'
import type { Game, Settings } from '../src/shared/types'

const sys = (id: string) => SYSTEMS.find((s) => s.id === id)!

function setup(over: Partial<Settings> = {}) {
  const root = mkdtempSync(join(tmpdir(), 'mr-sv-'))
  const roms = join(root, 'roms')
  mkdirSync(roms)
  const s = { romsDir: roms, savesDir: '', resumeConsoles: true, resumeArcade: {}, hiscore: true, mamePath: '', retroarchPath: '', ...over } as Settings
  const game = (systemId: string, file: string, extra: Partial<Game> = {}): Game => ({ id: `${systemId}:${file}`, name: file, fileName: file, path: join(roms, file), systemId, ...extra }) as Game
  return { root, s, game }
}

test('cartella dei salvataggi: accanto alle ROM, oppure quella scelta', () => {
  const { root, s } = setup()
  assert.equal(savesRoot(s), join(root, 'saves'))
  assert.equal(savesRoot({ ...s, savesDir: 'D:\\mie-saves' }), 'D:\\mie-saves')
})

test('console: RetroArch salva lo stato all\'uscita e lo ricarica; nuova partita = non carica', () => {
  const { s, game } = setup()
  const g = game('psx', 'Crash Bandicoot (USA).cue')
  const c = retroSaveConfig(s, sys('psx'), g)
  assert.equal(c.savestate_auto_save, 'true')
  assert.equal(c.savestate_auto_load, 'true')
  assert.equal(c.autosave_interval, '10')
  assert.match(c.savefile_directory, /\/saves\/sram$/)
  assert.match(c.savestate_directory, /\/saves\/states$/)
  const fresh = retroSaveConfig(s, sys('psx'), g, true)
  assert.deepEqual([fresh.savestate_auto_save, fresh.savestate_auto_load], ['true', 'false'])
  // interruttore spento: né salva né carica (si scrive comunque, per non ereditare scelte vecchie di RetroArch)
  const off = retroSaveConfig({ ...s, resumeConsoles: false }, sys('psx'), g)
  assert.deepEqual([off.savestate_auto_save, off.savestate_auto_load], ['false', 'false'])
})

test('arcade: riprende solo i giochi scelti nell\'anteprima', () => {
  const { s, game } = setup()
  const a = game('neogeo', 'kof98.zip')
  const b = game('neogeo', 'mslug.zip')
  const on = { ...s, resumeArcade: { [a.id]: true } }
  assert.equal(retroSaveConfig(on, sys('neogeo'), a).savestate_auto_load, 'true')
  assert.equal(retroSaveConfig(on, sys('neogeo'), b).savestate_auto_load, 'false')
})

test('info: stato e salvataggio del gioco trovati; chiede solo per le console con stato', () => {
  const { s, game } = setup()
  const g = game('nes', 'Zelda.nes')
  assert.deepEqual(saveInfo(s, sys('nes'), g).state, null)
  assert.equal(saveInfo(s, sys('nes'), g).ask, false)
  mkdirSync(join(savesRoot(s), 'states'), { recursive: true })
  mkdirSync(join(savesRoot(s), 'sram'), { recursive: true })
  writeFileSync(stateFile(s, sys('nes'), g), 'stato')
  writeFileSync(join(savesRoot(s), 'sram', 'Zelda.srm'), 'sram')
  const i = saveInfo(s, sys('nes'), g)
  assert.equal(i.kind, 'console')
  assert.ok(i.state && i.sram)
  assert.equal(i.ask, true)
  assert.equal(saveInfo({ ...s, resumeConsoles: false }, sys('nes'), g).ask, false)
  // arcade: lo stato si vede ma non si chiede all'avvio (si sceglie nell'anteprima)
  const a = game('neogeo', 'kof98.zip')
  writeFileSync(stateFile(s, sys('neogeo'), a), 'x')
  const ia = saveInfo(s, sys('neogeo'), a)
  assert.deepEqual([ia.kind, ia.ask, !!ia.state], ['arcade', false, true])
})

test('nuova partita: lo stato vecchio resta come copia .prev', () => {
  const { s, game } = setup()
  const g = game('snes', 'Chrono Trigger.sfc')
  mkdirSync(join(savesRoot(s), 'states'), { recursive: true })
  const f = stateFile(s, sys('snes'), g)
  writeFileSync(f, 'partita vecchia')
  assert.equal(prepareFresh(s, sys('snes'), g), true)
  assert.equal(existsSync(f), false)
  assert.equal(readFileSync(`${f}.prev`, 'utf8'), 'partita vecchia')
  assert.equal(prepareFresh(s, sys('snes'), g), false) // niente da conservare
})

test('MAME: stati e memoria nella cartella unica, ripresa per gioco, record con il plugin hiscore', () => {
  const { root, s, game } = setup()
  const g = game('mame', 'mslug.zip', { machine: 'mslug' })
  const ini = mameSaveIni(s, sys('mame'), g)
  assert.equal(ini.autosave, '0')
  assert.equal(ini.plugin, 'hiscore')
  assert.equal(ini.state_directory, join(root, 'saves', 'mame', 'sta'))
  assert.equal(ini.homepath, join(root, 'saves', 'mame', 'home'))
  assert.equal(mameSaveIni({ ...s, resumeArcade: { [g.id]: true } }, sys('mame'), g).autosave, '1')
  assert.equal(mameSaveIni({ ...s, hiscore: false }, sys('mame'), g).plugin, undefined)
  assert.equal(stateFile(s, sys('mame'), g), join(root, 'saves', 'mame', 'sta', 'mslug', 'auto.sta'))
})

test('hiscore: riconosce i giochi dell\'elenco del plugin', () => {
  const { root } = setup()
  const dir = join(root, 'MAME', 'plugins', 'hiscore')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'hiscore.dat'), 'mslug:\n@:maincpu,program,10,4,0\n\npuckman,pacman:\n@:maincpu,program,20,2,0\n')
  const exe = join(root, 'MAME', 'mame.exe')
  assert.equal(hiscoreSupported(exe, 'mslug'), true)
  assert.equal(hiscoreSupported(exe, 'pacman'), true)
  assert.equal(hiscoreSupported(exe, 'kof98'), false)
  assert.equal(hiscoreSupported(join(root, 'altro', 'mame.exe'), 'mslug'), false)
})

test('ZIP: creato e riletto con percorsi, file vuoti e nomi con accenti', async () => {
  const { root } = setup()
  const a = join(root, 'a.bin')
  const e = join(root, 'vuoto.bin')
  writeFileSync(a, Buffer.alloc(5000, 7))
  writeFileSync(e, '')
  const zip = join(root, 'prova.zip')
  createZip(zip, [{ name: 'states/Pokémon (Italia).state.auto', path: a }, { name: 'sram/vuoto.srm', path: e }])
  const list = (await listZip(zip))!
  assert.deepEqual(list.map((x) => x.name), ['states/Pokémon (Italia).state.auto', 'sram/vuoto.srm'])
  assert.deepEqual(list.map((x) => x.size), [5000, 0])
  assert.equal(await listZip(a), null) // un file qualunque non è uno ZIP
})

test('backup e ripristino: percorsi e contenuto identici; ripristino su cartella vuota', async () => {
  const { root, s, game } = setup()
  const g = game('psx', 'FF7.cue')
  mkdirSync(join(savesRoot(s), 'states'), { recursive: true })
  mkdirSync(join(savesRoot(s), 'mame', 'nvram', 'mslug'), { recursive: true })
  writeFileSync(stateFile(s, sys('psx'), g), Buffer.alloc(100000, 3))
  writeFileSync(join(savesRoot(s), 'mame', 'nvram', 'mslug', 'default.nv'), 'nv')
  assert.equal(saveStats(s).files, 2)
  const zip = join(root, 'backup', 'saves.zip')
  assert.equal(backupSaves(s, zip), 2)
  // altro PC: cartella dei salvataggi nuova
  const other = setup()
  const r = await restoreSaves(other.s, zip)
  assert.deepEqual(r, { files: 2, skipped: 0 })
  assert.equal(readFileSync(join(savesRoot(other.s), 'mame', 'nvram', 'mslug', 'default.nv'), 'utf8'), 'nv')
  assert.equal(readFileSync(stateFile(other.s, sys('psx'), g)).length, 100000)
  assert.throws(() => backupSaves(other.s, join(other.root, 'x.zip')) && backupSaves({ ...other.s, savesDir: join(other.root, 'vuota') }, join(other.root, 'y.zip')), /Non ci sono/)
})

test('ripristino: uno ZIP malevolo non può scrivere fuori dalla cartella dei salvataggi', async () => {
  const { root, s } = setup()
  const src = join(root, 'x.bin')
  writeFileSync(src, 'dati')
  const zip = join(root, 'cattivo.zip')
  createZip(zip, [{ name: '../fuori.txt', path: src }, { name: 'states/../../fuori2.txt', path: src }, { name: '/assoluto.txt', path: src }, { name: 'C:/windows.txt', path: src }, { name: 'states/ok.state.auto', path: src }])
  const r = await restoreSaves(s, zip)
  assert.deepEqual(r, { files: 1, skipped: 4 })
  assert.equal(existsSync(join(dirname(savesRoot(s)), 'fuori.txt')), false)
  assert.equal(existsSync(join(savesRoot(s), 'states', 'ok.state.auto')), true)
  await assert.rejects(restoreSaves(s, src), /non è un backup valido/)
})

test('importazione: porta i salvataggi esistenti senza sovrascrivere quelli nuovi', () => {
  const { root, s } = setup()
  const ra = join(root, 'RetroArch')
  mkdirSync(join(ra, 'saves'), { recursive: true })
  mkdirSync(join(ra, 'states'), { recursive: true })
  writeFileSync(join(ra, 'saves', 'Zelda.srm'), 'vecchio')
  writeFileSync(join(ra, 'states', 'Zelda.state.auto'), 'stato vecchio')
  const oldMame = join(root, 'appdata', 'mame')
  mkdirSync(join(oldMame, 'sta', 'mslug'), { recursive: true })
  writeFileSync(join(oldMame, 'sta', 'mslug', 'auto.sta'), 'mame')
  const st = { ...s, retroarchPath: join(ra, 'retroarch.exe') }
  mkdirSync(join(savesRoot(st), 'sram'), { recursive: true })
  writeFileSync(join(savesRoot(st), 'sram', 'Zelda.srm'), 'nuovo') // già presente: non si tocca
  assert.equal(importSaves(st, oldMame), 2)
  assert.equal(readFileSync(join(savesRoot(st), 'sram', 'Zelda.srm'), 'utf8'), 'nuovo')
  assert.equal(readFileSync(join(savesRoot(st), 'states', 'Zelda.state.auto'), 'utf8'), 'stato vecchio')
  assert.equal(readFileSync(join(savesRoot(st), 'mame', 'sta', 'mslug', 'auto.sta'), 'utf8'), 'mame')
  assert.equal(importSaves(st, oldMame), 0) // seconda volta: niente da copiare
})

test('importazione: legge le cartelle indicate nel retroarch.cfg di RetroArch', () => {
  const { root, s } = setup()
  const ra = join(root, 'RetroArch')
  mkdirSync(join(root, 'altrove'), { recursive: true })
  mkdirSync(ra, { recursive: true })
  writeFileSync(join(root, 'altrove', 'Metroid.srm'), 'x')
  writeFileSync(join(ra, 'retroarch.cfg'), `savefile_directory = "${join(root, 'altrove')}"\nsavestate_directory = "default"\n`)
  assert.equal(importSaves({ ...s, retroarchPath: join(ra, 'retroarch.exe') }, join(root, 'nessuno')), 1)
  assert.equal(existsSync(join(savesRoot(s), 'sram', 'Metroid.srm')), true)
})
