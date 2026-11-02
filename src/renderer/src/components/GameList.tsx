import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import CoverCarousel from './CoverCarousel'
import Orbs from './Orbs'
import FadeBackdrop from './FadeBackdrop'
import SearchPanel from './SearchPanel'
import { pickArt } from '../hooks/useArt'
import { initialOf, matchAll, norm, splitTitle } from '../search'

/** Altezza di una riga (compreso lo spazio): la lista disegna solo quelle visibili */
const ROW_H = 58
const OVERSCAN = 6
const PAGE = 10

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
  const [searchOpen, setSearchOpen] = useState(false)
  const byMouse = useRef(false)
  const selectedId = useRef<string | null>(null)

  // titoli normalizzati una volta sola (con 40.000 giochi non si può rifare a ogni tasto)
  const keys = useMemo(() => games.map((g) => norm(g.name)), [games])
  // famiglie (Neo Geo, Capcom CPS, Sega…): presenti solo per i sistemi che le conoscono (MAME)
  const [family, setFamily] = useState<string>(() => {
    try {
      return localStorage.getItem(`mr.family.${system.id}`) ?? ''
    } catch {
      return ''
    }
  })
  const groups = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of games) if (g.group) m.set(g.group, (m.get(g.group) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [games])
  const activeFamily = groups.some(([n]) => n === family) ? family : ''
  const changeFamily = (f: string): void => {
    setFamily(f)
    try {
      localStorage.setItem(`mr.family.${system.id}`, f)
    } catch {
      // senza memoria del browser il filtro si dimentica al prossimo avvio: nessun problema
    }
  }

  // base = giochi della famiglia scelta; list = base ristretta dal testo cercato
  const { base, baseKeys } = useMemo(() => {
    if (!activeFamily) return { base: games, baseKeys: keys }
    const b: Game[] = []
    const k: string[] = []
    for (let i = 0; i < games.length; i++) {
      if (games[i].group === activeFamily) {
        b.push(games[i])
        k.push(keys[i])
      }
    }
    return { base: b, baseKeys: k }
  }, [games, keys, activeFamily])

  const { list, listKeys } = useMemo(() => {
    if (!query.trim()) return { list: base, listKeys: baseKeys }
    const idx = matchAll(baseKeys, query)
    return { list: idx.map((i) => base[i]), listKeys: idx.map((i) => baseKeys[i]) }
  }, [base, baseKeys, query])

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

  /** Va a un gioco preciso: toglie il filtro di testo e lo seleziona (anche se non è nella famiglia scelta) */
  const goToGame = (g: Game): void => {
    selectedId.current = g.id
    if (activeFamily && g.group !== activeFamily) changeFamily('')
    setQuery('')
    setSearchOpen(false)
    // se la lista non cambia l'effetto sotto non scatta: si seleziona subito
    const i = base.findIndex((x) => x.id === g.id)
    if (i >= 0 && !query.trim()) setIndex(i)
  }

  /** Salta al primo titolo che inizia con quella lettera (# = numeri e simboli) */
  const jumpInitial = (ch: string): void => {
    const i = baseKeys.findIndex((k) => initialOf(k) === ch)
    if (i >= 0) goToGame(base[i])
    else setSearchOpen(false)
  }

  const nextFamily = (): void => {
    if (!groups.length) return
    const names = ['', ...groups.map(([n]) => n)]
    changeFamily(names[(names.indexOf(activeFamily) + 1) % names.length])
  }

  const move = (fn: (i: number) => number): void => {
    byMouse.current = false
    setIndex((i) => Math.max(0, Math.min(list.length - 1, fn(i))))
  }

  useInput({
    onMove: (dir) => move((i) => (dir === 'up' || dir === 'left' ? i - 1 : i + 1)),
    onPage: (d) => move((i) => i + d * PAGE),
    onConfirm: () => game && onLaunch(game),
    // Tab / Start del pad / Moneta 1: passa alla famiglia successiva (anche senza mouse)
    onMenu: nextFamily,
    // Y / X del pad: apre la ricerca
    onSearch: () => setSearchOpen(true),
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

  // tastiera: "/" o Ctrl+F aprono la ricerca; una lettera salta al prossimo titolo che inizia così.
  // Con il pannello arcade (lettere = pulsanti di gioco) la ricerca si apre con il pulsante 4 (Maiusc sinistro).
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (searchOpen) return
      if (!letterJump) {
        if (e.code === 'ShiftLeft' && !e.repeat) {
          e.preventDefault()
          setSearchOpen(true)
        }
        return
      }
      if ((e.key === '/' && !e.ctrlKey) || (e.key.toLowerCase() === 'f' && e.ctrlKey)) {
        e.preventDefault()
        setSearchOpen(true)
        return
      }
      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1 || !/[a-z]/i.test(e.key)) return
      const ch = e.key.toLowerCase()
      move((i) => {
        const n = list.length
        for (let k = 1; k <= n; k++) {
          const j = (i + k) % n
          if (listKeys[j].startsWith(ch)) return j
        }
        return i
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [list, listKeys, letterJump, searchOpen]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {groups.length > 1 && (
          <select
            className="family"
            value={activeFamily}
            title="Famiglia di giochi (Tab per cambiarla)"
            onChange={(e) => changeFamily(e.target.value)}
          >
            <option value="">Tutti ({games.length.toLocaleString('it')})</option>
            {groups.map(([n, c]) => (
              <option key={n} value={n}>
                {n} ({c.toLocaleString('it')})
              </option>
            ))}
          </select>
        )}
        <button className="chip search-btn" onClick={() => setSearchOpen(true)} title="Cerca un titolo ( / · Y del pad · pulsante 4 del pannello )">
          🔍 CERCA
        </button>
        {query.trim() && (
          <button className="chip on" onClick={() => setQuery('')} title="Togli il filtro">
            “{query.trim()}” ✕
          </button>
        )}
        <span className="counter">
          {list.length ? `${(index + 1).toLocaleString('it')} / ${list.length.toLocaleString('it')}` : ''}
          {(query || activeFamily) && games.length !== list.length ? ` (su ${games.length.toLocaleString('it')})` : ''}
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
                <>Nessun titolo corrisponde ai filtri scelti.</>
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

      {searchOpen && (
        <SearchPanel
          games={base}
          keys={baseKeys}
          initialQuery={query}
          family={activeFamily}
          typing={letterJump}
          onFamily={nextFamily}
          onPick={goToGame}
          onApply={(q) => {
            setQuery(q)
            setSearchOpen(false)
          }}
          onInitial={jumpInitial}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {message && <div className="toast">{message}</div>}
    </div>
  )
}
