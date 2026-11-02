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
  /** retroarch (predefinito) oppure mame: emulatore autonomo avviato come programma a parte */
  engine?: 'retroarch' | 'mame'
  /** Da dove ricavare i titoli completi dei giochi con nome breve (fbneo = elenco FBNeo, mame = elenco del MAME dell'utente) */
  titleSource?: 'fbneo' | 'mame'
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
  /** Percorso relativo alla cartella del sistema */
  path: string
  systemId: string
  /** MAME: nome breve della macchina da avviare (per le varianti è diverso dal nome dello ZIP) */
  machine?: string
  /** Famiglia per filtrare la lista (MAME: Neo Geo, Capcom CPS, Sega…) */
  group?: string
  /** Anno di uscita, se noto (MAME) */
  year?: string
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
  inputScheme: InputScheme
  arcadeLayout: ArcadeLayout
  /** Arcade/Neo Geo: mostra anche i giochi che il motore FBNeo non supporta (set MAME completi) */
  showUnsupported: boolean
  /** MAME autonomo (mame.exe), usato dal sistema "Arcade (MAME)" */
  mamePath: string
  /** Cartella dei dischi CHD (facoltativa): si aggiunge a quella delle ROM */
  mameChdDir: string
  /** Nasconde dalla lista i giochi che il controllo ROM ha trovato difettosi */
  hideBadRoms: boolean
  /** Cartella con le immagini locali (pacchetti Multimedia / EXTRAs): schermate, copertine, titoli col nome breve del gioco */
  mediaDir: string
  /** Filmato della partita dietro la lista (da videosnaps) */
  videoPreview: boolean
  /** Volume del lettore di musica (colonna sonora) */
  musicVolume: number
  /** Cartella dei giochi di MAME (vuota = "mame" dentro la cartella ROM). Di solito una cartella per versione, es. mame0229 */
  mameRomDir: string
  /** Giochi preferiti (identificativi) */
  /** Suoni dell'interfaccia (sintetizzati dal programma) */
  soundOn: boolean
  soundVolume: number
  /** Dopo quanti secondi senza input parte la rotazione di copertine (0 = mai) */
  attractSeconds: number
  /** Breve sequenza "INSERT COIN" prima di avviare un gioco */
  launchAnimation: boolean
  favorites: string[]
  /** Ultimi giochi avviati, il più recente per primo */
  recents: string[]
  /** Mostra anche le varianti (cloni) dei giochi: con i set "merged" stanno dentro lo ZIP del gioco principale */
  mameClones: boolean
}

/** laptop = tastiera del portatile (WASD + J/K/L); cabinet = pannello arcade con encoder tipo I-PAC */
export type InputScheme = 'laptop' | 'cabinet'
/** standard = pulsanti 1..6 in ordine; capcom = pugni in alto e calci in basso (solo sistema Arcade) */
export type ArcadeLayout = 'standard' | 'capcom'

export interface ControlRow {
  action: string
  /** Nome del tasto come lo conosce RetroArch (serve a evidenziarlo nella schermata di prova) */
  key: string
  shown: string
}

export interface InputMapReport {
  scheme: InputScheme
  players: Array<{ player: number; title: string; rows: ControlRow[] }>
  hotkeys: ControlRow[]
  layouts: Array<{ title: string; rows: string[] }>
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

/** Stato della scansione della libreria, che avviene in background */
export interface LibraryEvent {
  scanning: boolean
  /** Sistema in scansione in questo momento */
  systemId: string | null
  /** File trovati finora nel sistema in scansione */
  found: number
  /** Sistema appena aggiornato (la sua lista è cambiata), se c'è */
  updated: string | null
  /** Cartella dei giochi non raggiungibile (per esempio disco esterno scollegato): le liste restano quelle salvate */
  offline: string | null
}

/** Cosa ha trovato la scansione di MAME nella cartella dei giochi (serve a spiegare perché la lista è vuota) */
export interface LibraryStats {
  /** ZIP trovati in totale */
  total: number
  /** Giochi mostrati in lista */
  shown: number
  /** ZIP di BIOS e dispositivi (non sono giochi) */
  bios: number
  device: number
  /** ZIP che questo MAME non conosce (di solito: set di un'altra versione) */
  unknown: number
  version: string
}

export type ArtKind = 'boxart' | 'snap' | 'title'

export type PickKind = 'dir' | 'file'

export interface VerifyIssue {
  set: string
  file: string
  reason: string
}
export interface VerifyBad {
  name: string
  parent: string
  issues: VerifyIssue[]
}
export interface VerifySummary {
  at: number
  version: string
  checked: number
  good: number
  badCount: number
  cancelled: boolean
}
export interface VerifyState {
  running: boolean
  checked: number
  bad: number
  summary: VerifySummary | null
  badList: VerifyBad[]
  tail: string[]
}

export interface MediaReport {
  base: string
  found: Array<{ kind: 'boxart' | 'snap' | 'title' | 'video' | 'sound'; name: string; path: string; type: 'dir' | 'zip'; count: number }>
  other: string[]
  unsupported: string[]
  error?: string
}

export interface MediaTrack {
  title: string
  url: string
}

export interface MrApi {
  /** Filmato della partita del gioco (indirizzo da usare in un video), se esiste */
  getVideo(game: Game): Promise<string | null>
  /** Brani della colonna sonora del gioco */
  getTracks(game: Game): Promise<MediaTrack[]>
  startVerify(): Promise<{ ok: boolean; error?: string }>
  cancelVerify(): Promise<void>
  getVerify(): Promise<VerifyState>
  /** Controlla un solo gioco (pochi secondi) */
  verifyMachine(name: string): Promise<{ ok: boolean; issues: VerifyIssue[]; error?: string }>
  onVerify(cb: (s: VerifyState) => void): () => void
  /** Analizza la cartella delle immagini locali e dice cosa riconosce */
  analyzeMedia(): Promise<MediaReport>
  getLibraryStats(systemId: string): Promise<LibraryStats | null>
  getPrefs(): Promise<{ favorites: string[]; recents: string[] }>
  toggleFavorite(gameId: string): Promise<string[]>
  /** Sposta tutto (ROM, BIOS, cartella MAME di questa versione) su un'altra cartella o disco */
  setupRoot(rootDir: string): Promise<Settings>
  /** Crea la cartella dedicata alla versione di MAME indicata e la imposta */
  makeMameFolder(): Promise<{ ok: boolean; path: string; error?: string }>
  /** Controlla il mame.exe indicato: versione e numero di macchine che conosce */
  checkMame(): Promise<{ ok: boolean; version: string; machines: number; error?: string; warning?: string }>
  onGameFailed(cb: (message: string) => void): () => void
  getLibraryStatus(): Promise<LibraryEvent>
  onLibrary(cb: (e: LibraryEvent) => void): () => void
  getInputMap(): Promise<InputMapReport>
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
  /** cachedOnly: restituisce solo ciò che è già salvato, senza scaricare niente */
  getArt(game: Game, kind: ArtKind, cachedOnly?: boolean): Promise<string | null>
}
