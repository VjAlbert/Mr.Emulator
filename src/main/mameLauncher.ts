import { spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join, parse } from 'path'
import { app } from 'electron'
import type { Game, LaunchResult, Settings, SystemDef } from '@shared/types'
import { toIniText } from './profiles'
import { systemDir } from './paths'
import { readZipInfo } from './zipinfo'

/** Se MAME si chiude entro questo tempo, quasi sicuramente non è partito (anche senza messaggi di errore) */
const QUICK_EXIT_MS = 4000
/** Un crash entro questo tempo dall'avvio fa riprovare con un profilo più prudente */
const RETRY_WITHIN_MS = 20000
/** Se MAME è ancora in esecuzione dopo questo tempo, quel profilo ha funzionato */
const SUCCESS_AFTER_MS = 6000

/**
 * Scala di profili, dal più ricco al più prudente. Se MAME va in crash all'avvio si scende di un gradino;
 * il livello che funziona viene ricordato per quel gioco e dice dove sta il problema (shader, video, comandi, audio).
 */
const LEVELS = [
  { note: '' },
  { note: 'senza shader (video predefinito di MAME)' },
  { note: 'con il video OpenGL' },
  { note: 'con il video semplice GDI' },
  { note: 'con video GDI, senza comandi personalizzati e senza audio' }
]

/** Righe di "traccia dello stack" stampate da MAME quando va in crash: non spiegano la causa */
const isTrace = (l: string): boolean =>
  /^[0-9a-f]{8,16}: [0-9a-f]{8,16}\b/i.test(l) ||
  /\+0x[0-9a-f]+\)?$/i.test(l) ||
  /^([A-Z][A-Z0-9]{1,3}=[0-9a-f]{4,16}\s*)+$/i.test(l) || // scarico dei registri: "R12=0000… R13=0000…"
  /^-{5,}$/.test(l) ||
  /^Stack crawl:?$/i.test(l)

/** Separa i messaggi utili dalla traccia dello stack e riconosce un crash */
export function analyzeOutput(out: string): { info: string[]; crashed: boolean } {
  const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const info = lines.filter((l) => !isTrace(l))
  const traceLines = lines.length - info.length
  const crashed = /ACCESS VIOLATION|Exception at|unhandled exception|stack overflow|segmentation|illegal instruction|assertion failed/i.test(out) || traceLines >= 3
  return { info, crashed }
}

/**
 * Avvia un gioco con il MAME autonomo dell'utente.
 * - Se MAME va in crash subito, riprova una volta senza shader né modalità video particolari.
 * - Se alla fine non parte, spiega perché (ZIP mancanti, set di un'altra versione, crash) e controlla le ROM del gioco.
 */
