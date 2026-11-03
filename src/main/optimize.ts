import { resolveOverlay } from './overlays'
import { existsSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import type { BrowserWindow } from 'electron'
import type {
  HardwareReport,
  OptimizationReport,
  PerfLevel,
  ScreenInfo,
  Settings,
  SystemDef,
  SystemProfile
} from '@shared/types'
import { SYSTEMS } from './systems'
import { buildMameProfile, buildProfile, type MameProfile, type Profile } from './profiles'
import { currentScreen } from './hardware'
import { LEVEL_LABEL, shiftLevel } from './tiers'

/** Livello di partenza: la scelta manuale ha la precedenza su quello consigliato */
export function baseLevel(hw: HardwareReport, s: Settings): PerfLevel {
  return s.perfMode === 'auto' ? hw.level : s.perfMode
}

/** Shader CRT installati in RetroArch (Aggiornatore online > Aggiorna shader Slang) */
function findShaders(retroarchPath: string): { dir: string | null; names: Set<string> } {
  if (!retroarchPath) return { dir: null, names: new Set() }
  const dir = join(dirname(retroarchPath), 'shaders', 'shaders_slang', 'crt')
  try {
    if (!existsSync(dir)) return { dir: null, names: new Set() }
    const names = new Set(readdirSync(dir).filter((f) => f.endsWith('.slangp')).map((f) => f.replace(/\.slangp$/, '')))
    return { dir: dir.replace(/\\/g, '/'), names }
  } catch {
    return { dir: null, names: new Set() }
  }
}

/** Indice (da 1) del monitor da usare in RetroArch; 0 = lascia decidere a RetroArch */
function monitorIndexFor(s: Settings, screens: ScreenInfo[], current: ScreenInfo): number {
  if (s.gameMonitor > 0) return s.gameMonitor
  // automatico: se il launcher è sul monitor principale (o ce n'è uno solo) non si tocca nulla
  if (screens.length <= 1 || current.primary) return 0
  return current.index + 1
}

export function profileFor(
  system: SystemDef,
  s: Settings,
  hw: HardwareReport,
  win: BrowserWindow | null
): { profile: Profile; level: PerfLevel; delta: number } {
  const cur = currentScreen(win, hw.screens)
  const delta = s.autoTune ? (s.tuning[system.id] ?? 0) : 0
  const level = shiftLevel(baseLevel(hw, s), delta)
  const shaders = findShaders(s.retroarchPath)
  const profile = buildProfile({
    level,
    cost: system.cost,
    cpuTier: hw.cpu.tier,
    gpuTier: hw.gpuTier,
    display: { width: cur.width, height: cur.height, hz: cur.hz },
    imageStyle: s.imageBySystem?.[system.id] ?? s.imageStyle,
    fullscreen: s.fullscreen,
    biosDir: s.biosDir,
    shaderDir: shaders.dir,
    shadersAvailable: shaders.names,
    monitorIndex: monitorIndexFor(s, hw.screens, cur),
    crtChoice: s.crtShader,
    overlay: s.overlayEnabled ? resolveOverlay(s, system.id) : undefined
  })
  return { profile, level, delta }
}

export function mameProfileFor(
  s: Settings,
  hw: HardwareReport,
  win: BrowserWindow | null,
  systemId = 'mame'
): { profile: MameProfile; level: PerfLevel; delta: number } {
  const cur = currentScreen(win, hw.screens)
  const delta = s.autoTune ? (s.tuning[systemId] ?? 0) : 0
  const level = shiftLevel(baseLevel(hw, s), delta)
  const profile = buildMameProfile({
    level,
    gpuTier: hw.gpuTier,
    display: { width: cur.width, height: cur.height, hz: cur.hz },
    imageStyle: s.imageBySystem?.[systemId] ?? s.imageStyle,
    fullscreen: s.fullscreen,
    tate: s.tate
  })
  return { profile, level, delta }
}

export function buildReport(
  s: Settings,
  hw: HardwareReport,
  win: BrowserWindow | null,
  gpuPreference: OptimizationReport['gpuPreference']
): OptimizationReport {
  const cur = currentScreen(win, hw.screens)
  const shaders = findShaders(s.retroarchPath)
  const profiles: SystemProfile[] = SYSTEMS.filter((x) => x.core || x.engine === 'mame').map((x) => {
    if (x.engine === 'mame') {
      const m = mameProfileFor(s, hw, win, x.id)
      return { systemId: x.id, name: x.name, level: m.level, delta: m.delta, shader: m.profile.chain, runAhead: false, summary: m.profile.summary }
    }
    const { profile, level, delta } = profileFor(x, s, hw, win)
    return { systemId: x.id, name: x.name, level, delta, shader: profile.shader, runAhead: profile.runAhead, summary: profile.summary }
  })

  const notes: string[] = []
  if (!s.retroarchPath) notes.push('Indica il percorso di RetroArch nelle Impostazioni per applicare queste scelte.')
  else if (!shaders.dir) {
    notes.push('Gli shader CRT non sono installati: in RetroArch apri Aggiornatore online e scegli "Aggiorna shader Slang". Poi gli effetti si attivano da soli.')
  }
  if (hw.hybridGpu && gpuPreference === 'off') notes.push('Hai due schede video: attiva l\'opzione per far usare quella potente a RetroArch.')
  if (hw.screens.length > 1) notes.push(`Rilevati ${hw.screens.length} schermi: i giochi partono su quello dove si trova Mr. Emulator (o su quello scelto).`)
  if (cur.height >= 2000 && hw.gpuTier !== 'high') notes.push('Schermo 4K con una scheda video media: gli effetti pesanti sono limitati per mantenere la fluidità.')
  if (cur.hz >= 110 && Math.abs(cur.hz - Math.round(cur.hz / 60) * 60) > 2) {
    notes.push(`Il tuo schermo è a ${cur.hz} Hz, non multiplo di 60: i giochi a 60 Hz potrebbero avere micro-scatti. Se li noti, imposta lo schermo a 120 o 60 Hz.`)
  }

  return {
    hardware: hw,
    effective: baseLevel(hw, s),
    currentScreenId: cur.id,
    profiles,
    shadersInstalled: shaders.dir !== null,
    gpuPreference,
    notes
  }
}

export { LEVEL_LABEL }
