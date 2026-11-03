import type { CoreCost, ImageStyle, PerfLevel, Tier } from '@shared/types'
import { LEVEL_LABEL } from './tiers'

/** Funzione pura: dato PC, schermo e sistema, decide le impostazioni di RetroArch. */

export interface ProfileInput {
  level: PerfLevel
  cost: CoreCost
  cpuTier: Tier
  gpuTier: Tier
  /** Pixel reali dello schermo di gioco */
  display: { width: number; height: number; hz: number }
  imageStyle: ImageStyle
  fullscreen: boolean
  /** Cartella dei BIOS passata a RetroArch */
  biosDir: string
  /** Cartella degli shader CRT (shaders_slang/crt) e nomi disponibili senza estensione */
  shaderDir: string | null
  shadersAvailable: Set<string>
  /** 0 = predefinito di RetroArch */
  monitorIndex: number
  /** Scelta dell'utente: auto, off oppure il nome di uno shader */
  crtChoice?: string
  /** Bordo grafico (percorso del file .cfg di RetroArch), se attivo */
  overlay?: string | null
}

export interface Profile {
  config: Record<string, string>
  shader: string | null
  runAhead: boolean
  summary: string
}

export const IMAGE_LABEL: Record<ImageStyle, string> = { fit: 'altezza piena', pixel: 'pixel perfetti', 'pixel-height': 'pixel perfetti in altezza', stretch: 'schermo intero stirato' }

const SHADER_LABEL: Record<string, string> = {
  'crt-royale': 'CRT Royale',
  'crt-geom': 'CRT Geom',
  'crt-easymode': 'CRT Easymode',
  'crt-lottes': 'CRT Lottes'
}

/** Quale shader vorremmo, in ordine di preferenza (il primo installato viene usato) */
function wantedShaders(i: ProfileInput): string[] {
  if (i.cost === 'heavy' || i.level === 'light') return []
  // gli effetti a righe su schermi piccoli o a bassa risoluzione si vedono male
  if (i.display.height < 900) return []
  // 4K senza una scheda potente: solo lo shader più leggero
  const hugeScreen = i.display.height >= 2000
  const cheapOnly = hugeScreen && i.gpuTier !== 'high'

  if (i.cost === 'medium') {
    return i.level === 'max' && i.gpuTier !== 'low' ? ['crt-easymode'] : []
  }
  if (i.level === 'balanced' || cheapOnly) return i.gpuTier === 'low' && i.level !== 'max' ? [] : ['crt-easymode']
  // livello massimo, sistema leggero: Royale è molto pesante, quindi solo fino a 1440p
  return i.gpuTier === 'high' && i.display.height <= 1600 ? ['crt-royale', 'crt-geom', 'crt-easymode'] : ['crt-geom', 'crt-easymode']
}

export function buildProfile(i: ProfileInput): Profile {
  const c: Record<string, string> = {}

  c['system_directory'] = i.biosDir
  c['video_fullscreen'] = String(i.fullscreen)
  // schermo intero "senza bordi": funziona bene con più monitor, proiettori e TV, e il cambio finestra è istantaneo
  c['video_windowed_fullscreen'] = 'true'
  c['video_vsync'] = 'true'
  c['video_smooth'] = 'false'
  c['video_scale_integer'] = String(i.imageStyle === 'pixel' || i.imageStyle === 'pixel-height')
  // solo altezza intera: l'asse Y soltanto (RetroArch recente); a tutto schermo: proporzione "Full" dell'elenco di RetroArch
  if (i.imageStyle === 'pixel-height') c['video_scale_integer_axis'] = '1'
  if (i.imageStyle === 'stretch') c['aspect_ratio_index'] = '24'
  if (i.overlay) {
    c['input_overlay_enable'] = 'true'
    c['input_overlay'] = i.overlay.replace(/\\/g, '/')
    c['input_overlay_opacity'] = '1.0'
  } else if (i.overlay === null) {
    // bordi attivi nel programma ma nessuno per questo sistema: si spegne esplicitamente, altrimenti RetroArch può tenere quello usato in precedenza
    c['input_overlay_enable'] = 'false'
  }
  c['video_threaded'] = String(i.level === 'light')
  c['video_max_swapchain_images'] = i.level === 'light' ? '3' : '2'
  c['audio_latency'] = i.level === 'light' ? '96' : '64'

  // frequenza dello schermo: multipli esatti di 60 Hz (120, 180, 240) usano un intervallo fisso, altrimenti automatico
  if (i.display.hz > 0) c['video_refresh_rate'] = i.display.hz.toFixed(6)
  const mult = Math.round(i.display.hz / 60)
  c['video_swap_interval'] = i.display.hz >= 110 && mult >= 2 && Math.abs(i.display.hz - mult * 60) <= 2 ? String(mult) : '0'

  if (i.monitorIndex > 0) c['video_monitor_index'] = String(i.monitorIndex)

  // run-ahead (meno ritardo dei comandi): solo sistemi leggeri e PC non debole
  const runAhead = i.cost === 'light' && i.level !== 'light' && i.cpuTier !== 'low'
  c['run_ahead_enabled'] = String(runAhead)
  if (runAhead) {
    c['run_ahead_frames'] = '1'
    c['run_ahead_secondary_instance'] = 'false'
  }

  let shader: string | null = null
  const choice = i.crtChoice ?? 'auto'
  if (i.shaderDir && choice !== 'off') {
    // scelta manuale: si usa se è installato, altrimenti si torna alla scelta automatica
    const wanted = choice !== 'auto' && i.shadersAvailable.has(choice) ? [choice] : wantedShaders(i)
    for (const name of wanted) {
      if (i.shadersAvailable.has(name)) {
        shader = name
        break
      }
    }
  }
  c['video_shader_enable'] = String(shader !== null)
  if (shader && i.shaderDir) c['video_shader'] = `${i.shaderDir}/${shader}.slangp`

  const parts = [LEVEL_LABEL[i.level]]
  parts.push(shader ? SHADER_LABEL[shader] : 'nessuno shader')
  if (runAhead) parts.push('meno ritardo comandi')
  parts.push(IMAGE_LABEL[i.imageStyle])
  return { config: c, shader, runAhead, summary: parts.join(' · ') }
}

