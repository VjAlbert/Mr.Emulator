import { app, screen } from 'electron'
import type { BrowserWindow } from 'electron'
import { cpus, totalmem } from 'os'
import type { GpuInfo, HardwareReport, ScreenInfo, Tier } from '@shared/types'
import { classifyCpu, classifyGpu, overallLevel, vendorFromId } from './tiers'
import { mt } from './mt'

const RANK: Record<Tier, number> = { low: 0, mid: 1, high: 2 }

/** "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)" -> "NVIDIA GeForce RTX 3060" */
function cleanRenderer(r: string): string {
  const m = /ANGLE \([^,]*,\s*([^,]+?)(?:\s+Direct3D\d*.*|\s+\(0x.*)?,/.exec(r)
  return (m ? m[1] : r).replace(/\s+/g, ' ').trim()
}

async function detectGpus(): Promise<GpuInfo[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let info: any = null
  try {
    info = await app.getGPUInfo('complete')
  } catch {
    try {
      info = await app.getGPUInfo('basic')
    } catch {
      info = null
    }
  }
  const devices: Array<Record<string, unknown>> = info?.gpuDevice ?? []
  const renderer = cleanRenderer(String(info?.auxAttributes?.glRenderer ?? ''))
  const gpus: GpuInfo[] = devices.map((d, i) => {
    const vendor = vendorFromId(Number(d.vendorId))
    const active = Boolean(d.active) || (devices.length === 1 && i === 0)
    const given = String(d.deviceString ?? '').trim()
    // il nome completo ce l'ha il driver attivo (glRenderer); per le altre schede si ripiega sul codice
    let name = given
    if (!name && active && renderer) name = renderer
    if (!name) name = `${vendor === 'other' ? 'Scheda video' : vendor.toUpperCase()} (${'0x' + Number(d.deviceId || 0).toString(16)})`
    return { name, vendor, active, tier: classifyGpu(name, vendor) }
  })
  if (gpus.length === 0) {
    const name = renderer || mt('Scheda video sconosciuta')
    gpus.push({ name, vendor: 'other', active: true, tier: classifyGpu(name, 'other') })
  }
  return gpus
}

function detectScreens(): ScreenInfo[] {
  const primary = screen.getPrimaryDisplay().id
  return screen.getAllDisplays().map((d, index) => ({
    id: d.id,
    index,
    label: d.label || `Schermo ${index + 1}`,
    width: Math.round(d.size.width * d.scaleFactor),
    height: Math.round(d.size.height * d.scaleFactor),
    scale: d.scaleFactor,
    hz: Math.round(d.displayFrequency || 60),
    primary: d.id === primary
  }))
}

let cached: HardwareReport | null = null

/** Rileva PC e schermi. Il PC non cambia mentre il programma è aperto, gli schermi sì (sempre riletti). */
export async function detectHardware(refreshScreens = true): Promise<HardwareReport> {
  if (!cached) {
    const list = cpus()
    const threads = list.length
    const mhz = list[0]?.speed ?? 0
    const gpus = await detectGpus()
    const best = gpus.reduce<Tier>((acc, g) => (RANK[g.tier] > RANK[acc] ? g.tier : acc), 'low')
    const cpuTier = classifyCpu(threads, mhz)
    const hybrid = gpus.some((g) => g.vendor === 'intel') && gpus.some((g) => g.vendor === 'nvidia' || g.vendor === 'amd')
    cached = {
      cpu: { model: (list[0]?.model ?? 'CPU sconosciuta').replace(/\s+/g, ' ').trim(), threads, mhz, tier: cpuTier },
      ramGb: Math.round(totalmem() / 1024 ** 3),
      gpus,
      hybridGpu: hybrid,
      gpuTier: best,
      screens: [],
      level: overallLevel(cpuTier, best)
    }
  }
  if (refreshScreens || cached.screens.length === 0) cached = { ...cached, screens: detectScreens() }
  return cached
}

/** Lo schermo su cui si trova ora la finestra del launcher */
export function currentScreen(win: BrowserWindow | null, screens: ScreenInfo[]): ScreenInfo {
  const d = win && !win.isDestroyed() ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay()
  return screens.find((s) => s.id === d.id) ?? screens.find((s) => s.primary) ?? screens[0]
}
