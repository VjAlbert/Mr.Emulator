import { app } from 'electron'
import { join, dirname } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import type { Settings } from '@shared/types'

const DEFAULTS: Settings = {
  romsDir: '',
  biosDir: '',
  retroarchPath: '',
  coresDir: '',
  fullscreen: true,
  downloadArt: true
}

const file = (): string => join(app.getPath('userData'), 'settings.json')

export function loadSettings(): Settings {
  try {
    if (existsSync(file())) {
      return { ...DEFAULTS, ...JSON.parse(readFileSync(file(), 'utf-8')) }
    }
  } catch {
    // file corrotto: si riparte dai valori di default
  }
  return { ...DEFAULTS }
}

export function saveSettings(s: Settings): Settings {
  const merged = { ...DEFAULTS, ...s }
  mkdirSync(dirname(file()), { recursive: true })
  writeFileSync(file(), JSON.stringify(merged, null, 2), 'utf-8')
  return merged
}
