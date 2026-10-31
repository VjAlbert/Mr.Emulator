import { contextBridge, ipcRenderer } from 'electron'
import type { GameEnded, MrApi } from '@shared/types'

const api: MrApi = {
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
  getArt: (game, kind) => ipcRenderer.invoke('art:get', game, kind)
}

contextBridge.exposeInMainWorld('mr', api)
