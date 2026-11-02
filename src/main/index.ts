import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from 'electron'
import { pathToFileURL } from 'url'
import { createReadStream, statSync } from 'fs'
import { Readable } from 'stream'
import { extname } from 'path'
import { MEDIA_MIME, parseRange } from './rangeFile'
import { tmpdir } from 'os'
import { basename, join } from 'path'
import type { ArtKind, Feedback, Game, GameEnded, OptimizationReport, PickKind, Settings, SystemDef, SystemInfo, VerifyState } from '@shared/types'
import { mkdirSync } from 'fs'
import { SYSTEMS } from './systems'
import { loadSettings, saveSettings } from './settings'
import { demoGames } from './scanner'
import { createLibrary } from './library'
import { launchGame } from './launcher'
import { platform } from './platform'
import { ensureFolders } from './folders'
import { detectHardware } from './hardware'
import { buildReport, mameProfileFor, profileFor } from './optimize'
import { toConfigText } from './profiles'
import { setHighPerformanceGpu } from './gpuPref'
import { buildInputConfig, buildInputMap, buildMameCtrlr } from './inputs'
import { ART_SCHEME, arcadeTitles, clearArtMisses, clearLocalArt, getArt, resolveArtUrl, setMameTitleProvider, setMediaProvider, setSoftTitleProvider } from './artwork'
import { MediaSource } from './media'
import { runVerify, type VerifyBad } from './verify'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { loadMameData, type MameData } from './mame'
import { buildDiagnostics } from './diagnostics'
import { writeFileAtomic } from './atomic'
import { softTitles } from './softlist'
import { datTitles } from './datfiles'
import { launchMame } from './mameLauncher'
import { mameFolderName, systemDir } from './paths'

protocol.registerSchemesAsPrivileged([
  { scheme: ART_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } },
  // filmati e musica: "stream" serve perché il lettore chieda porzioni di file
  { scheme: 'mrmedia', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
])

/** Indirizzi dei file multimediali: la pagina riceve un codice, mai un percorso, e solo i file indicizzati si possono leggere */
const mediaTokens = new Map<string, string>()
const mediaByPath = new Map<string, string>()
let mediaSeq = 0
function mediaUrl(path: string): string {
  let id = mediaByPath.get(path)
  if (!id) {
    id = String(++mediaSeq)
    mediaByPath.set(path, id)
    mediaTokens.set(id, path)
    if (mediaTokens.size > 3000) {
      const first = mediaTokens.keys().next().value as string
      mediaByPath.delete(mediaTokens.get(first)!)
      mediaTokens.delete(first)
    }
  }
  return `mrmedia://m/${id}`
}

// Cache di Chromium in una cartella temporanea e senza cache degli shader su disco:
// evita gli avvisi "Unable to move the cache" quando un'altra copia ha la cartella bloccata.
app.commandLine.appendSwitch('disk-cache-dir', join(tmpdir(), 'mr-emulator-cache'))
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')

let win: BrowserWindow | null = null
let gpuPref: OptimizationReport['gpuPreference'] = 'off'

/** Sui portatili con due schede video, fa usare quella potente a RetroArch */
async function applyGpuPreference(s: Settings): Promise<void> {
  const hw = await detectHardware(false)
  if (!s.dedicatedGpu) gpuPref = 'off'
  else if (process.platform !== 'win32') gpuPref = 'unsupported'
  else if (!hw.hybridGpu) gpuPref = 'not-needed'
  else if (!s.retroarchPath) gpuPref = 'off'
  else gpuPref = (await setHighPerformanceGpu(s.retroarchPath)) ? 'applied' : 'failed'
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#0b0b12',
    autoHideMenuBar: true,
    title: 'Mr. Emulator',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      autoplayPolicy: 'no-user-gesture-required'
    }
  })
  // nessun menu: il tasto Alt (pulsante 2 sul pannello arcade) non deve far comparire barre
  Menu.setApplicationMenu(null)
  win.removeMenu()
  win.setMenuBarVisibility(false)
  // se la finestra si blocca o la sua parte grafica si chiude da sola, si registra e si ricarica invece di restare nera
  let reloads = 0
  win.webContents.on('render-process-gone', (_e, d) => {
    logCrash('render-process-gone', d.reason)
    if (reloads++ < 3 && win && !win.isDestroyed()) win.webContents.reload()
  })
  win.webContents.on('unresponsive', () => logCrash('unresponsive', 'la finestra non risponde'))
  win.webContents.on('did-fail-load', (_e, code, desc) => logCrash('did-fail-load', `${code} ${desc}`))
  if (process.env['ELECTRON_RENDERER_URL']) win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  else win.loadFile(join(__dirname, '../renderer/index.html'))
}

