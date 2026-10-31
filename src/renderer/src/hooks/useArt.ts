import type { Game } from '@shared/types'

/** Cache delle copertine già richieste in questa sessione (undefined = mai chiesta, null = non esiste) */
const done = new Map<string, string | null>()
const pending = new Map<string, Promise<string | null>>()

export const cachedArt = (id: string): string | null | undefined => done.get(id)

export const clearArtCache = (): void => done.clear()

export function loadArt(game: Game): Promise<string | null> {
  if (game.demo) return Promise.resolve(null)
  const hit = done.get(game.id)
  if (hit !== undefined) return Promise.resolve(hit)
  let p = pending.get(game.id)
  if (!p) {
    p = window.mr
      .getArt(game)
      .catch(() => null)
      .then((u) => {
        done.set(game.id, u)
        pending.delete(game.id)
        return u
      })
    pending.set(game.id, p)
  }
  return p
}
