import { existsSync, readFileSync, statSync } from 'fs'
import { dirname, join } from 'path'
import type { DiagnosticCheck, DiagnosticReport, Settings, SystemDef } from '@shared/types'
import { platform } from './platform'
import { systemDir } from './paths'

const isDir = (p: string): boolean => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

const tail = (file: string, n: number): string => {
  try {
    return existsSync(file) ? readFileSync(file, 'utf-8').slice(-n) : ''
  } catch {
    return ''
  }
}

export interface DiagContext {
  settings: Settings
  systems: SystemDef[]
  gameCount: (systemId: string) => number
  userData: string
  version: string
  os: string
}

/** Controlla tutto ciò che di solito va storto e lo racconta in modo semplice; il testo completo si può copiare e mandare */
export function buildDiagnostics(c: DiagContext): DiagnosticReport {
  const s = c.settings
  const checks: DiagnosticCheck[] = []
  const add = (level: DiagnosticCheck['level'], title: string, detail = '', fix = ''): void => {
    checks.push({ level, title, detail, fix })
  }

  if (!s.romsDir) add('bad', 'Cartella ROM non indicata', '', 'Impostazioni → Cartella ROM (oppure "Usa un altro disco per tutto").')
  else if (!isDir(s.romsDir)) add('bad', 'Cartella ROM non raggiungibile', s.romsDir, 'Se è su un disco esterno, collegalo e premi di nuovo; altrimenti correggi il percorso.')
  else add('ok', 'Cartella ROM', s.romsDir)

  if (!s.biosDir || !isDir(s.biosDir)) add('warn', 'Cartella BIOS non trovata', s.biosDir, 'Impostazioni → Crea cartelle mancanti.')
  else add('ok', 'Cartella BIOS', s.biosDir)

  const needsRa = c.systems.some((x) => x.phase === 1 && x.core && c.gameCount(x.id) > 0)
  if (!s.retroarchPath || !existsSync(s.retroarchPath)) {
    add(needsRa ? 'bad' : 'warn', 'RetroArch non trovato', s.retroarchPath, 'Indica retroarch.exe nelle Impostazioni: serve per tutte le console.')
  } else {
    add('ok', 'RetroArch', s.retroarchPath)
    const cores = s.coresDir || join(dirname(s.retroarchPath), 'cores')
    for (const core of new Set(c.systems.filter((x) => x.core && x.phase === 1 && c.gameCount(x.id) > 0).map((x) => x.core as string))) {
      if (existsSync(join(cores, core + platform.coreExt))) add('ok', `Core ${core}`)
      else add('bad', `Core mancante: ${core}`, cores, 'In RetroArch: Carica core → Scarica un core.')
    }
  }

  const usesMame = c.gameCount('mame') > 0 || !!s.mamePath
  if (!s.mamePath) add(usesMame ? 'warn' : 'ok', 'MAME non indicato', '', 'Serve solo per il sistema Arcade (MAME) e per i titoli delle console dalle Software List.')
  else if (!existsSync(s.mamePath)) add('bad', 'mame.exe non trovato', s.mamePath, 'Correggi il percorso nelle Impostazioni.')
  else add('ok', 'MAME', s.mamePath)

  if (s.datDir) add(isDir(s.datDir) ? 'ok' : 'warn', 'Cartella DAT', s.datDir, isDir(s.datDir) ? '' : 'La cartella non esiste.')
  if (s.mediaDir) add(isDir(s.mediaDir) ? 'ok' : 'warn', 'Cartella immagini/Multimedia', s.mediaDir, isDir(s.mediaDir) ? '' : 'La cartella non esiste: filmati e musica non saranno disponibili.')

  // BIOS per sistema
  const hasBios = (...n: string[]): boolean => [s.biosDir, join(s.biosDir || '', 'dc'), join(s.biosDir || '', 'fbneo')].some((d) => d && n.some((f) => existsSync(join(d, f))))
  const biosRules: Array<[string, string[], string]> = [
    ['neogeo', ['neogeo.zip'], 'neogeo.zip in bios\\fbneo'],
    ['psx', ['scph5501.bin', 'scph5500.bin', 'scph5502.bin', 'scph1001.bin', 'scph7001.bin'], 'scph5501.bin in bios'],
    ['dreamcast', ['dc_boot.bin'], 'dc_boot.bin e dc_flash.bin in bios\\dc'],
    ['naomi', ['naomi.zip'], 'naomi.zip in bios\\dc'],
    ['atomiswave', ['awbios.zip'], 'awbios.zip in bios\\dc']
  ]
  for (const [id, files, where] of biosRules) {
    if (c.gameCount(id) > 0 && !hasBios(...files)) add('bad', `BIOS mancante per ${c.systems.find((x) => x.id === id)?.name ?? id}`, '', `Copia ${where}.`)
  }

  // sistemi: cartella e numero di giochi
  for (const sys of c.systems.filter((x) => x.phase === 1)) {
    const dir = s.romsDir ? systemDir(sys, s) : ''
    if (dir && isDir(dir)) {
      const n = c.gameCount(sys.id)
      add(n > 0 ? 'ok' : 'warn', `${sys.name}: ${n.toLocaleString('it')} giochi`, dir, n > 0 ? '' : 'Cartella vuota o senza file con le estensioni giuste.')
    }
  }
  const hidden = s.hiddenSystems ?? []
  if (hidden.length) add('ok', `Sistemi nascosti: ${hidden.length}`, hidden.join(', '))

  const mainLog = tail(join(c.userData, 'main.log'), 4000)
  const mameLog = tail(join(c.userData, 'mame', 'last-error.log'), 3000)
  if (mainLog) add('warn', 'Il programma ha registrato errori imprevisti', 'vedi il testo copiabile', 'Mandami il testo della diagnostica.')

  const icon = { ok: '[OK]  ', warn: '[ATTENZIONE]', bad: '[PROBLEMA]' } as const
  const text = [
    `Mr. Emulator ${c.version} — ${c.os}`,
    `Data: ${new Date().toISOString()}`,
    '',
    ...checks.map((k) => `${icon[k.level]} ${k.title}${k.detail ? ` — ${k.detail}` : ''}${k.fix ? `\n          → ${k.fix}` : ''}`),
    mainLog ? `\n--- main.log (ultime righe) ---\n${mainLog}` : '',
    mameLog ? `\n--- ultimo errore MAME ---\n${mameLog}` : ''
  ].join('\n')
  return { checks, text, problems: checks.filter((k) => k.level === 'bad').length, warnings: checks.filter((k) => k.level === 'warn').length }
}
