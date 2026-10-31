import { contextBridge, ipcRenderer } from 'electron'
import type { MrApi } from '@shared/types'

const api: MrApi = {
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
