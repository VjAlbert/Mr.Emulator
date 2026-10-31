/** Livello di qualità/prestazioni: dal più leggero al più ricco */
export type PerfLevel = 'light' | 'balanced' | 'max'
export type PerfMode = 'auto' | PerfLevel
/** fit = schermo il più grande possibile con proporzioni corrette; pixel = pixel perfetti (scala intera) */
export type ImageStyle = 'fit' | 'pixel'
export type Tier = 'low' | 'mid' | 'high'
/** Quanto pesa il core di emulazione sul PC */
export type CoreCost = 'light' | 'medium' | 'heavy'

export interface SystemDef {
  id: string
  name: string
  short: string
  /** Sottocartella di default dentro la cartella ROM */
  folder: string
  extensions: string[]
  /** Nome del core Libretro (senza estensione), null se non ancora supportato */
  core: string | null
  color: string
  phase: 1 | 2 | 3
  cost: CoreCost
  /** Nome della cartella su libretro-thumbnails (copertine). Assente = non ancora supportato */
  thumbs?: string
  /** I file hanno nomi brevi (es. pbobblen.zip): il titolo si ricava dal DAT di FBNeo */
  titleDat?: boolean
}

export interface SystemInfo extends SystemDef {
  gameCount: number
}

export interface Game {
  id: string
  name: string
  fileName: string
  path: string
  systemId: string
  demo?: boolean
}

export interface Settings {
  romsDir: string
  /** Cartella dei BIOS: viene passata a RetroArch come sua cartella di sistema */
  biosDir: string
  retroarchPath: string
  coresDir: string
  fullscreen: boolean
  /** Scarica automaticamente copertine e immagini (gratuito, senza account) */
  downloadArt: boolean
  /** Meno animazioni e niente effetti pesanti (consigliato su PC lenti) */
  lightEffects: boolean
  /** auto = decide il programma in base a PC e schermo */
  perfMode: PerfMode
  imageStyle: ImageStyle
  /** Dopo ogni partita chiede com'è andata e regola il livello di quel sistema */
  autoTune: boolean
  /** Correzione di livello per sistema, da -2 a +1, imparata dalle risposte */
  tuning: Record<string, number>
  /** 0 = automatico (monitor dove si trova il launcher), altrimenti numero del monitor */
  gameMonitor: number
  /** Sui portatili con due schede video, fa usare quella potente a RetroArch */
  dedicatedGpu: boolean
}

export type Vendor = 'nvidia' | 'amd' | 'intel' | 'other'

export interface GpuInfo {
  name: string
  vendor: Vendor
  active: boolean
  tier: Tier
}

export interface ScreenInfo {
  id: number
  index: number
  label: string
  /** Pixel reali (già moltiplicati per la scala di Windows) */
  width: number
  height: number
  scale: number
  hz: number
  primary: boolean
}

export interface HardwareReport {
  cpu: { model: string; threads: number; mhz: number; tier: Tier }
  ramGb: number
  gpus: GpuInfo[]
  /** Portatile con scheda integrata + dedicata */
  hybridGpu: boolean
  gpuTier: Tier
  screens: ScreenInfo[]
  /** Livello consigliato dal solo hardware */
  level: PerfLevel
}

export interface SystemProfile {
  systemId: string
  name: string
  level: PerfLevel
  /** Correzione imparata dalle risposte dell'utente */
  delta: number
  shader: string | null
  runAhead: boolean
  summary: string
}

export interface OptimizationReport {
  hardware: HardwareReport
  /** Livello effettivo (tiene conto della scelta manuale) */
  effective: PerfLevel
  /** Schermo dove si trova ora il launcher */
  currentScreenId: number
  profiles: SystemProfile[]
  shadersInstalled: boolean
  gpuPreference: 'applied' | 'not-needed' | 'off' | 'failed' | 'unsupported'
  notes: string[]
}

export interface GameEnded {
  gameId: string
  gameName: string
  systemId: string
  systemName: string
  seconds: number
}

export type Feedback = 'ok' | 'slow' | 'better'

export interface FolderInfo {
  romsDir: string
  biosDir: string
}

export interface LaunchResult {
  ok: boolean
  error?: string
}

export type ArtKind = 'boxart' | 'snap' | 'title'

export type PickKind = 'dir' | 'file'

export interface MrApi {
  getReport(): Promise<OptimizationReport>
  sendFeedback(systemId: string, answer: Feedback): Promise<void>
  /** Si attiva quando un gioco si chiude; restituisce la funzione per smettere di ascoltare */
  onGameEnded(cb: (e: GameEnded) => void): () => void
  getSystems(): Promise<SystemInfo[]>
  getGames(systemId: string): Promise<Game[]>
  getSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<Settings>
  launch(game: Game): Promise<LaunchResult>
  pickPath(kind: PickKind): Promise<string | null>
  /** Restituisce l'indirizzo locale di una copertina (la scarica se manca) oppure null */
  /** Apre in Esplora risorse la cartella ROM, BIOS o di un sistema */
  openFolder(target: 'roms' | 'bios' | string): Promise<void>
  /** Crea le cartelle ROM/BIOS mancanti e le imposta come predefinite */
  setupFolders(): Promise<Settings>
  getArt(game: Game, kind: ArtKind): Promise<string | null>
}
