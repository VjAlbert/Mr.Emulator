import { useEffect, useState } from 'react'
import { stylizePhoto } from './stylize'

/** Immagini delle console messe dall'utente: lette e trasformate una volta sola, poi ricordate */
const cache = new Map<string, Promise<string | null>>()
let stylizeP: Promise<boolean> | null = null
let dirty = false

const wantStylize = (): Promise<boolean> => (stylizeP ??= window.mr.getSettings().then((s) => s.stylizePhotos !== false, () => true))

export function loadConsolePhoto(id: string): Promise<string | null> {
  let p = cache.get(id)
  if (!p) {
    p = Promise.all([window.mr.getConsoleImage(id), wantStylize()])
      .then(async ([raw, stylize]) => {
        if (!raw) return null
        if (!stylize) return raw
        try {
          return await stylizePhoto(raw)
        } catch {
          return raw // immagine che non si riesce a trasformare: si mostra com'è
        }
      })
      .catch(() => null)
    cache.set(id, p)
  }
  return p
}

/** Si rileggono tutte le immagini (dopo aver cambiato file o impostazioni) */
export function refreshConsoleArt(): void {
  cache.clear()
  stylizeP = null
  window.dispatchEvent(new Event('mr-console-refresh'))
}

/** L'utente ha aperto la cartella delle immagini: al ritorno nel programma si rileggono */
export function markConsoleImagesDirty(): void {
  dirty = true
}
window.addEventListener('focus', () => {
  if (dirty) {
    dirty = false
    refreshConsoleArt()
  }
})

/** Immagine (già trasformata) della console, o null se l'utente non ne ha messa una */
export function useConsolePhoto(id: string): string | null {
  const [photo, setPhoto] = useState<string | null>(null)
  const [v, setV] = useState(0)
  useEffect(() => {
    const on = (): void => setV((n) => n + 1)
    window.addEventListener('mr-console-refresh', on)
    return () => window.removeEventListener('mr-console-refresh', on)
  }, [])
  useEffect(() => {
    let dead = false
    setPhoto(null)
    loadConsolePhoto(id).then((u) => !dead && setPhoto(u))
    return () => {
      dead = true
    }
  }, [id, v])
  return photo
}
