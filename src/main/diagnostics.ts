import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { createHash } from 'crypto'
import { savesRoot } from './saves'
import { dirname, join } from 'path'
import type { DiagnosticCheck, DiagnosticReport, Settings, SystemDef } from '@shared/types'
import { BIOS_RULES, type BiosRule } from '@shared/bios'
import { resolveOverlay } from './overlays'
import { platform } from './platform'
import { systemDir } from './paths'
import { mt, numLocale } from './mt'

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

/** Per ogni BIOS richiesto: quale file è stato trovato (null = manca) */
export function biosStatus(s: Settings, rules: BiosRule[] = BIOS_RULES): Array<{ rule: BiosRule; found: string | null; verified: 'ok' | 'unknown' | 'unchecked' | null }> {
  const dirs = [s.biosDir, join(s.biosDir || '', 'dc'), join(s.biosDir || '', 'fbneo')]
  return rules.map((rule) => {
    let found: string | null = null
    let path = ''
    for (const f of rule.anyOf) {
      const d = dirs.find((x) => x && existsSync(join(x, f)))
      if (d) {
        found = f
        path = join(d, f)
        break
      }
    }
    if (!found) return { rule, found, verified: null }
    const known = rule.md5?.[found]
    if (!known) return { rule, found, verified: 'unchecked' as const }
    try {
      const sum = createHash('md5').update(readFileSync(path)).digest('hex')
      return { rule, found, verified: known.includes(sum) ? ('ok' as const) : ('unknown' as const) }
    } catch {
      return { rule, found, verified: 'unknown' as const }
    }
  })
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

  if (!s.romsDir) add('bad', mt('Cartella ROM non indicata'), '', mt('Impostazioni → Cartella ROM (oppure "Usa un altro disco per tutto").'))
  else if (!isDir(s.romsDir)) add('bad', mt('Cartella ROM non raggiungibile'), s.romsDir, mt('Se è su un disco esterno, collegalo e premi di nuovo; altrimenti correggi il percorso.'))
  else add('ok', 'Cartella ROM', s.romsDir)

  if (!s.biosDir || !isDir(s.biosDir)) add('warn', mt('Cartella BIOS non trovata'), s.biosDir, mt('Impostazioni → Crea cartelle mancanti.'))
  else add('ok', 'Cartella BIOS', s.biosDir)

  const needsRa = c.systems.some((x) => x.phase === 1 && x.core && c.gameCount(x.id) > 0)
  if (!s.retroarchPath || !existsSync(s.retroarchPath)) {
    add(needsRa ? 'bad' : 'warn', mt('RetroArch non trovato'), s.retroarchPath, mt('Indica retroarch.exe nelle Impostazioni: serve per tutte le console.'))
  } else {
    add('ok', 'RetroArch', s.retroarchPath)
    const cores = s.coresDir || join(dirname(s.retroarchPath), 'cores')
    for (const core of new Set(c.systems.filter((x) => x.core && x.phase === 1 && c.gameCount(x.id) > 0).map((x) => x.core as string))) {
      if (existsSync(join(cores, core + platform.coreExt))) add('ok', `Core ${core}`)
      else add('bad', mt('Core mancante: {core}', { core }), cores, mt('In RetroArch: Carica core → Scarica un core.'))
    }
  }

  const usesMame = c.gameCount('mame') > 0 || !!s.mamePath
  if (!s.mamePath) add(usesMame ? 'warn' : 'ok', mt('MAME non indicato'), '', mt('Serve solo per il sistema Arcade (MAME) e per i titoli delle console dalle Software List.'))
  else if (!existsSync(s.mamePath)) add('bad', mt('mame.exe non trovato'), s.mamePath, mt('Correggi il percorso nelle Impostazioni.'))
  else add('ok', 'MAME', s.mamePath)

  if (s.datDir) add(isDir(s.datDir) ? 'ok' : 'warn', mt('Cartella DAT'), s.datDir, isDir(s.datDir) ? '' : mt('La cartella non esiste.'))
  if (s.mediaDir) add(isDir(s.mediaDir) ? 'ok' : 'warn', mt('Cartella immagini/Multimedia'), s.mediaDir, isDir(s.mediaDir) ? '' : mt('La cartella non esiste: filmati e musica non saranno disponibili.'))

  // BIOS per sistema (solo per i sistemi in cui l'utente ha dei giochi)
  for (const st of biosStatus(s)) {
    if (c.gameCount(st.rule.systemId) > 0 && !st.found) add('bad', mt('BIOS mancante per {name}', { name: st.rule.name }), '', mt('Copia {file} in {where}.', { file: st.rule.anyOf[0], where: st.rule.where }))
  }

  // sistemi: cartella e numero di giochi
  for (const sys of c.systems.filter((x) => x.phase === 1)) {
    const dir = s.romsDir ? systemDir(sys, s) : ''
    if (dir && isDir(dir)) {
      const n = c.gameCount(sys.id)
      add(n > 0 ? 'ok' : 'warn', mt('{name}: {n} giochi', { name: sys.name, n: n.toLocaleString(numLocale()) }), dir, n > 0 ? '' : mt('Cartella vuota o senza file con le estensioni giuste.'))
    }
  }
  // bordi grafici: quale file userà ogni sistema (utile quando "non cambia")
  if (s.overlayEnabled) {
    const list = c.systems.filter((x) => x.phase === 1 && x.core && c.gameCount(x.id) > 0)
    const lines = list.map((x) => `${x.name} → ${resolveOverlay(s, x.id)?.replace(/^.*[\\/]/, '') ?? mt('(nessuno)')}`)
    const any = list.some((x) => resolveOverlay(s, x.id))
    add(any ? 'ok' : 'warn', mt('Bordi grafici attivi'), lines.join(' · ') || mt('(nessun sistema con giochi)'), any ? '' : mt('Indica la cartella dei bordi o un bordo comune in Impostazioni → Aspetto.'))
  }
  // salvataggi: cartella, stati trovati e cosa ha scritto RetroArch nell'ultima partita
  {
    const root = savesRoot(s)
    let states = 0
    try {
      states = readdirSync(join(root, 'states')).filter((f) => /\.state\.auto$/.test(f)).length
    } catch {
      // cartella ancora inesistente
    }
    add(existsSync(root) ? 'ok' : 'warn', mt('Cartella dei salvataggi'), mt('{root} · {states} · ripresa console {resume}', { root, states: `${states} ${states === 1 ? mt('partita ripresa') : mt('partite riprese')}`, resume: s.resumeConsoles ? mt('attiva') : mt('spenta') }), existsSync(root) ? '' : mt('Si crea alla prima partita.'))
  }
  const hidden = s.hiddenSystems ?? []
  if (hidden.length) add('ok', mt('Sistemi nascosti: {n}', { n: hidden.length }), hidden.join(', '))

  const mainLog = tail(join(c.userData, 'main.log'), 4000)
  const mameLog = tail(join(c.userData, 'mame', 'last-error.log'), 3000)
  const raLines = tail(join(c.userData, 'retroarch-last.log'), 200000)
    .split(/\r?\n/)
    .filter((l) => /\[State\]|auto.?sav|savestate|\.srm|\[SRAM\]|\[Core\] (Loaded|Version)|Failed|failed/i.test(l))
    .slice(-14)
    .join('\n')
  if (mainLog) add('warn', mt('Il programma ha registrato errori imprevisti'), mt('vedi il testo copiabile'), mt('Mandami il testo della diagnostica.'))

  const icon = { ok: '[OK]  ', warn: '[ATTENZIONE]', bad: '[PROBLEMA]' } as const
  const text = [
    `Mr. Emulator ${c.version} — ${c.os}`,
    `Data: ${new Date().toISOString()}`,
    '',
    ...checks.map((k) => `${icon[k.level]} ${k.title}${k.detail ? ` — ${k.detail}` : ''}${k.fix ? `\n          → ${k.fix}` : ''}`),
    mainLog ? `\n--- main.log (ultime righe) ---\n${mainLog}` : '',
    mameLog ? `\n--- ultimo errore MAME ---\n${mameLog}` : '',
    raLines ? `\n--- ultima partita con RetroArch (salvataggi e errori) ---\n${raLines}` : ''
  ].join('\n')
  return { checks, text, problems: checks.filter((k) => k.level === 'bad').length, warnings: checks.filter((k) => k.level === 'warn').length }
}
