import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { writeFileAtomic } from '../src/main/atomic'
import { parseDat, datTitles } from '../src/main/datfiles'
import { parseSoftList } from '../src/main/softlist'

test('scrittura atomica: sostituisce il contenuto e non lascia file temporanei', () => {
  const d = mkdtempSync(join(tmpdir(), 'mr-at-'))
  const f = join(d, 'a.json')
  writeFileAtomic(f, 'uno')
  writeFileAtomic(f, 'due')
  assert.equal(readFileSync(f, 'utf-8'), 'due')
  assert.deepEqual(readdirSync(d), ['a.json'])
})

test('impostazioni: file corrotto -> copia di sicurezza -> predefiniti', async () => {
  const d = mkdtempSync(join(tmpdir(), 'mr-set-'))
  process.env.MR_TEST_DATA = d
  const { loadSettings, saveSettings } = await import('../src/main/settings')
  const base = loadSettings()
  saveSettings({ ...base, romsDir: 'D:\\roms' })
  saveSettings({ ...base, romsDir: 'D:\\roms2' }) // crea la copia con il valore precedente
  const file = readdirSync(d).find((n) => n.endsWith('.json') && !n.includes('.bak'))!
  writeFileSync(join(d, file), '{ corrotto')
  assert.equal(loadSettings().romsDir, 'D:\\roms')
  writeFileSync(join(d, `${file}.bak`), 'anche questo')
  assert.equal(loadSettings().romsDir, base.romsDir)
})

test('DAT XML e testuale', () => {
  const x = parseDat('<?xml version="1.0"?><datafile><header><name>FBNeo - NES</name></header><game name="Ab1"><description>Titolo &amp; Uno</description></game></datafile>', 'f')
  assert.equal(x.header, 'FBNeo - NES')
  assert.equal(x.titles.get('ab1'), 'Titolo & Uno')
  const t = parseDat('clrmamepro (\n name "FBNeo - MD"\n)\ngame (\n name "Gioco (USA)"\n rom ( name gio.zip size 1 )\n)', 'f')
  assert.equal(t.titles.get('gio'), 'Gioco (USA)')
})

test('DAT: un sistema usa solo i DAT che lo riguardano', () => {
  const d = mkdtempSync(join(tmpdir(), 'mr-dat-'))
  writeFileSync(join(d, 'nes.dat'), '<datafile><header><name>FBNeo - NES Games</name></header><game name="1942"><description>1942 NES</description></game></datafile>')
  writeFileSync(join(d, 'arc.dat'), '<datafile><header><name>FBNeo - Arcade</name></header><game name="1942"><description>1942 Arcade</description></game></datafile>')
  assert.equal(datTitles(d, 'nes')!.get('1942'), '1942 NES')
  assert.equal(datTitles(join(d, 'non-esiste'), 'nes'), null)
})

test('Software List: nomi e titoli con entità', () => {
  const m = parseSoftList('<software name="A1" cloneof="b"><description>Tom &amp; Jerry (USA)</description></software>')
  assert.equal(m.get('a1'), 'Tom & Jerry (USA)')
})