/** Elenco delle macchine del MAME dell'utente: si legge una volta e si riusa */
let mameCache: { key: string; data: Promise<MameData | null> } | null = null
function getMame(onProgress?: (n: number) => void, force = false): Promise<MameData | null> {
  const key = loadSettings().mamePath
  if (force || !mameCache || mameCache.key !== key) {
    mameCache = { key, data: loadMameData(key, join(app.getPath('userData'), 'library'), onProgress) }
  }
  return mameCache.data
}
/** Immagini locali (Multimedia): una sola istanza finché la cartella non cambia */
let mediaSrc: { dir: string; src: MediaSource } | null = null
function getMedia(): MediaSource | null {
  const dir = loadSettings().mediaDir
  if (!dir) return null
  if (!mediaSrc || mediaSrc.dir !== dir) mediaSrc = { dir, src: new MediaSource(dir) }
  return mediaSrc.src
}
setMediaProvider(getMedia)
const consoleTitles = async (sys: SystemDef): Promise<Map<string, string> | null> => {
  const s = loadSettings()
  const dat = datTitles(s.datDir, sys.id)
  const soft = await softTitles(s.mamePath, sys.softlist ?? [], join(app.getPath('userData'), 'artwork', '_dat'))
  if (!dat) return soft
  if (soft) for (const [k, v] of soft) if (!dat.has(k)) dat.set(k, v)
  return dat
}
setSoftTitleProvider(consoleTitles)

