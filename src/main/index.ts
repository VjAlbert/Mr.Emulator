import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from 'electron'
import { pathToFileURL } from 'url'
import { tmpdir } from 'os'
import { join } from 'path'
import type { ArtKind, Feedback, Game, GameEnded, OptimizationReport, PickKind, Settings, SystemInfo } from '@shared/types'
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
import { ART_SCHEME, arcadeTitles, getArt, resolveArtUrl, setMameTitleProvider } from './artwork'
import { loadMameData, type MameData } from './mame'
import { launchMame } from './mameLauncher'
import { mameFolderName, systemDir } from './paths'
import { mkdirSync } from 'fs'

protocol.registerSchemesAsPrivileged([
  { scheme: ART_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

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
      sandbox: true
    }
  })
  // nessun menu: il tasto Alt (pulsante 2 sul pannello arcade) non deve far comparire barre
  Menu.setApplicationMenu(null)
  win.removeMenu()
  win.setMenuBarVisibility(false)
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
setMameTitleProvider(async () => {
  const d = await getMame()
  if (!d) return null
  return {
    titleOf: (n) => d.machines.get(n)?.description,
    parentTitleOf: (n) => {
      const p = d.machines.get(n)?.cloneof
      return p ? d.machines.get(p)?.description : undefined
    }
  }
})

const library = createLibrary({
  cacheDir: join(app.getPath('userData'), 'library'),
  systems: SYSTEMS,
  getSettings: loadSettings,
  titles: arcadeTitles,
  mame: (onProgress) => getMame(onProgress),
  signature: (sys) => {
    if (sys.engine !== 'mame') return ''
    const s = loadSettings()
    return `${s.mamePath}|${s.mameClones}|${s.mameRomDir}`
  },
  emit: (e) => win?.webContents.send('library:event', e)
})

app.whenReady().then(async () => {
  protocol.handle(ART_SCHEME, (req) => {
    const file = resolveArtUrl(req.url)
    return file ? net.fetch(pathToFileURL(file).toString()) : new Response('Not found', { status: 404 })
  })

  ipcMain.handle('art:get', (_e, game: Game, kind: ArtKind) => {
    const system = SYSTEMS.find((s) => s.id === game.systemId)
    return system ? getArt(game, system, loadSettings().downloadArt, kind) : null
  })

  ipcMain.handle('systems:get', (): SystemInfo[] => {
    const settings = loadSettings()
    return SYSTEMS.map((s) => ({ ...s, gameCount: settings.romsDir ? library.count(s.id) : demoGames(s).length }))
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

  ipcMain.handle('library:status', () => library.status())
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
    if (before.romsDir !== saved.romsDir || before.showUnsupported !== saved.showUnsupported || before.mamePath !== saved.mamePath || before.mameClones !== saved.mameClones || before.mameRomDir !== saved.mameRomDir) {
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
        (message) => win?.webContents.send('game:failed', message)
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
    return { ok: true, version: d.version, machines: d.machines.size }
  })

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
