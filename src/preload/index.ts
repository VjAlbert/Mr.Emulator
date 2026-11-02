import { contextBridge, ipcRenderer } from 'electron'
import type { GameEnded, LibraryEvent, MrApi, VerifyState } from '@shared/types'

const api: MrApi = {
  getVideo: (game) => ipcRenderer.invoke('media:video', game),
  getTracks: (game) => ipcRenderer.invoke('media:tracks', game),
  startVerify: () => ipcRenderer.invoke('verify:start'),
  cancelVerify: () => ipcRenderer.invoke('verify:cancel'),
  getVerify: () => ipcRenderer.invoke('verify:get'),
  verifyMachine: (name) => ipcRenderer.invoke('verify:machine', name),
  onVerify: (cb) => {
    const handler = (_e: unknown, s: VerifyState): void => cb(s)
    ipcRenderer.on('verify:state', handler)
    return () => ipcRenderer.removeListener('verify:state', handler)
  },
  analyzeMedia: () => ipcRenderer.invoke('media:analyze'),
  getLibraryStats: (systemId) => ipcRenderer.invoke('library:stats', systemId),
  getPrefs: () => ipcRenderer.invoke('prefs:get'),
  toggleFavorite: (id) => ipcRenderer.invoke('prefs:toggle-favorite', id),
  setupRoot: (rootDir) => ipcRenderer.invoke('folders:setup-root', rootDir),
  makeMameFolder: () => ipcRenderer.invoke('mame:make-folder'),
  checkMame: () => ipcRenderer.invoke('mame:check'),
  onGameNote: (cb) => {
    const handler = (_e: unknown, msg: string): void => cb(msg)
    ipcRenderer.on('game:note', handler)
    return () => ipcRenderer.removeListener('game:note', handler)
  },
  onGameFailed: (cb) => {
    const handler = (_e: unknown, msg: string): void => cb(msg)
    ipcRenderer.on('game:failed', handler)
    return () => ipcRenderer.removeListener('game:failed', handler)
  },
  getLibraryStatus: () => ipcRenderer.invoke('library:status'),
  onLibrary: (cb) => {
    const handler = (_e: unknown, data: LibraryEvent): void => cb(data)
    ipcRenderer.on('library:event', handler)
    return () => ipcRenderer.removeListener('library:event', handler)
  },
  getInputMap: () => ipcRenderer.invoke('input:map'),
  getReport: () => ipcRenderer.invoke('report:get'),
  sendFeedback: (systemId, answer) => ipcRenderer.invoke('feedback:send', systemId, answer),
  onGameEnded: (cb) => {
    const handler = (_e: unknown, data: GameEnded): void => cb(data)
    ipcRenderer.on('game:ended', handler)
    return () => ipcRenderer.removeListener('game:ended', handler)
  },
  getSystems: () => ipcRenderer.invoke('systems:get'),
  getGames: (systemId) => ipcRenderer.invoke('games:get', systemId),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (s) => ipcRenderer.invoke('settings:save', s),
  launch: (game) => ipcRenderer.invoke('game:launch', game),
  pickPath: (kind) => ipcRenderer.invoke('dialog:pick', kind),
  openFolder: (target) => ipcRenderer.invoke('folder:open', target),
  setupFolders: () => ipcRenderer.invoke('folder:setup'),
  getArt: (game, kind, cachedOnly) => ipcRenderer.invoke('art:get', game, kind, cachedOnly)
}

contextBridge.exposeInMainWorld('mr', api)
