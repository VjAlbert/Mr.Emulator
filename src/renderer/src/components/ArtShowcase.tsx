import { useEffect, useState } from 'react'
import { loadArt } from '../hooks/useArt'

const cache = new Map<string, string[]>()

function pickRandom<T>(list: T[], n: number): T[] {
  return [...list].sort(() => Math.random() - 0.5).slice(0, n)
}

/** Sfondo a rotazione: copertine casuali del sistema selezionato che si alternano lentamente */
export default function ArtShowcase({ systemId }: { systemId: string }): React.JSX.Element | null {
  const [urls, setUrls] = useState<string[]>(cache.get(systemId) ?? [])
  const [i, setI] = useState(0)

  useEffect(() => {
    let off = false
    setI(0)
    setUrls(cache.get(systemId) ?? [])
    if (cache.has(systemId)) return
    // attesa: spostando il cursore velocemente non si avviano ricerche inutili
    const t = window.setTimeout(async () => {
      const games = (await window.mr.getGames(systemId)).filter((g) => !g.demo)
      const out: string[] = []
      for (const g of pickRandom(games, 6)) {
        if (off) return
        const u = await loadArt(g)
        if (u) {
          out.push(u)
          if (!off) setUrls([...out])
        }
      }
      if (!off) cache.set(systemId, out)
    }, 350)
    return () => {
      off = true
      window.clearTimeout(t)
    }
  }, [systemId])

  useEffect(() => {
    if (urls.length < 2) return
    const t = window.setInterval(() => setI((n) => n + 1), 4200)
    return () => window.clearInterval(t)
  }, [urls.length])

  if (urls.length === 0) return null
  const url = urls[i % urls.length]
  return (
    <div className="bg-art" aria-hidden>
      <img key={url} src={url} alt="" draggable={false} />
    </div>
  )
}
