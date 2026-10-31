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
}

export interface FolderInfo {
  romsDir: string
  biosDir: string
}

export interface LaunchResult {
  ok: boolean
  error?: string
}

export type PickKind = 'dir' | 'file'

export interface MrApi {
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
  getArt(game: Game): Promise<string | null>
}
