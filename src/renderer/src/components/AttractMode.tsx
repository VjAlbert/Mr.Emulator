import { useEffect, useRef, useState } from 'react'
import type { Game, SystemInfo } from '@shared/types'
import { setModalOpen } from '../hooks/useInput'
import { peekKind, pickArt } from '../hooks/useArt'
import { splitTitle } from '../search'

interface Slide {
  game: Game
  system: SystemInfo
  cover: string | null
  back: string | null
}

const SLIDE_MS = 6500
const sample = <T,>(list: T[], n: number): T[] => [...list].sort(() => Math.random() - 0.5).slice(0, n)

/**
 * Rotazione a riposo, come nelle sale giochi: copertine e schermate di giochi a caso.
 * Usa solo le immagini già presenti sul disco (non scarica niente). Qualsiasi comando la chiude.
 */
export default function AttractMode({ systems, onClose }: { systems: SystemInfo[]; onClose: () => void }): React.JSX.Element {
  const [slides, setSlides] = useState<Slide[]>([])
  const [i, setI] = useState(0)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setModalOpen(true)
    return () => setModalOpen(false)
  }, [])

  // si cercano giochi a caso che hanno già un'immagine in cache
  useEffect(() => {
    let off = false
    ;(async () => {
      const pool = systems.filter((s) => s.phase === 1 && s.gameCount > 0)
      const out: Slide[] = []
      for (let tries = 0; tries < 4 && out.length < 10 && !off && pool.length; tries++) {
        const system = pool[Math.floor(Math.random() * pool.length)]
        const games = await window.mr.getGames(system.id)
        for (const game of sample(games, 12)) {
          if (off || out.length >= 10) break
          if (out.some((x) => x.game.id === game.id)) continue
          await Promise.all([peekKind(game, 'boxart'), peekKind(game, 'snap')])
          const art = pickArt(game.id)
          if (art.cover || art.back) out.push({ game, system, cover: art.cover, back: art.back })
        }
      }
      if (!off) setSlides(out.sort(() => Math.random() - 0.5))
    })()
    return () => {
      off = true
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (slides.length < 2) return
    const t = window.setInterval(() => setI((n) => (n + 1) % slides.length), SLIDE_MS)
    return () => window.clearInterval(t)
  }, [slides.length])

  // qualsiasi comando la chiude, e quel comando non deve valere anche per la schermata sotto
  useEffect(() => {
    const swallow = (e: Event): void => {
      e.stopPropagation()
      e.preventDefault()
      onClose()
    }
    const move = (e: MouseEvent): void => {
      if (!startPos.current) startPos.current = { x: e.clientX, y: e.clientY }
      if (Math.hypot(e.clientX - startPos.current.x, e.clientY - startPos.current.y) > 40) swallow(e)
    }
    window.addEventListener('keydown', swallow, true)
    window.addEventListener('mousedown', swallow, true)
    window.addEventListener('touchstart', swallow, true)
    window.addEventListener('mousemove', move, true)
    let raf = 0
    const poll = (): void => {
      for (const pad of navigator.getGamepads()) {
        if (pad && (pad.buttons.some((b) => b.pressed) || Math.abs(pad.axes[0] ?? 0) > 0.6 || Math.abs(pad.axes[1] ?? 0) > 0.6)) return onClose()
      }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => {
      window.removeEventListener('keydown', swallow, true)
      window.removeEventListener('mousedown', swallow, true)
      window.removeEventListener('touchstart', swallow, true)
      window.removeEventListener('mousemove', move, true)
      cancelAnimationFrame(raf)
    }
  }, [onClose])

  const s = slides[i]
  return (
    <div className="at" style={{ ['--accent' as string]: s?.system.color ?? '#ff4fd8' }}>
      {s ? (
        <div className="at-slide" key={`${s.game.id}-${i}`}>
          {(s.back ?? s.cover) && <img className="at-bg" src={(s.back ?? s.cover)!} alt="" draggable={false} />}
          <div className="at-shade" />
          <div className="at-slashes" />
          {s.cover && s.back && <img className="at-cover" src={s.cover} alt="" draggable={false} />}
          <div className="at-info">
            <div className="at-sys">{s.system.name}</div>
            <div className="at-title">{splitTitle(s.game.name).main}</div>
            {s.game.year && <div className="at-year">{s.game.year.replace(/\?/g, '')}</div>}
          </div>
        </div>
      ) : (
        <div className="at-logo">
          MR. <span>EMULATOR</span>
        </div>
      )}
      <div className="at-press">INSERT COIN · PREMI UN PULSANTE</div>
    </div>
  )
}
