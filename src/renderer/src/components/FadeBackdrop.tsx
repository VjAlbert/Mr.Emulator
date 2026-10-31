import { useEffect, useRef, useState } from 'react'

interface Layer {
  id: number
  url: string | null
}

/** Sfondo che passa da un'immagine all'altra con dissolvenza */
export default function FadeBackdrop({ url }: { url: string | null }): React.JSX.Element {
  const [layers, setLayers] = useState<Layer[]>([])
  const counter = useRef(0)

  useEffect(() => {
    const id = ++counter.current
    setLayers((l) => [...l.slice(-1), { id, url }])
    // dopo la dissolvenza si tiene solo l'immagine nuova
    const t = window.setTimeout(() => setLayers((l) => l.filter((x) => x.id === id)), 1100)
    return () => window.clearTimeout(t)
  }, [url])

  return (
    <div className="backdrop" aria-hidden>
      {layers.map((l, i) =>
        l.url ? <img key={l.id} src={l.url} alt="" draggable={false} className={i === layers.length - 1 ? 'in' : 'out'} /> : null
      )}
    </div>
  )
}
