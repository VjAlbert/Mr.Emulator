import { app } from 'electron'
import { join, dirname } from 'path'
import { existsSync, readFileSync, mkdirSync, copyFileSync } from 'fs'
import { writeFileAtomic } from './atomic'
import type { Settings } from '@shared/types'
import { setMainLang } from './mt'

const DEFAULTS: Settings = {
  romsDir: '',
  biosDir: '',
  retroarchPath: '',
  coresDir: '',
  fullscreen: true,
  downloadArt: true,
  lightEffects: false,
  perfMode: 'auto',
  imageStyle: 'fit',
  autoTune: true,
  tuning: {},
  gameMonitor: 0,
  dedicatedGpu: true,
  inputScheme: 'laptop',
  arcadeLayout: 'standard',
  showUnsupported: false,
  mamePath: '',
  mameChdDir: '',
  hideBadRoms: false,
  launchFix: {},
  launchFloor: 0,
  mediaDir: '',
  datDir: '',
  hiddenSystems: [],
  customControls: null,
  padExit: 'start-select',
  padMenu: 'hold-start',
  firstRunDone: false,
  language: 'auto',
  titleScreen: true,
  cabinetFullscreen: false,
  imageBySystem: {},
  tate: 'off',
  overlayEnabled: false,
  overlayPath: '',
  overlayDir: '',
  savesDir: '',
  resumeConsoles: true,
  resumeArcade: {},
  sharpness: 'off',
  resumeBySystem: {},
  raEnabled: false,
  raUser: '',
  raPassword: '',
  raHardcore: false,
  cheatsAuto: false,
  hiscore: true,
  autoCovers: false,
  groupDiscs: true,
  checkUpdates: true,
  uiStyle: 'comic',
  stylizePhotos: true,
  overlayBySystem: {},
  theme: 'fighter',
  crtShader: 'auto',
  cabinetAutostart: false,
  cabinetHideCursor: false,
  cabinetLockClose: false,
  videoPreview: true,
  musicVolume: 0.5,
  mameRomDir: '',
  soundOn: true,
  soundVolume: 0.4,
  attractSeconds: 90,
  launchAnimation: true,
  favorites: [],
  recents: [],
  mameClones: false
}

const file = (): string => join(app.getPath('userData'), 'settings.json')

function readSettings(): Settings {
  // file principale, poi la copia di sicurezza; solo se entrambi sono illeggibili si riparte dai valori di default
  for (const f of [file(), `${file()}.bak`]) {
    try {
      if (existsSync(f)) return { ...DEFAULTS, ...JSON.parse(readFileSync(f, 'utf-8')) }
    } catch {
      // file corrotto: si prova con la copia
    }
  }
  return { ...DEFAULTS }
}

export function loadSettings(): Settings {
  const s = readSettings()
  setMainLang(s.language)
  return s
}

export function saveSettings(s: Settings): Settings {
  const merged = { ...DEFAULTS, ...s }
  mkdirSync(dirname(file()), { recursive: true })
  try {
    if (existsSync(file())) copyFileSync(file(), `${file()}.bak`)
  } catch {
    // la copia è un extra: se non riesce si salva comunque
  }
  writeFileAtomic(file(), JSON.stringify(merged, null, 2))
  setMainLang(merged.language)
  return merged
}
