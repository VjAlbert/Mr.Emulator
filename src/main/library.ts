import { promises as fsp } from 'fs'
import { join, parse } from 'path'
import type { Game, LibraryEvent, Settings, SystemDef } from '@shared/types'
import { BIOS_SETS, prettyName, scanSystemFiles } from './scanner'

/**
 * Libreria dei giochi: lista di ogni sistema tenuta in memoria e salvata su disco.
 * - All'avvio si legge la copia salvata (istantaneo anche con 50.000 giochi).
 * - La scansione vera parte in background e avvisa l'interfaccia solo se qualcosa è cambiato.
 * La lista contiene percorsi relativi alla cartella del sistema.
 */

const CACHE_VERSION = 2
const tick = (): Promise<void> => new Promise((r) => setImmediate(r))

/** Chiave di ordinamento: minuscolo, senza accenti né simboli iniziali (molto più veloce di localeCompare) */
const sortKey = (name: string): string =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/^[^a-z0-9]+/, '')

interface CacheFile {
  v: number
  romsDir: string
  showUnsupported: boolean
  /** true se i titoli completi (DAT) erano disponibili quando è stata creata */
  named: boolean
  /** [percorso relativo, titolo] */
  games: Array<[string, string]>
}

export interface LibraryDeps {
  cacheDir: string
  systems: SystemDef[]
  getSettings: () => Settings
  /** Elenco "nome file -> titolo completo" dei giochi arcade FBNeo (null se non disponibile) */
  titles: () => Promise<Map<string, string> | null>
  emit: (e: LibraryEvent) => void
}

export function createLibrary(deps: LibraryDeps) {
  const mem = new Map<string, Game[]>()
  const running = new Map<string, Promise<void>>()
  let status: LibraryEvent = { scanning: false, systemId: null, found: 0, updated: null }
  let generation = 0

  const emit = (patch: Partial<LibraryEvent>): void => {
    status = { ...status, updated: null, ...patch }
    deps.emit(status)
  }

  const cacheFile = (id: string): string => join(deps.cacheDir, `library-${id}.json`)

  const toGames = (sys: SystemDef, list: Array<[string, string]>): Game[] =>
    list.map(([rel, name]) => ({ id: `${sys.id}:${rel}`, name, fileName: parse(rel).base, path: rel, systemId: sys.id }))

  async function loadCache(sys: SystemDef): Promise<CacheFile | null> {
    try {
      const c = JSON.parse(await fsp.readFile(cacheFile(sys.id), 'utf-8')) as CacheFile
      const s = deps.getSettings()
      if (c.v !== CACHE_VERSION || c.romsDir !== s.romsDir || c.showUnsupported !== s.showUnsupported) return null
      return c
    } catch {
      return null
    }
  }

  async function scanOne(sys: SystemDef, gen: number): Promise<void> {
    const settings = deps.getSettings()
    if (!settings.romsDir) {
      mem.set(sys.id, [])
      return
    }
    const files = await scanSystemFiles(settings.romsDir, sys, (found) => {
      if (gen === generation) emit({ scanning: true, systemId: sys.id, found })
    })

    let titles: Map<string, string> | null = null
    if (sys.titleDat) titles = await deps.titles()

    const list: Array<[string, string]> = []
    let n = 0
    for (const rel of files) {
      if (++n % 3000 === 0) await tick()
      const stem = parse(rel).name
      if (sys.titleDat) {
        const key = stem.toLowerCase()
        if (BIOS_SETS.has(key)) continue
        const title = titles?.get(key)
        // senza l'elenco ufficiale non si può sapere cosa è giocabile: si mostra tutto
        if (titles && !title && !settings.showUnsupported) continue
        list.push([rel, title ?? prettyName(stem)])
      } else {
        list.push([rel, prettyName(rel)])
      }
    }
    // ordinamento: si calcola una chiave per titolo e poi si confrontano solo stringhe semplici
    const keyed: Array<[string, [string, string]]> = []
    for (let i = 0; i < list.length; i++) {
      if (i % 4000 === 3999) await tick()
      keyed.push([sortKey(list[i][1]), list[i]])
    }
    keyed.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    for (let i = 0; i < keyed.length; i++) list[i] = keyed[i][1]
    await tick()
    if (gen !== generation) return // nel frattempo sono cambiate le impostazioni: questo risultato è vecchio

    const next = toGames(sys, list)
    await tick()
    const prev = mem.get(sys.id)
    let changed = !prev || prev.length !== next.length
    if (!changed && prev) {
      for (let i = 0; i < next.length; i++) {
        if (i % 8000 === 7999) await tick()
        if (prev[i].id !== next[i].id || prev[i].name !== next[i].name) {
          changed = true
          break
        }
      }
    }
    mem.set(sys.id, next)

    const cache: CacheFile = { v: CACHE_VERSION, romsDir: settings.romsDir, showUnsupported: settings.showUnsupported, named: titles !== null || !sys.titleDat, games: list }
    await fsp.mkdir(deps.cacheDir, { recursive: true })
    await tick()
    const json = JSON.stringify(cache)
    await tick()
    await fsp.writeFile(cacheFile(sys.id), json, 'utf-8')
    if (changed) emit({ scanning: true, systemId: sys.id, found: next.length, updated: sys.id })
  }

  function scan(sys: SystemDef, gen: number): Promise<void> {
    const cur = running.get(sys.id)
    if (cur) return cur
    const p = scanOne(sys, gen).finally(() => running.delete(sys.id))
    running.set(sys.id, p)
    return p
  }

  /** Scansione di tutti i sistemi, uno alla volta, in background */
  async function scanAll(): Promise<void> {
    const gen = ++generation
    running.clear()
    emit({ scanning: true, systemId: null, found: 0 })
    for (const sys of deps.systems) {
      if (gen !== generation) return
      await scan(sys, gen)
    }
    if (gen === generation) emit({ scanning: false, systemId: null, found: 0 })
  }

  return {
    /** Legge le copie salvate (veloce) e avvia la scansione vera in background */
    async init(): Promise<void> {
      await Promise.all(
        deps.systems.map(async (sys) => {
          const c = await loadCache(sys)
          if (c) mem.set(sys.id, toGames(sys, c.games))
        })
      )
      deps.emit({ ...status, updated: null })
      void scanAll()
    },
    /** Da chiamare quando cambiano cartella ROM o opzioni che modificano le liste */
    rescan(clearLists: boolean): void {
      if (clearLists) mem.clear() // cartella ROM cambiata: le vecchie liste non valgono più
      void scanAll()
    },
    async games(systemId: string): Promise<Game[]> {
      const sys = deps.systems.find((s) => s.id === systemId)
      if (!sys) return []
      const known = mem.get(systemId)
      if (known) return known
      // prima volta in assoluto: si aspetta la scansione di questo sistema
      await scan(sys, generation || ++generation)
      return mem.get(systemId) ?? []
    },
    count(systemId: string): number {
      return mem.get(systemId)?.length ?? 0
    },
    status: (): LibraryEvent => status
  }
}
