import { app, BrowserWindow, dialog, ipcMain, Menu, net, protocol, shell } from 'electron'
import { pathToFileURL } from 'url'
import { tmpdir } from 'os'
import { join } from 'path'
import type { ArtKind, Feedback, Game, GameEnded, OptimizationReport, PickKind, Settings, SystemInfo } from '@shared/types'
import { SYSTEMS } from './systems'
import { loadSettings, saveSettings } from './settings'
import { demoGames, scanSystem } from './scanner'
import { launchGame } from './launcher'
import { platform } from './platform'
import { ensureFolders } from './folders'
import { detectHardware } from './hardware'
import { buildReport, profileFor } from './optimize'
import { toConfigText } from './profiles'
import { setHighPerformanceGpu } from './gpuPref'
import { buildInputConfig, buildInputMap } from './inputs'
import { ART_SCHEME, getArt, resolveArtUrl, withFullTitles } from './artwork'

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

function gamesFor(systemId: string, settings: Settings): Game[] {
  const system = SYSTEMS.find((s) => s.id === systemId)
  if (!system) return []
  if (!settings.romsDir) return demoGames(system)
  return scanSystem(settings.romsDir, system)
}

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
    return SYSTEMS.map((s) => ({ ...s, gameCount: gamesFor(s.id, settings).length }))
  })

  ipcMain.handle('games:get', async (_e, systemId: string) => {
    const games = gamesFor(systemId, loadSettings())
    return SYSTEMS.find((s) => s.id === systemId)?.titleDat ? withFullTitles(games) : games
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

  ipcMain.handle('settings:get', () => loadSettings())
  ipcMain.handle('settings:save', (_e, s: Settings) => {
    const saved = saveSettings(s)
    void applyGpuPreference(saved)
    try {
      ensureFolders(saved) // se la cartella indicata non ha le sottocartelle, le crea
    } catch {
      // cartella non scrivibile: nessun problema, resta quella scelta dall'utente
    }
    return saved
  })
  ipcMain.handle('folder:setup', () => saveSettings(ensureFolders(loadSettings())))
  ipcMain.handle('folder:open', async (_e, target: string) => {
    const s = ensureFolders(loadSettings())
    const sys = SYSTEMS.find((x) => x.id === target)
    const dir = target === 'bios' ? s.biosDir : sys ? join(s.romsDir, sys.folder) : s.romsDir
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
    const hw = await detectHardware(true)
    await applyGpuPreference(settings)
    const { profile } = profileFor(system, settings, hw, win)
    const input = buildInputConfig(settings.inputScheme, settings.arcadeLayout, system.id === 'arcade')
    let startedAt = 0
    return launchGame(
      game,
      system,
      settings,
      toConfigText({ ...profile.config, ...input }),
      () => {
        startedAt = Date.now()
        win?.hide()
      },
      () => {
        win?.show()
        win?.focus()
        const seconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0
        startedAt = 0
        // il parere dell'utente si chiede solo dopo una partita vera
        if (seconds >= 45 && settings.autoTune) {
          const ended: GameEnded = { gameId: game.id, gameName: game.name, systemId: system.id, systemName: system.name, seconds }
          win?.webContents.send('game:ended', ended)
        }
      }
    )
  })

  ipcMain.handle('input:map', () => {
    const s = loadSettings()
    return buildInputMap(s.inputScheme, s.arcadeLayout)
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
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => app.quit())
