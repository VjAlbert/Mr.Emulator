/** Livello di qualità/prestazioni: dal più leggero al più ricco */
export type PerfLevel = 'light' | 'balanced' | 'max'
export type PerfMode = 'auto' | PerfLevel
/** fit = schermo il più grande possibile con proporzioni corrette; pixel = pixel perfetti (scala intera) */
/** adattato = tutta l'altezza, proporzioni originali · pixel = solo multipli interi · pixel-height = multipli interi in altezza · stretch = riempie lo schermo (deforma) */
export type ImageStyle = 'fit' | 'pixel' | 'pixel-height' | 'stretch'
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
  /** Giochi spesso su più dischi: si uniscono in un solo gioco con un file .m3u */
  multiDisc?: boolean
  /** Software List di MAME da cui ricavare i titoli dei file con nome breve (console FBNeo) */
  softlist?: string[]
}

/** Cosa c'è di salvato per un gioco, e cosa succede all'avvio */
export interface SaveInfo {
  /** console = si chiede all'avvio; arcade = si sceglie nell'anteprima */
  kind: 'console' | 'arcade'
  /** Il gioco riprende da dove era (impostazione attuale) */
  resume: boolean
  /** Stato salvato (data in millisecondi) */
  state: { time: number } | null
  /** Salvataggio del gioco stesso (memory card, batteria) */
  sram: { time: number } | null
  /** MAME: il gioco è tra quelli di cui si salvano i record */
  hiscore: boolean
  /** All'avvio va chiesto "continua o nuova partita" */
  ask: boolean
}

export interface SaveStats {
  dir: string
  files: number
  bytes: number
}

/** Statistiche di un gioco */
export interface PlayStat {
  plays: number
  seconds: number
  /** Ultima partita (millisecondi) */
  last: number
}

/** Nitidezza dei pixel (RetroArch): nessuna, morbida (sharp-bilinear) o alta qualità (xBRZ) */
export type Sharpness = 'off' | 'soft' | 'high'

export interface CacheStats {
  dir: string
  total: number
  downloaded: number
  localCopies: number
  files: number
}

/** Cosa permette questo PC per la nitidezza dei pixel, e cosa c'è installato */
export interface SharpnessInfo {
  soft: { ok: boolean; reason: string }
  high: { ok: boolean; reason: string }
  installed: { soft: boolean; high: boolean }
  retroarch: boolean
}

export interface ArtBulkState {
  systemId: string
  running: boolean
  total: number
  done: number
  /** Copertine trovate (le altre non esistono nell'archivio) */
  found: number
}

export interface LaunchOptions {
  /** Nuova partita: non carica lo stato salvato (se c'è, se ne conserva una copia) */
  fresh?: boolean
}

export interface DiagnosticCheck {
  level: 'ok' | 'warn' | 'bad'
  title: string
  detail: string
  /** Cosa fare per risolvere */
  fix: string
}

export interface DiagnosticReport {
  checks: DiagnosticCheck[]
  /** Testo completo, da copiare e mandare */
  text: string
  problems: number
  warnings: number
}