/** Testo per il file di configurazione aggiuntivo di RetroArch */
export function toConfigText(config: Record<string, string>): string {
  return (
    Object.entries(config)
      .map(([k, v]) => `${k} = "${v}"`)
      .join('\n') + '\n'
  )
}

export interface MameProfile {
  ini: Record<string, string>
  chain: string | null
  summary: string
}

/** Impostazioni di MAME (mame.ini) in base a PC, schermo e livello: stessa logica dell'autoguida di RetroArch */
export function buildMameProfile(i: {
  level: PerfLevel
  gpuTier: Tier
  display: { width: number; height: number; hz: number }
  imageStyle: ImageStyle
  fullscreen: boolean
  tate?: 'off' | 'cw' | 'ccw'
}): MameProfile {
  const ini: Record<string, string> = {
    window: i.fullscreen ? '0' : '1',
    maximize: '1',
    keepaspect: i.imageStyle === 'stretch' ? '0' : '1',
    // "pixel perfetti" = niente stiramenti irregolari; "in altezza" = intero in altezza, libero in larghezza
    unevenstretch: i.imageStyle === 'fit' || i.imageStyle === 'stretch' ? '1' : '0',
    unevenstretchx: i.imageStyle === 'pixel-height' ? '1' : '0',
    // monitor montato in verticale: i giochi verticali si ruotano da soli
    autoror: i.tate === 'cw' ? '1' : '0',
    autorol: i.tate === 'ccw' ? '1' : '0',
    waitvsync: '1',
    sleep: '1',
    throttle: '1',
    autoframeskip: '0',
    frameskip: '0',
    skip_gameinfo: '1',
    confirm_quit: '0',
    cheat: '0',
    autosave: '0',
    mouse: '0'
  }

  // gli effetti a righe su schermi piccoli si vedono male; con 4K servono schede potenti
  let chain: string | null = null
  const small = i.display.height < 900
  const huge = i.display.height >= 2000
  if (i.level !== 'light' && !small && !(huge && i.gpuTier !== 'high')) {
    chain = i.level === 'max' && i.gpuTier === 'high' && i.display.height <= 1600 ? 'hlsl' : 'crt-geom'
  }
  if (chain) {
    ini['video'] = 'bgfx'
    ini['bgfx_screen_chains'] = chain
  } else {
    ini['video'] = 'd3d'
  }

  const label = chain === 'hlsl' ? 'CRT HLSL' : chain === 'crt-geom' ? 'CRT Geom' : 'nessuno shader'
  return { ini, chain, summary: [LEVEL_LABEL[i.level], label, IMAGE_LABEL[i.imageStyle]].join(' · ') }
}

export function toIniText(ini: Record<string, string>): string {
  return Object.entries(ini).map(([k, v]) => `${k.padEnd(28)}${v}`).join('\n') + '\n'
}
