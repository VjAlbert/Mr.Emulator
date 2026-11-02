import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import CoverCarousel from './CoverCarousel'
import Orbs from './Orbs'
import FadeBackdrop from './FadeBackdrop'
import { pickArt } from '../hooks/useArt'

/** "Titolo (dettagli)" -> parte principale + dettagli tecnici mostrati più piccoli */
function splitTitle(name: string): { main: string; tag: string } {
  const i = name.indexOf(' (')
  return i > 0 ? { main: name.slice(0, i), tag: name.slice(i + 1) } : { main: name, tag: '' }
}

/** Altezza di una riga (compreso lo spazio): la lista disegna solo quelle visibili */
const ROW_H = 58
const OVERSCAN = 6
const PAGE = 10

/** Chiave per cercare e saltare con le lettere: minuscolo, senza accenti né simboli iniziali */
const norm = (s: string): string =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

interface Props {
  system: SystemInfo
  games: Game[]
  message: string
  onLaunch: (g: Game) => void
  onBack: () => void
  /** Con un pannello arcade i tasti lettera sono pulsanti di gioco: salto e ricerca vanno spenti */
  letterJump: boolean
}

export default function GameList({ system, games, message, onLaunch, onBack, letterJump }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const [, setTick] = useState(0)
  const [query, setQuery] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(600)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const byMouse = useRef(false)
  const selectedId = useRef<string | null>(null)

  // titoli normalizzati una volta sola (con 40.000 giochi non si può rifare a ogni tasto)
  const keys = useMemo(() => games.map((g) => norm(g.name)), [games])
  const { list, listKeys } = useMemo(() => {
    const q = norm(query.trim())
    if (!q) return { list: games, listKeys: keys }
    const l: Game[] = []
    const k: string[] = []
    for (let i = 0; i < games.length; i++) {
      if (keys[i].includes(q)) {
        l.push(games[i])
        k.push(keys[i])
      }
    }
    return { list: l, listKeys: k }
  }, [games, keys, query])

  const game = list[index]
  selectedId.current = game?.id ?? selectedId.current
  const title = game ? splitTitle(game.name) : null
  // schermata di gioco (orizzontale) mostrata in dissolvenza dietro l'interfaccia
  const back = game ? pickArt(game.id).back : null

  // se la lista cambia (ricerca, nuova scansione) si resta sullo stesso gioco, se c'è ancora
  useEffect(() => {
    const i = selectedId.current ? list.findIndex((g) => g.id === selectedId.current) : -1
    setIndex(i >= 0 ? i : 0)
  }, [list])

  const move = (fn: (i: number) => number): void => {
    byMouse.current = false
    setIndex((i) => Math.max(0, Math.min(list.length - 1, fn(i))))
  }

  useInput({
    onMove: (dir) => move((i) => (dir === 'up' || dir === 'left' ? i - 1 : i + 1)),
    onPage: (d) => move((i) => i + d * PAGE),
    onConfirm: () => game && onLaunch(game),
    onBack
  })

  // altezza visibile della lista
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewH(el.clientHeight))
    ro.observe(el)
    setViewH(el.clientHeight)
    return () => ro.disconnect()
  }, [])

  // la riga selezionata resta visibile (non quando è il mouse a cambiarla)
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    if (byMouse.current) {
      byMouse.current = false
      return
    }
    const top = index * ROW_H
    if (top < el.scrollTop) el.scrollTop = top
    else if (top + ROW_H > el.scrollTop + el.clientHeight) el.scrollTop = top + ROW_H - el.clientHeight
  }, [index, list])

  // tastiera: una lettera salta al prossimo titolo che inizia così; "/" o Ctrl+F aprono la ricerca
  useEffect(() => {
    if (!letterJump) return
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement
      if (t && t.tagName === 'INPUT') return
      if ((e.key === '/' && !e.ctrlKey) || (e.key.toLowerCase() === 'f' && e.ctrlKey)) {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1 || !/[a-z]/i.test(e.key)) return
      const ch = e.key.toLowerCase()
      move((i) => {
        const n = list.length
        for (let k = 1; k <= n; k++) {
          const j = (i + k) % n
          if (listKeys[j].replace(/^[^a-z0-9]+/, '').startsWith(ch)) return j
        }
        return i
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [list, listKeys, letterJump]) // eslint-disable-line react-hooks/exhaustive-deps

  // righe da disegnare: solo quelle visibili (+ qualcuna di margine)
  const first = Math.max(0, Math.floor(scrollTop / ROW_H) - OVERSCAN)
  const last = Math.min(list.length, Math.ceil((scrollTop + viewH) / ROW_H) + OVERSCAN)
  const rows: React.JSX.Element[] = []
  for (let i = first; i < last; i++) {
    const g = list[i]
    const t = splitTitle(g.name)
    rows.push(
      <button
        key={g.id}
        className={`row ${i === index ? 'active' : ''}`}
        style={{ top: i * ROW_H, height: ROW_H - 6 }}
        onMouseEnter={() => {
          byMouse.current = true
          setIndex(i)
        }}
        onClick={() => onLaunch(g)}
      >
        <span className="row-num">{String(i + 1).padStart(3, '0')}</span>
        <span className="row-name">
          {t.main}
          {t.tag && <small>{t.tag}</small>}
        </span>
      </button>
    )
  }

  return (
    <div className="screen games" style={{ ['--accent' as string]: system.color }}>
      <FadeBackdrop url={back} />
      <Orbs />
      <header className="topbar">
        <button className="chip" onClick={onBack}>
          ◀ INDIETRO
        </button>
        <h2 className="sys-title">{system.name}</h2>
        {letterJump && (
          <input
            ref={searchRef}
            className="search"
            placeholder="🔍 Cerca  ( / )"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                setQuery('')
                searchRef.current?.blur()
              } else if (e.key === 'Enter' || e.key === 'ArrowDown') {
                e.preventDefault()
                searchRef.current?.blur()
              }
            }}
          />
        )}
        <span className="counter">
          {list.length ? `${(index + 1).toLocaleString('it')} / ${list.length.toLocaleString('it')}` : ''}
          {query && games.length !== list.length ? ` (su ${games.length.toLocaleString('it')})` : ''}
        </span>
      </header>

      <div className="games-body">
        <div className="list" ref={listRef} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
          {list.length === 0 && (
            <div className="empty">
              {games.length === 0 ? (
                <>
                  Nessun gioco trovato in <b>{system.folder}</b>.
                  <br />
                  Copia qui le tue ROM e riapri questo sistema.
                  <br />
                  <button className="chip" onClick={() => window.mr.openFolder(system.id)}>
                    APRI LA CARTELLA
                  </button>
                </>
              ) : (
                <>Nessun titolo corrisponde a “{query}”.</>
              )}
            </div>
          )}
          <div className="list-inner" style={{ height: list.length * ROW_H }}>
            {rows}
          </div>
        </div>

        <aside className="preview">
          {game && title ? (
            <>
              <CoverCarousel games={list} index={index} onSelect={(i) => move(() => i)} onActivate={() => onLaunch(game)} onLoaded={() => setTick((n) => n + 1)} />
              <div key={game.id} className="preview-card">
                <div className="preview-name">{title.main}</div>
                {title.tag && <div className="preview-tag">{title.tag}</div>}
                <div className="preview-meta">
                  {system.name}
                  {game.demo ? ' · DEMO' : ''}
                </div>
                <div className="preview-start">▶ PREMI INVIO PER GIOCARE</div>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {message && <div className="toast">{message}</div>}
    </div>
  )
}