export interface SystemInfo extends SystemDef {
  gameCount: number
  /** Nascosto dalla griglia della home (scelta dell'utente) */
  hidden?: boolean
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
  /** Comandi assegnati a mano (valgono quando lo schema è "custom") */
  customControls: CustomControls | null
  /** Combinazioni del joypad per uscire dal gioco e aprire il menu */
  padExit: PadExit
  padMenu: PadMenu
  /** La procedura guidata del primo avvio è stata completata o saltata */
  firstRunDone: boolean
  /** Modalità cabinato: il launcher a tutto schermo senza bordi */
  /** Lingua del programma: auto = quella del sistema */
  language: 'auto' | 'it' | 'en'
  /** Mostra la schermata iniziale "premi start" all'avvio */
  titleScreen: boolean
  cabinetFullscreen: boolean
  /** Modalità immagine diversa per alcuni sistemi (id sistema -> modalità); gli altri usano imageStyle */
  imageBySystem: Record<string, ImageStyle>
  /** Giochi arcade verticali su un monitor montato ruotato: senso di rotazione (solo MAME) */
  tate: 'off' | 'cw' | 'ccw'
  /** Bordo grafico (overlay) di RetroArch per riempire le strisce ai lati */
  overlayEnabled: boolean
  overlayPath: string
  /** Cartella con i bordi (.cfg): per ogni sistema si cerca da sola quello giusto */
  overlayDir: string
  /** Cartella dei salvataggi (vuota = "saves" accanto alla cartella ROM) */
  savesDir: string
  /** Console: salva da sola lo stato all'uscita e propone di continuare all'avvio (sostituisce la Memory Card) */
  resumeConsoles: boolean
  /** Cartella dove tenere la cache delle immagini (vuota = nei dati del programma); dentro si crea «MrEmulator-artwork» */
  cacheDir: string
  /** Limite della cache in GB (0 = nessun limite): oltre, si tolgono le immagini più vecchie */
  cacheMaxGb: number
  /** Nitidezza dei pixel con gli shader di RetroArch (si applica solo dove il PC lo permette) */
  sharpness: Sharpness
  /** Console: scelta per singolo sistema (id del sistema -> sì/no); se manca vale l'interruttore generale */
  resumeBySystem: Record<string, boolean>
  /** RetroAchievements: trofei dentro i giochi di RetroArch */
  raEnabled: boolean
  raUser: string
  raPassword: string
  /** Modalità "hardcore": niente salvataggi di stato né trucchi (le regole di RetroAchievements) */
  raHardcore: boolean
  /** Trucchi (cheat): applica da solo quelli del database di RetroArch, se ce n'è uno per il gioco */
  cheatsAuto: boolean
  /** Arcade: per ogni gioco, se riprendere la partita (id del gioco -> sì/no) */
  resumeArcade: Record<string, boolean>
  /** MAME: salva i punteggi record dei giochi arcade (plugin hiscore) */
  hiscore: boolean
  /** Quando si apre un sistema, scarica da sola le copertine di tutti i suoi giochi (usa più dati) */
  autoCovers: boolean
  /** Giochi a più dischi: un solo gioco nella lista (con cambio disco), invece di un gioco per disco */
  groupDiscs: boolean
  /** Controlla da solo se c'è una nuova versione (una richiesta a GitHub al giorno) */
  checkUpdates: boolean
  /** Stile della schermata dei sistemi: fumetto (poster) o palcoscenico */
  uiStyle: 'comic' | 'stage'
  /** Le foto delle console messe dall'utente si trasformano in stile fumetto */
  stylizePhotos: boolean
  /** Bordo scelto a mano per un sistema ("-" = nessun bordo per quel sistema) */
  overlayBySystem: Record<string, string>
  /** Tema grafico del launcher */
  theme: 'fighter' | 'neon' | 'retro' | 'mono'
  /** Effetto schermo a tubo catodico nei giochi RetroArch: auto = scelto dal programma in base al PC */
  crtShader: 'auto' | 'off' | 'crt-easymode' | 'crt-geom' | 'crt-lottes' | 'crt-royale'
  /** Si avvia da solo all'accensione di Windows (solo nella versione installata) */
  cabinetAutostart: boolean
  /** Il cursore del mouse sparisce dopo qualche secondo di inattività */
  cabinetHideCursor: boolean
  /** Alt+F4 e la chiusura accidentale non spengono il programma (si esce con Ctrl+Maiusc+Q o dalle impostazioni) */
  cabinetLockClose: boolean
  /** Arcade/Neo Geo: mostra anche i giochi che il motore FBNeo non supporta (set MAME completi) */
  showUnsupported: boolean
  /** MAME autonomo (mame.exe), usato dal sistema "Arcade (MAME)" */
  mamePath: string
  /** Cartella dei dischi CHD (facoltativa): si aggiunge a quella delle ROM */
  mameChdDir: string
  /** Nasconde dalla lista i giochi che il controllo ROM ha trovato difettosi */
  hideBadRoms: boolean
  /** Per i giochi che sono partiti solo con un profilo prudente: livello del profilo (0 = completo) */
  launchFix: Record<string, number>
  /** Se più giochi hanno richiesto un profilo prudente, tutti partono almeno da questo livello (evita i tentativi falliti) */
  launchFloor: number
  /** Cartella con le immagini locali (pacchetti Multimedia / EXTRAs): schermate, copertine, titoli col nome breve del gioco */
  mediaDir: string
  /** Cartella con i DAT (FinalBurn Neo, Kawaks, MAME…): nome breve -> titolo, hanno la precedenza */
  datDir: string
  /** Sistemi nascosti nella griglia della home */
  hiddenSystems: string[]
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
export type InputScheme = 'laptop' | 'cabinet' | 'custom'

/** Come si esce da un gioco con il joypad */
export type PadExit = 'start-select' | 'hold-select' | 'l3-r3' | 'none'
/** Come si apre il menu del gioco (RetroArch / MAME) con il joypad */
export type PadMenu = 'hold-start' | 'l3-r3' | 'l1-r1-start-select' | 'none'
export interface PadCombos {
  exit: PadExit
  menu: PadMenu
}

/** Azioni di un giocatore che si possono assegnare a mano */
export type ActionId = 'up' | 'down' | 'left' | 'right' | 'b1' | 'b2' | 'b3' | 'b4' | 'b5' | 'b6' | 'l2' | 'r2' | 'l3' | 'r3' | 'start' | 'select'

/** A cosa è collegata un'azione: un tasto (nome RetroArch), un pulsante del pad (indice) o un asse ("+0", "-1") */
export interface Binding {
  key?: string
  btn?: number
  axis?: string
  /** Croce direzionale che il pad presenta come "hat" (comune nei pad non Xbox) */
  hat?: 'up' | 'down' | 'left' | 'right'
}

export type PlayerControls = Record<ActionId, Binding>
export interface CustomControls {
  p1: PlayerControls
  p2: PlayerControls
}
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

export type PickKind = 'dir' | 'file' | 'cfg'

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
  /** Testo completo dell'ultimo errore di MAME (per copiarlo) */
  getLastMameLog(): Promise<string>
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
  /** Avvisi non gravi durante l'avvio (per esempio "riprovo senza effetti video") */
  onGameNote(cb: (message: string) => void): () => void
  getLibraryStatus(): Promise<LibraryEvent>
  onLibrary(cb: (e: LibraryEvent) => void): () => void
  getInputMap(): Promise<InputMapReport>
  /** Punti di partenza per i comandi manuali */
  getControlPresets(): Promise<{ laptop: CustomControls; cabinet: CustomControls }>
  getReport(): Promise<OptimizationReport>
  getDiagnostics(): Promise<DiagnosticReport>
  /** Elenco dei BIOS richiesti e se sono stati trovati */
  /** Core di RetroArch usati dai sistemi, con lo stato di installazione */
  getCoreList(): Promise<Array<{ core: string; systems: string[]; installed: boolean; games: number }>>
  /** Scarica un core dall'archivio ufficiale di RetroArch */
  detectTool(kind: 'retroarch' | 'mame'): Promise<string[]>
  openToolSite(kind: 'retroarch' | 'mame'): Promise<void>
  onCheatsProgress(cb: (pct: number) => void): () => void
  getSharpnessInfo(): Promise<SharpnessInfo>
  getCacheStats(): Promise<CacheStats>
  optimizeCache(): Promise<{ files: number; saved: number }>
  cancelCacheJob(): Promise<void>
  clearCache(what: 'local' | 'all'): Promise<number>
  moveCache(dir: string): Promise<{ ok: boolean; error?: string }>
  onCacheProgress(cb: (pct: number) => void): () => void
  getCoverCounts(): Promise<Record<string, { have: number; total: number }>>
  installCheats(): Promise<{ ok: boolean; files: number; error?: string }>
  installCore(core: string): Promise<{ core: string; ok: boolean; error?: string }>
  /** Chiude il programma (anche con la chiusura bloccata) */
  quitApp(): Promise<void>
  getAppVersion(): Promise<string>
  /** Foto della console messa dall'utente (data URL), o null */
  getConsoleImage(systemId: string): Promise<string | null>
  /** Per ogni sistema, il file della foto trovato (null = nessuna) */
  listConsoleImages(): Promise<Record<string, string | null>>
  openConsoleImages(): Promise<void>
  /** Statistiche di tutti i giochi giocati (id del gioco -> statistiche) */
  getStats(): Promise<Record<string, PlayStat>>
  /** Nuova versione disponibile (null = nessuna o non controllato) */
  getUpdate(): Promise<{ version: string; url: string } | null>
  openUpdate(): Promise<void>
  /** Bordo (.cfg) trovato in una cartella per ogni sistema */
  findOverlays(dir: string): Promise<Record<string, string | null>>
  getBiosStatus(): Promise<Array<{ systemId: string; name: string; files: string[]; where: string; note: string; found: string | null; verified: 'ok' | 'unknown' | 'unchecked' | null }>>
  sendFeedback(systemId: string, answer: Feedback): Promise<void>
  /** Si attiva quando un gioco si chiude; restituisce la funzione per smettere di ascoltare */
  onGameEnded(cb: (e: GameEnded) => void): () => void
  getSystems(): Promise<SystemInfo[]>
  getGames(systemId: string): Promise<Game[]>
  getSettings(): Promise<Settings>
  saveSettings(s: Settings): Promise<Settings>
  launch(game: Game, opts?: LaunchOptions): Promise<LaunchResult>
  startArtBulk(systemId: string): Promise<{ ok: boolean; error?: string }>
  cancelArtBulk(): Promise<void>
  onArtBulk(cb: (s: ArtBulkState) => void): () => void
  getSaveInfo(game: Game): Promise<SaveInfo>
  setResume(gameId: string, on: boolean): Promise<void>
  getSaveStats(): Promise<SaveStats>
  openSaves(): Promise<void>
  backupSaves(): Promise<{ ok: boolean; path?: string; files?: number; error?: string }>
  restoreSaves(): Promise<{ ok: boolean; files?: number; error?: string }>
  importSaves(): Promise<{ copied: number }>
  pickPath(kind: PickKind): Promise<string | null>
  /** Restituisce l'indirizzo locale di una copertina (la scarica se manca) oppure null */
  /** Apre in Esplora risorse la cartella ROM, BIOS o di un sistema */
  openFolder(target: 'roms' | 'bios' | string): Promise<void>
  /** Crea le cartelle ROM/BIOS mancanti e le imposta come predefinite */
  setupFolders(): Promise<Settings>
  /** cachedOnly: restituisce solo ciò che è già salvato, senza scaricare niente */
  getArt(game: Game, kind: ArtKind, cachedOnly?: boolean): Promise<string | null>
}
