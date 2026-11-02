import type { ArtKind, Game } from '@shared/types'

const KINDS: ArtKind[] = ['boxart', 'snap', 'title']

/** Immagini già richieste in questa sessione (undefined = mai chiesta, null = non esiste) */
const done = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()
/** Proporzioni (larghezza / altezza) di ogni immagine scaricata */
const ratios = new Map<string, number>()

const key = (id: string, kind: ArtKind): string => `${id}:${kind}`

export const clearArtCache = (): void => {
  done.clear()
  ratios.clear()
}

function measure(url: string): Promise<void> {
  return new Promise((resolve) => {
    const im = new Image()
    im.onload = () => {
      ratios.set(url, im.naturalWidth / im.naturalHeight)
      resolve()
    }
    im.onerror = () => resolve()
    im.src = url
  })
}

export function loadKind(game: Game, kind: ArtKind): Promise<string | null> {
  if (game.demo) return Promise.resolve(null)
  const k = key(game.id, kind)
  const hit = done.get(k)
  if (hit !== undefined) return Promise.resolve(hit)
  let p = pending.get(k)
  if (!p) {
    p = window.mr
      .getArt(game, kind)
      .catch(() => null)
      .then(async (url) => {
        if (url) await measure(url)
        done.set(k, url)
        pending.delete(k)
        return url
      })
    pending.set(k, p)
  }
  return p
}

/** Carica tutte le immagini disponibili di un gioco (copertina, schermata, titolo) */
export async function loadAll(game: Game): Promise<void> {
  await Promise.all(KINDS.map((k) => loadKind(game, k)))
}

/** Carica solo ciò che serve per la copertina: la scatola, e se manca una schermata */
export async function loadCover(game: Game): Promise<void> {
  if (!(await loadKind(game, 'boxart'))) await loadKind(game, 'snap')
}

export interface PickedArt {
  /** Copertina vera (immagine verticale); null se non esiste: allora si usa quella generata */
  cover: string | null
  /** Immagine per lo sfondo: preferibilmente orizzontale (schermata di gioco) */
  back: string | null
}

/** Sceglie dalle immagini già scaricate quale usare come copertina e quale come sfondo */
export function pickArt(id: string): PickedArt {
  const items = KINDS.map((kind) => {
    const url = done.get(key(id, kind)) ?? null
    return { kind, url, r: url ? (ratios.get(url) ?? 1) : 0 }
  }).filter((x): x is { kind: ArtKind; url: string; r: number } => !!x.url)

  const portrait = items.filter((x) => x.r <= 0.95)
  // la copertina è solo un'immagine verticale: se non c'è, il programma ne genera una (con la schermata dentro, se esiste)
  const cover = (portrait.find((x) => x.kind === 'boxart') ?? portrait[0])?.url ?? null

  const landscape = items.filter((x) => x.r > 0.95 && x.url !== cover)
  const back = (landscape.find((x) => x.kind === 'snap') ?? landscape.find((x) => x.kind === 'title') ?? landscape[0])?.url ?? null
  return { cover, back }
}

/**
 * Guarda solo cosa c'è già sul disco (nessun download): serve alla rotazione a riposo,
 * che non deve scaricare niente di nuovo.
 */
export async function peekKind(game: Game, kind: ArtKind): Promise<string | null> {
  if (game.demo) return null
  const k = key(game.id, kind)
  const hit = done.get(k)
  if (hit) return hit
  const url = await window.mr.getArt(game, kind, true).catch(() => null)
  if (url) {
    await measure(url)
    done.set(k, url) // un risultato "no" non si memorizza: potrebbe comparire più tardi
  }
  return url
}
