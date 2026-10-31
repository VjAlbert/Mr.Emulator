import { app, BrowserWindow, dialog, ipcMain, net, protocol } from 'electron'
import { pathToFileURL } from 'url'
import { join } from 'path'
import type { Game, PickKind, Settings, SystemInfo } from '@shared/types'
import { SYSTEMS } from './systems'
import { loadSettings, saveSettings } from './settings'
import { demoGames, scanSystem } from './scanner'
import { launchGame } from './launcher'
import { platform } from './platform'
import { ART_SCHEME, getArt, resolveArtUrl } from './artwork'

protocol.registerSchemesAsPrivileged([
  { scheme: ART_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }
])

let win: BrowserWindow | null = null

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

app.whenReady().then(() => {
  protocol.handle(ART_SCHEME, (req) => {
    const file = resolveArtUrl(req.url)
    return file ? net.fetch(pathToFileURL(file).toString()) : new Response('Not found', { status: 404 })
  })

  ipcMain.handle('art:get', (_e, game: Game) => {
    const system = SYSTEMS.find((s) => s.id === game.systemId)
    return system ? getArt(game, system, loadSettings().downloadArt) : null
  })

  ipcMain.handle('systems:get', (): SystemInfo[] => {
    const settings = loadSettings()
    return SYSTEMS.map((s) => ({ ...s, gameCount: gamesFor(s.id, settings).length }))
  })

  ipcMain.handle('games:get', (_e, systemId: string) => gamesFor(systemId, loadSettings()))

  ipcMain.handle('settings:get', () => loadSettings())
  ipcMain.handle('settings:save', (_e, s: Settings) => saveSettings(s))

  ipcMain.handle('dialog:pick', async (_e, kind: PickKind) => {
    const res = await dialog.showOpenDialog(win!, {
      properties: [kind === 'dir' ? 'openDirectory' : 'openFile'],
      filters: kind === 'file' ? [platform.exeFilter] : undefined
    })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('game:launch', (_e, game: Game) => {
    const system = SYSTEMS.find((s) => s.id === game.systemId)
    if (!system) return { ok: false, error: 'Sistema sconosciuto.' }
    return launchGame(
      game,
      system,
      loadSettings(),
      () => win?.hide(),
      () => {
        win?.show()
        win?.focus()
      }
    )
  })

  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => app.quit())