export function launchMame(
  game: Game,
  system: SystemDef,
  settings: Settings,
  ini: Record<string, string>,
  ctrlr: { name: string; xml: string },
  onStart: () => void,
  onExit: () => void,
  onFail: (message: string) => void,
  onNote: (message: string) => void = () => undefined,
  /** Controllo ROM del solo gioco, eseguito dopo un fallimento: restituisce una frase da aggiungere al messaggio */
  postCheck?: () => Promise<string>,
  /** Livello di partenza (ricordato per i giochi che richiedono un profilo prudente) e funzione per ricordarne uno nuovo */
  startLevel = 0,
  onProfile: (level: number) => void = () => undefined
): LaunchResult {
  if (game.demo) return { ok: false, error: 'Questo è un gioco di esempio. Imposta la cartella ROM nelle impostazioni.' }
  if (!settings.mamePath || !existsSync(settings.mamePath)) {
    return { ok: false, error: 'MAME non trovato. Indica il percorso di mame.exe nelle impostazioni.' }
  }
  const machine = game.machine ?? parse(game.path).name
  // game.path è già assoluto: la cartella dello ZIP può essere una sottocartella
  const base = systemDir(system, settings)
  // MAME cerca ogni ZIP nelle cartelle in questo ordine: prima i giochi, poi i CHD, infine la cartella BIOS
  // (così gli ZIP di sistema come neogeo.zip si possono tenere in bios\)
  const paths = [...new Set([dirname(game.path), base, settings.mameChdDir, settings.biosDir].filter(Boolean))]

  // configurazione di Mr. Emulator: separata da quella eventuale di MAME, così non la tocca
  const dir = join(app.getPath('userData'), 'mame')
  for (const d of ['cfg', 'nvram', 'sta', 'snap', 'diff', 'comments', 'ctrlr']) mkdirSync(join(dir, d), { recursive: true })
  const writeIni = (level: number): void => {
    const full: Record<string, string> = {
      ...ini,
      rompath: paths.join(';'),
      cfg_directory: join(dir, 'cfg'),
      nvram_directory: join(dir, 'nvram'),
      state_directory: join(dir, 'sta'),
      snapshot_directory: join(dir, 'snap'),
      diff_directory: join(dir, 'diff'),
      comment_directory: join(dir, 'comments')
    }
    if (level >= 1) {
      // niente shader, video predefinito di MAME
      delete full['video']
      delete full['bgfx_screen_chains']
    }
    if (level === 2) {
      // stessa scheda video ma con OpenGL al posto di Direct3D: aggira i crash del driver Direct3D
      full['video'] = 'bgfx'
      full['bgfx_backend'] = 'opengl'
    }
    if (level >= 3) full['video'] = 'gdi' // modalità software: la più compatibile
    if (level >= 4) full['sound'] = 'none'
    writeFileSync(join(dir, 'mame.ini'), toIniText(full), 'utf-8')
  }
  writeFileSync(join(dir, 'ctrlr', `${ctrlr.name}.cfg`), ctrlr.xml, 'utf-8')

  const argsFor = (level: number): string[] =>
    level >= 4 ? [machine, '-inipath', dir] : [machine, '-inipath', dir, '-ctrlrpath', join(dir, 'ctrlr'), '-ctrlr', ctrlr.name]

  const fail = async (out: string, elapsed: number, code: number | null, level: number): Promise<void> => {
    // il testo completo di MAME si salva, così si può guardare o mandare a chi aiuta
    const logFile = join(dir, 'last-error.log')
    try {
      writeFileSync(logFile, out, 'utf-8')
    } catch {
      // senza file di log il messaggio c'è comunque
    }
    let msg = await diagnose(out, paths, game.name, code, elapsed, level)
    if (postCheck) {
      try {
        const extra = await postCheck()
        if (extra) msg += ` ${extra}`
      } catch {
        // il controllo delle ROM è un di più: se non riesce si mostra solo il messaggio
      }
    }
    onFail(msg)
  }

  const run = (level: number): void => {
    writeIni(level)
    const child = spawn(settings.mamePath, argsFor(level), { cwd: dirname(settings.mamePath), windowsHide: false, stdio: ['ignore', 'pipe', 'pipe'] })
    const started = Date.now()
    let out = ''
    const keep = (b: Buffer): void => {
      out = (out + b.toString()).slice(-20000)
    }
    child.stdout?.on('data', keep)
    child.stderr?.on('data', keep)
    if (level === startLevel) child.once('spawn', onStart) // nei tentativi successivi la finestra è già nascosta
    // se dopo qualche secondo MAME è ancora in esecuzione, questo profilo ha funzionato: si ricorda per quel gioco
    const ok = setTimeout(() => {
      if (level > 0 && level !== startLevel) {
        onProfile(level)
        onNote(`Il gioco è partito ${LEVELS[level].note}: ricordo questa scelta per questo gioco.`)
      }
    }, SUCCESS_AFTER_MS)
    child.once('error', () => {
      clearTimeout(ok)
      onExit()
      onFail('MAME non si è avviato. Controlla il percorso di mame.exe nelle impostazioni.')
    })
    child.once('close', (code) => {
      clearTimeout(ok)
      const elapsed = Date.now() - started
      const failed = (code !== 0 && code !== null && elapsed < 60000) || elapsed < QUICK_EXIT_MS
      if (!failed) return onExit()
      const { crashed } = analyzeOutput(out)
      // (con file mancanti o sbagliati riprovare non serve: l'errore sarebbe lo stesso)
      const romProblem = /NOT FOUND|Required files are missing|INCORRECT/.test(out)
      if (level < LEVELS.length - 1 && !romProblem && (crashed || code !== 0) && elapsed < RETRY_WITHIN_MS) {
        onNote(`MAME si è chiuso con un errore: riprovo ${LEVELS[level + 1].note}…`)
        run(level + 1)
        return
      }
      onExit()
      void fail(out, elapsed, code, level)
    })
  }

  try {
    run(startLevel)
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

const fmtSize = (b: number): string => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

/**
 * Traduce l'errore di MAME in una spiegazione: quale ZIP manca, oppure quale ZIP c'è ma non contiene
 * i file richiesti (copia incompleta o set di un'altra versione).
 */
export async function diagnose(out: string, paths: string[], gameName: string, code: number | null = 1, elapsed = 0, level = 0): Promise<string> {
  // "xxx NOT FOUND (tried in kof96 neogeo)"
  const missingFiles: Array<{ file: string; sets: string[] }> = []
  for (const m of out.matchAll(/(\S+) NOT FOUND \(tried in ([^)]+)\)/g)) missingFiles.push({ file: m[1], sets: m[2].split(/\s+/).filter(Boolean) })
  const tried = new Set(missingFiles.flatMap((f) => f.sets))

  const locate = (name: string): string | null => {
    for (const d of paths) for (const ext of ['zip', '7z']) if (existsSync(join(d, `${name}.${ext}`))) return join(d, `${name}.${ext}`)
    return null
  }
  const absent = [...tried].filter((n) => !locate(n))
  if (absent.length) {
    return (
      `Manca ${absent.map((n) => `${n}.zip`).join(' e ')} (serve a "${gameName}"). Non lo trovo in: ${paths.join(' · ')}. ` +
      'Copialo direttamente in una di queste cartelle, non in una sottocartella.'
    )
  }

  // gli ZIP ci sono: si guarda cosa contengono davvero
  const infos = new Map<string, Awaited<ReturnType<typeof readZipInfo>>>()
  const unreadable: string[] = []
  for (const set of tried) {
    const file = locate(set)
    if (!file || !file.endsWith('.zip')) continue
    const info = await readZipInfo(file)
    infos.set(set, info)
    if (!info) unreadable.push(`${set}.zip`)
  }
  if (unreadable.length) {
    return `MAME non ha avviato "${gameName}": ${unreadable.join(', ')} non si riesce a leggere come ZIP (file danneggiato o copia interrotta). Ricopialo dalla sorgente.`
  }

  const lacking: string[] = []
  const different: string[] = []
  for (const f of missingFiles) {
    const lower = f.file.toLowerCase()
    const present = f.sets.some((set) => infos.get(set)?.names.some((n) => n.toLowerCase() === lower))
    if (present) different.push(f.file)
    else lacking.push(f.file)
  }
  if (lacking.length || different.length) {
    const where = [...infos.entries()].map(([set, i]) => (i ? `${set}.zip ${fmtSize(i.size)}, ${i.names.length} file` : set)).join(' · ')
    const parts: string[] = []
    if (lacking.length) parts.push(`dentro agli ZIP (${where}) mancano: ${lacking.join(', ')}`)
    if (different.length) parts.push(`questi file ci sono ma con contenuto diverso da quello atteso: ${different.join(', ')}`)
    return (
      `MAME non ha avviato "${gameName}": ${parts.join(' · ')}. ` +
      (lacking.length
        ? 'Probabile copia incompleta dello ZIP, oppure set di un\'altra versione di MAME: ricopialo dalla sorgente e controlla che sia il set della versione di MAME in uso.'
        : 'Il set non corrisponde alla versione di MAME in uso.')
    )
  }
  const { info, crashed } = analyzeOutput(out)
  // il messaggio più utile: la riga dell'eccezione o dell'errore fatale, altrimenti le ultime righe leggibili
  const key = info.find((l) => /Exception|ACCESS VIOLATION|Fatal error|error:/i.test(l))
  const tail = (key ?? info.slice(-3).join(' · ')).slice(0, 220)
  if (crashed) {
    // un offset enorme dal simbolo più vicino = l'indirizzo è fuori dal codice di MAME: libreria di Windows o driver
    const external = /\+0x[0-9a-f]{7,}\)/i.test(key ?? '')
    return (
      `MAME è andato in crash avviando "${gameName}"${level > 0 ? ` (anche ${LEVELS[level].note})` : ''}: non è un file mancante.` +
      (external ? ' Il blocco avviene in una libreria esterna a MAME (di Windows o del driver video/audio): prova ad aggiornare i driver della scheda video e dell\'audio.' : '') +
      (tail ? ` Messaggio: ${tail}.` : '') +
      ' Clicca questo avviso per copiare i dettagli completi.'
    )
  }
  if (!tail && (code === 0 || code === null)) {
    const sec = Math.max(1, Math.round(elapsed / 1000))
    return `MAME si è chiuso dopo ${sec} second${sec === 1 ? 'o' : 'i'} senza scrivere errori: il gioco non è partito. Se non l'hai chiuso tu, prova "Controlla questo gioco" e il Controllo ROM.`
  }
  return `MAME non ha avviato "${gameName}": ${tail || `uscito con errore ${code}`}`
}