setMameTitleProvider(async () => {
  const d = await getMame()
  if (!d) return null
  return {
    parentOf: (n) => d.machines.get(n)?.cloneof ?? undefined,
    siblingTitles: (n) => {
      const m = d.machines.get(n)
      const root = m?.cloneof ?? n
      const rank = (t: string): number => (/\((USA|US)\b/.test(t) ? 0 : /World/.test(t) ? 1 : /Euro/.test(t) ? 2 : /Japan/.test(t) ? 3 : 4)
      return [d.machines.get(root), ...(d.children.get(root) ?? [])]
        .filter((x): x is NonNullable<typeof x> => !!x && x.name !== n && !/bootleg|hack/i.test(`${x.description} ${x.manufacturer}`))
        .map((x) => x.description)
        .sort((a, b) => rank(a) - rank(b))
    },
    titleOf: (n) => d.machines.get(n)?.description,
    parentTitleOf: (n) => {
      const p = d.machines.get(n)?.cloneof
      return p ? d.machines.get(p)?.description : undefined
    }
  }
})

/** Controllo ROM con MAME: risultato dell'ultima verifica (salvato su disco) e controllo in corso */
const verifyFile = (): string => join(app.getPath('userData'), 'library', 'verify-mame.json')
let verifyState: VerifyState = { running: false, checked: 0, bad: 0, summary: null, badList: [], tail: [] }
let verifyRun: { cancel: () => void } | null = null
let badNames = new Set<string>()
try {
  if (existsSync(verifyFile())) {
    const saved = JSON.parse(readFileSync(verifyFile(), 'utf-8')) as VerifyState
    verifyState = { ...saved, running: false }
    badNames = new Set(verifyState.badList.map((b) => b.name))
  }
} catch {
  // nessun risultato salvato valido: si riparte da zero
}

const library = createLibrary({
  isBad: (n) => badNames.has(n),
  cacheDir: join(app.getPath('userData'), 'library'),
  systems: SYSTEMS,
  getSettings: loadSettings,
  titles: arcadeTitles,
  softTitles: consoleTitles,
  mame: (onProgress) => getMame(onProgress),
  signature: (sys) => {
    if (sys.softlist) return `${loadSettings().mamePath}|${loadSettings().datDir}`
    if (sys.engine !== 'mame') return ''
    const s = loadSettings()
    return `${s.mamePath}|${s.mameClones}|${s.mameRomDir}|${s.hideBadRoms}`
  },
  emit: (e) => win?.webContents.send('library:event', e)
})

/** Registro degli errori imprevisti: un cabinato non deve mostrare finestre di errore, e a me serve sapere cosa è successo */
function logCrash(kind: string, err: unknown): void {
  try {
    const text = err instanceof Error ? `${err.message}\n${err.stack ?? ''}` : String(err)
    const file = join(app.getPath('userData'), 'main.log')
    const old = existsSync(file) ? readFileSync(file, 'utf-8').slice(-60000) : ''
    writeFileAtomic(file, `${old}[${new Date().toISOString()}] ${kind}: ${text}\n\n`)
  } catch {
    // il registro è un extra: mai un errore causato dal registro
  }
}
process.on('uncaughtException', (e) => logCrash('uncaughtException', e))
process.on('unhandledRejection', (e) => logCrash('unhandledRejection', e))

// una sola copia del programma: con l'avvio automatico con Windows una seconda copia andrebbe a sovrapporsi alla prima
if (!app.requestSingleInstanceLock()) app.quit()
else
  app.on('second-instance', () => {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

app.whenReady().then(async () => {
  protocol.handle('mrmedia', (req) => {
    const path = mediaTokens.get(new URL(req.url).pathname.slice(1))
    if (!path || !existsSync(path)) return new Response('Not found', { status: 404 })
    const size = statSync(path).size
    const mime = MEDIA_MIME[extname(path).toLowerCase()] ?? 'application/octet-stream'
    const range = parseRange(req.headers.get('range'), size)
    if (range === 'invalid') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    const body = Readable.toWeb(createReadStream(path, range ? { start: range.start, end: range.end } : undefined)) as unknown as ReadableStream
    const headers: Record<string, string> = { 'Content-Type': mime, 'Accept-Ranges': 'bytes' }
    if (range) {
      headers['Content-Range'] = `bytes ${range.start}-${range.end}/${size}`
      headers['Content-Length'] = String(range.end - range.start + 1)
    } else headers['Content-Length'] = String(size)
    return new Response(body, { status: range ? 206 : 200, headers })
  })

  protocol.handle(ART_SCHEME, (req) => {
    const file = resolveArtUrl(req.url)
    return file ? net.fetch(pathToFileURL(file).toString()) : new Response('Not found', { status: 404 })
  })

  ipcMain.handle('art:get', (_e, game: Game, kind: ArtKind, cachedOnly?: boolean) => {
    const system = SYSTEMS.find((s) => s.id === game.systemId)
    // cachedOnly (rotazione a riposo): niente download, si usa solo ciò che c'è già sul disco
    return system ? getArt(game, system, loadSettings().downloadArt && !cachedOnly, kind) : null
  })

  ipcMain.handle('systems:get', (): SystemInfo[] => {
    const settings = loadSettings()
    return SYSTEMS.map((s) => ({ ...s, hidden: (settings.hiddenSystems ?? []).includes(s.id), gameCount: settings.romsDir ? library.count(s.id) : demoGames(s).length }))
  })

  ipcMain.handle('games:get', async (_e, systemId: string) => {
    const settings = loadSettings()
    const system = SYSTEMS.find((s) => s.id === systemId)
    if (!system) return []
    return settings.romsDir ? library.games(systemId) : demoGames(system)
  })

  // Primo avvio: prepara Documenti\MrEmulator con ROM e BIOS
  {
    const current = loadSettings()
    if (!current.romsDir || !current.biosDir) {
      // primo avvio: se il PC è debole si parte con gli effetti dell'interfaccia ridotti
      const hw = await detectHardware(false)
      saveSettings(ensureFolders({ ...current, lightEffects: hw.level === 'light' }))
    }
    await applyGpuPreference(loadSettings())
  }

  /** Nomi con cui cercare i media di un gioco: nome breve e, per le varianti, quello del gioco principale */
  async function mediaNames(game: Game): Promise<string[]> {
    const system = SYSTEMS.find((s) => s.id === game.systemId)
    if (!system || (system.engine !== 'mame' && !system.titleDat)) return []
    const stem = (game.machine ?? game.fileName.replace(/\.[^.]+$/, '')).toLowerCase()
    let parent = ''
    if (system.engine === 'mame') parent = (await getMame())?.machines.get(stem)?.cloneof ?? ''
    return [stem, parent].filter(Boolean)
  }
  ipcMain.handle('media:video', async (_e, game: Game) => {
    const media = getMedia()
    if (!media || game.demo) return null
    const file = await media.findVideo(await mediaNames(game))
    return file ? mediaUrl(file) : null
  })
  ipcMain.handle('media:tracks', async (_e, game: Game) => {
    const media = getMedia()
    if (!media || game.demo) return []
    return (await media.findTracks(await mediaNames(game))).map((t) => ({ title: t.title, url: mediaUrl(t.path) }))
  })

  // analisi della cartella delle immagini locali: dice cosa riconosce (cartelle, archivi, quante immagini)
  ipcMain.handle('media:analyze', async () => {
    const dir = loadSettings().mediaDir
    if (!dir) return { base: '', found: [], other: [], unsupported: [], error: 'Indica prima la cartella delle immagini e premi SALVA.' }
    mediaSrc = { dir, src: new MediaSource(dir) }
    return mediaSrc.src.analyze()
  })

  ipcMain.handle('mame:last-log', () => {
    try {
      return readFileSync(join(app.getPath('userData'), 'mame', 'last-error.log'), 'utf-8').slice(-8000)
    } catch {
      return ''
    }
  })

  // ---- controllo ROM ----
  const mameSys = SYSTEMS.find((x) => x.engine === 'mame')!
  /** File di configurazione minimo per la verifica: solo le cartelle dove cercare gli ZIP */
  const verifyIni = (s: Settings): string => {
    const dir = join(app.getPath('userData'), 'mame-verify')
    mkdirSync(dir, { recursive: true })
    const paths = [systemDir(mameSys, s), s.mameChdDir, s.biosDir].filter(Boolean)
    writeFileSync(join(dir, 'mame.ini'), `rompath                     ${paths.join(';')}\n`, 'utf-8')
    return dir
  }
  const pushVerify = (): void => {
    win?.webContents.send('verify:state', verifyState)
  }

  ipcMain.handle('verify:get', () => verifyState)

  ipcMain.handle('verify:start', async () => {
    const s = loadSettings()
    if (verifyRun) return { ok: false, error: 'Il controllo è già in corso.' }
    if (!s.mamePath || !existsSync(s.mamePath)) return { ok: false, error: 'Indica prima il percorso di mame.exe nelle Impostazioni.' }
    const data = await getMame()
    const job = runVerify(s.mamePath, ['-verifyroms', '-inipath', verifyIni(s)], (checked, bad) => {
      verifyState = { ...verifyState, running: true, checked, bad }
      pushVerify()
    })
    verifyRun = job
    verifyState = { running: true, checked: 0, bad: 0, summary: null, badList: [], tail: [] }
    pushVerify()
    void job.done.then((r) => {
      verifyRun = null
      const bad: VerifyBad[] = r.bad
      verifyState = {
        running: false,
        checked: r.checked,
        bad: bad.length,
        summary: { at: r.at, version: data?.version ?? '', checked: r.checked, good: r.good, badCount: bad.length, cancelled: r.cancelled },
        badList: bad,
        tail: r.tail
      }
      badNames = new Set(bad.map((b) => b.name))
      try {
        mkdirSync(join(app.getPath('userData'), 'library'), { recursive: true })
        writeFileAtomic(verifyFile(), JSON.stringify(verifyState))
      } catch {
        // il risultato si vede comunque; solo non resta al prossimo avvio
      }
      pushVerify()
      if (loadSettings().hideBadRoms) library.rescan(false)
    })
    return { ok: true }
  })

  ipcMain.handle('verify:cancel', () => {
    verifyRun?.cancel()
  })

  // un solo gioco: pochi secondi
  ipcMain.handle('verify:machine', async (_e, name: string) => {
    const s = loadSettings()
    if (!s.mamePath || !existsSync(s.mamePath)) return { ok: false, issues: [], error: 'MAME non trovato.' }
    const r = await runVerify(s.mamePath, ['-verifyroms', name, '-inipath', verifyIni(s)]).done
    const hit = r.bad.find((b) => b.name === name)
    return { ok: true, issues: hit?.issues ?? [] }
  })

  ipcMain.handle('library:status', () => library.status())
  ipcMain.handle('library:stats', (_e, systemId: string) => library.stats(systemId))

  // preferiti e ultimi giochi: si salvano insieme alle impostazioni
  ipcMain.handle('prefs:get', () => {
    const s = loadSettings()
    return { favorites: s.favorites, recents: s.recents }
  })
  ipcMain.handle('prefs:toggle-favorite', (_e, id: string) => {
    const s = loadSettings()
    const favorites = s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id]
    saveSettings({ ...s, favorites })
    return favorites
  })
  ipcMain.handle('settings:get', () => loadSettings())
  ipcMain.handle('settings:save', (_e, s: Settings) => {
    const before = loadSettings()
    const saved = saveSettings(s)
    void applyGpuPreference(saved)
    try {
      ensureFolders(saved) // se la cartella indicata non ha le sottocartelle, le crea
    } catch {
      // cartella non scrivibile: nessun problema, resta quella scelta dall'utente
    }
    // un MAME diverso può comportarsi diversamente: le scelte prudenti ricordate si azzerano
    if (before.mamePath !== saved.mamePath && (Object.keys(saved.launchFix).length || saved.launchFloor)) saveSettings({ ...saved, launchFix: {}, launchFloor: 0 })
    if (before.mediaDir !== saved.mediaDir) {
      clearLocalArt()
      mediaSrc = null
    }
    if (before.datDir !== saved.datDir) clearArtMisses()
    if (before.romsDir !== saved.romsDir || before.datDir !== saved.datDir || before.showUnsupported !== saved.showUnsupported || before.mamePath !== saved.mamePath || before.mameClones !== saved.mameClones || before.mameRomDir !== saved.mameRomDir || before.hideBadRoms !== saved.hideBadRoms) {
      library.rescan(before.romsDir !== saved.romsDir || before.mameRomDir !== saved.mameRomDir)
    }
    return saved
  })
  ipcMain.handle('folder:setup', () => {
    const next = saveSettings(ensureFolders(loadSettings()))
    library.rescan(false)
    return next
  })

  /** Cartella dedicata alla versione di MAME (es. roms\mame0229), creata accanto alle altre cartelle ROM */
  async function mameVersionFolder(s: Settings): Promise<{ ok: boolean; path: string; error?: string }> {
    if (!s.mamePath) return { ok: false, path: '', error: 'Indica prima il percorso di mame.exe e premi VERIFICA MAME.' }
    const d = await getMame()
    if (!d) return { ok: false, path: '', error: 'MAME non risponde: controlla il percorso di mame.exe.' }
    const path = join(s.romsDir, mameFolderName(d.version))
    mkdirSync(path, { recursive: true })
    return { ok: true, path }
  }

  ipcMain.handle('mame:make-folder', async () => {
    const s = loadSettings()
    const r = await mameVersionFolder(s)
    if (r.ok) {
      saveSettings({ ...s, mameRomDir: r.path })
      library.rescan(true)
    }
    return r
  })

  // "tutto su un altro disco": ROM, BIOS e cartella MAME di questa versione dentro la cartella scelta
  ipcMain.handle('folders:setup-root', async (_e, rootDir: string) => {
    const s = loadSettings()
    const next: Settings = { ...s, romsDir: join(rootDir, 'roms'), biosDir: join(rootDir, 'bios'), mameRomDir: '' }
    mkdirSync(next.romsDir, { recursive: true })
    const r = s.mamePath ? await mameVersionFolder(next) : null
    if (r?.ok) next.mameRomDir = r.path
    const saved = saveSettings(ensureFolders(next))
    void applyGpuPreference(saved)
    library.rescan(true)
    return saved
  })
  ipcMain.handle('folder:open', async (_e, target: string) => {
    const s = ensureFolders(loadSettings())
    const sys = SYSTEMS.find((x) => x.id === target)
    const dir = target === 'bios' ? s.biosDir : sys ? systemDir(sys, s) : s.romsDir
    await shell.openPath(dir)
  })

  ipcMain.handle('dialog:pick', async (_e, kind: PickKind) => {
    const res = await dialog.showOpenDialog(win!, {
      properties: [kind === 'dir' ? 'openDirectory' : 'openFile'],
      filters: kind === 'file' ? [platform.exeFilter] : undefined
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('game:launch', async (_e, game: Game) => {
    const system = SYSTEMS.find((s) => s.id === game.systemId)
    if (!system) return { ok: false, error: 'Sistema sconosciuto.' }
    const settings = loadSettings()
    // la lista contiene percorsi relativi alla cartella del sistema
    if (!game.demo) game = { ...game, path: join(systemDir(system, settings), game.path) }
    // ultimi giochi avviati (si aggiorna all'avvio, il più recente per primo)
    {
      const cur = loadSettings()
      saveSettings({ ...cur, recents: [game.id, ...cur.recents.filter((x) => x !== game.id)].slice(0, 40) })
    }
    const hw = await detectHardware(true)

    const onEnd = (startedAt: { t: number }) => (): void => {
      win?.show()
      win?.focus()
      const seconds = startedAt.t ? Math.round((Date.now() - startedAt.t) / 1000) : 0
      startedAt.t = 0
      // il parere dell'utente si chiede solo dopo una partita vera
      if (seconds >= 45 && settings.autoTune) {
        const ended: GameEnded = { gameId: game.id, gameName: game.name, systemId: system.id, systemName: system.name, seconds }
        win?.webContents.send('game:ended', ended)
      }
    }

    if (system.engine === 'mame') {
      const { profile } = mameProfileFor(settings, hw, win, system.id)
      const t = { t: 0 }
      return launchMame(
        game,
        system,
        settings,
        profile.ini,
        buildMameCtrlr(settings.inputScheme, settings.arcadeLayout),
        () => {
          t.t = Date.now()
          win?.hide()
        },
        onEnd(t),
        (message) => win?.webContents.send('game:failed', message),
        (note) => win?.webContents.send('game:note', note),
        // dopo un fallimento si controllano le ROM di quel gioco: dice subito se il problema sono i file
        async () => {
          const r = await runVerify(settings.mamePath, ['-verifyroms', game.machine ?? '', '-inipath', verifyIni(settings)]).done
          const hit = r.bad.find((b) => b.name === game.machine)
          if (hit) return `Controllo ROM: ⚠ file difettosi (${hit.issues.slice(0, 3).map((i) => `${i.set}.zip → ${i.file}`).join(' · ')}).`
          return r.checked > 0 ? 'Controllo ROM: ✔ i file del gioco sono a posto, il problema è altrove.' : ''
        },
        // giochi che sono partiti solo con un profilo prudente: si riparte direttamente da quel livello
        Math.max(settings.launchFix[game.machine ?? ''] ?? 0, settings.launchFloor),
        (level) => {
          const cur = loadSettings()
          const launchFix = { ...cur.launchFix, [game.machine ?? '']: level }
          // se almeno due giochi hanno richiesto un profilo prudente, il problema è generale (video/driver):
          // da quel momento tutti partono almeno dal livello più basso che ha funzionato, senza tentativi falliti
          const levels = Object.values(launchFix).filter((l) => l > 0)
          const launchFloor = levels.length >= 2 ? Math.min(...levels) : cur.launchFloor
          saveSettings({ ...cur, launchFix, launchFloor })
        }
      )
    }

    await applyGpuPreference(settings)
    const { profile } = profileFor(system, settings, hw, win)
    const input = buildInputConfig(settings.inputScheme, settings.arcadeLayout, system.id === 'arcade')
    const t = { t: 0 }
    return launchGame(
      game,
      system,
      settings,
      toConfigText({ ...profile.config, ...input }),
      () => {
        t.t = Date.now()
        win?.hide()
      },
      onEnd(t)
    )
  })

  ipcMain.handle('input:map', () => {
    const s = loadSettings()
    return buildInputMap(s.inputScheme, s.arcadeLayout)
  })

  // controllo di mame.exe: versione e quante macchine conosce (rilegge l'elenco da capo)
  ipcMain.handle('mame:check', async () => {
    const s = loadSettings()
    if (!s.mamePath) return { ok: false, version: '', machines: 0, error: 'Indica prima il percorso di mame.exe.' }
    const d = await getMame(undefined, true)
    if (!d) return { ok: false, version: '', machines: 0, error: 'MAME non risponde: controlla che il file sia mame.exe e che si avvii.' }
    library.rescan(false)
    // la cartella dei giochi porta spesso il nome della versione (mame0229): se non coincide con MAME, si avvisa
    const folder = /^mame(\d+)$/i.exec(basename(s.mameRomDir || ''))
    const exeNum = /\(mame(\d+)\)/i.exec(d.version)
    const warning = folder && exeNum && folder[1] !== exeNum[1] ? `La cartella dei giochi si chiama ${basename(s.mameRomDir)} ma questo MAME è ${d.version}: i set ROM valgono solo per la loro versione.` : undefined
    return { ok: true, version: d.version, machines: d.machines.size, warning }
  })

  ipcMain.handle('diagnostics:get', () =>
    buildDiagnostics({
      settings: loadSettings(),
      systems: SYSTEMS,
      gameCount: (id) => library.count(id),
      userData: app.getPath('userData'),
      version: app.getVersion(),
      os: `${process.platform} ${process.getSystemVersion()}`
    })
  )
  ipcMain.handle('report:get', async () => buildReport(loadSettings(), await detectHardware(true), win, gpuPref))

  // risposte dell'utente: correggono il livello di quel sistema (-2 .. +1)
  ipcMain.handle('feedback:send', (_e, systemId: string, answer: Feedback) => {
    const s = loadSettings()
    const cur = s.tuning[systemId] ?? 0
    const next = answer === 'slow' ? cur - 1 : answer === 'better' ? cur + 1 : cur
    saveSettings({ ...s, tuning: { ...s.tuning, [systemId]: Math.min(1, Math.max(-2, next)) } })
  })

  createWindow()
  // la libreria si carica dopo che la finestra è aperta: l'interfaccia è subito utilizzabile
  void library.init()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => app.quit())
