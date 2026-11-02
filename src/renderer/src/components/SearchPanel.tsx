import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '@shared/types'
import { setModalOpen, useInput } from '../hooks/useInput'
import { decadeLabel, highlightRanges, INITIALS, initialOf, nextChars, searchTitles, splitTitle } from '../search'
import { loadAll, pickArt } from '../hooks/useArt'
import FadeBackdrop from './FadeBackdrop'
import { sfx } from '../sound'

type Zone = 'initials' | 'keys' | 'pane'
type Layout = 'qwerty' | 'alfa'
type View = null | 'fav' | 'recent'

const LAYOUTS: Record<Layout, string[][]> = {
  qwerty: ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'].map((r) => r.split('')),
  // per joystick e pad: l'ordine alfabetico si trova più in fretta della disposizione QWERTY
  alfa: ['1234567890', 'ABCDEFGHI', 'JKLMNOPQR', 'STUVWXYZ'].map((r) => r.split(''))
}
const ACTIONS = [
  { id: 'space', label: 'SPAZIO' },
  { id: 'back', label: '⌫ CANCELLA' },
  { id: 'clear', label: 'AZZERA' },
  { id: 'apply', label: 'MOSTRA TUTTI' }
]
const TILE_COLS = 3

interface Tile {
  id: string
  icon: string
  label: string
  sub: string
  run: () => void
}

interface Props {
  /** Titoli tra cui cercare (già ristretti ai filtri attivi) e le loro chiavi normalizzate */
  games: Game[]
  keys: string[]
  initialQuery: string
  family: string
  /** true = si può scrivere anche con la tastiera fisica (non con un pannello arcade, dove i tasti sono pulsanti di gioco) */
  typing: boolean
  families: Array<[string, number]>
  decades: Array<[string, number]>
  favorites: Game[]
  recents: Game[]
  favIds: Set<string>
  onFamily: () => void
  onFamilyPick: (f: string) => void
  onDecadePick: (d: string) => void
  onToggleFav: (g: Game) => void
  onPick: (g: Game) => void
  onApply: (query: string) => void
  onInitial: (ch: string) => void
  onClose: () => void
}

/** Titolo con le lettere cercate evidenziate */
function Hl({ text, query }: { text: string; query: string }): React.JSX.Element {
  const ranges = highlightRanges(text, query)
  if (!ranges.length) return <>{text}</>
  const out: React.ReactNode[] = []
  let at = 0
  ranges.forEach(([a, b], i) => {
    if (a > at) out.push(text.slice(at, a))
    out.push(<mark key={i}>{text.slice(a, b)}</mark>)
    at = b
  })
  if (at < text.length) out.push(text.slice(at))
  return <>{out}</>
}

/**
 * Ricerca pensata anche per chi non ha la tastiera: tastiera sullo schermo che spegne i tasti inutili,
 * iniziali per saltare subito, scorciatoie (famiglie, decenni, preferiti, a caso) e anteprima con copertina.
 */
export default function SearchPanel(p: Props): React.JSX.Element {
  const [query, setQuery] = useState(p.initialQuery)
  const [zone, setZone] = useState<Zone>('keys')
  const [row, setRow] = useState(1)
  const [col, setCol] = useState(0)
  const [ini, setIni] = useState(0)
  const [res, setRes] = useState(0)
  const [tile, setTile] = useState(0)
  const [view, setView] = useState<View>(null)
  const [flash, setFlash] = useState('')
  const [, setTick] = useState(0)
  const [layout, setLayout] = useState<Layout>(() => {
    try {
      const saved = localStorage.getItem('mr.kbd')
      if (saved === 'qwerty' || saved === 'alfa') return saved
    } catch {
      // niente memoria del browser: si usa il predefinito
    }
    return p.typing ? 'qwerty' : 'alfa'
  })
  // il puntatore fermo non deve rubare la selezione quando i risultati scorrono sotto di lui
  const lastMouse = useRef({ x: -1, y: -1 })
  const lastNav = useRef(0)
  const mouseMoved = (e: React.MouseEvent): boolean => {
    const moved = Math.abs(e.clientX - lastMouse.current.x) + Math.abs(e.clientY - lastMouse.current.y) > 2
    lastMouse.current = { x: e.clientX, y: e.clientY }
    return moved && performance.now() - lastNav.current > 250
  }
  const typed = useRef(false) // l'ultimo input veniva dalla tastiera fisica
  const paneRef = useRef<HTMLDivElement>(null)
  const rows = LAYOUTS[layout]
  const ACTION_ROW = rows.length

  useEffect(() => {
    setModalOpen(true)
    return () => setModalOpen(false)
  }, [])

  // ---- dati ----
  const hits = useMemo(() => searchTitles(p.keys, query, 30), [p.keys, query])
  const allowed = useMemo(() => nextChars(p.keys, query), [p.keys, query])
  const initialsPresent = useMemo(() => new Set(p.keys.map(initialOf)), [p.keys])

  const items: Game[] = query ? hits.top.map((i) => p.games[i]) : view === 'fav' ? p.favorites : view === 'recent' ? p.recents : []
  const showTiles = !query && !view

  const random = (): void => {
    if (p.games.length) p.onPick(p.games[Math.floor(Math.random() * p.games.length)])
  }
  const tiles: Tile[] = useMemo(() => {
    const t: Tile[] = [{ id: 'rnd', icon: '🎲', label: 'SORPRENDIMI', sub: 'un gioco a caso', run: random }]
    if (p.favorites.length) t.push({ id: 'fav', icon: '★', label: 'PREFERITI', sub: `${p.favorites.length.toLocaleString('it')} giochi`, run: () => enterView('fav') })
    if (p.recents.length) t.push({ id: 'rec', icon: '⏱', label: 'ULTIMI GIOCATI', sub: `${p.recents.length.toLocaleString('it')} giochi`, run: () => enterView('recent') })
    p.families.slice(0, 6).forEach(([n, c]) => t.push({ id: `f:${n}`, icon: '◆', label: n.toUpperCase(), sub: `${c.toLocaleString('it')} giochi`, run: () => p.onFamilyPick(n) }))
    p.decades.forEach(([d, c]) => t.push({ id: `d:${d}`, icon: '◷', label: decadeLabel(d), sub: `${c.toLocaleString('it')} giochi`, run: () => p.onDecadePick(d) }))
    return t
  }, [p.favorites, p.recents, p.families, p.decades, p.games]) // eslint-disable-line react-hooks/exhaustive-deps

  const enterView = (v: View): void => {
    setView(v)
    setRes(0)
    setZone('pane')
  }

  useEffect(() => setRes(0), [hits])

  // suono del cursore quando si sposta tra tasti, iniziali, schede e risultati
  const firstMove = useRef(true)
  useEffect(() => {
    if (firstMove.current) firstMove.current = false
    else sfx.move()
  }, [zone, row, col, ini, res, tile])

  // ---- tasti attivi (tastiera intelligente) ----
  const actionEnabled = (id: string): boolean =>
    id === 'space' ? !!query && !/\s$/.test(query) && allowed.has(' ') : id === 'back' || id === 'clear' ? !!query : hits.total > 0
  const rowLength = (r: number): number => (r < rows.length ? rows[r].length : ACTIONS.length)
  const keyEnabled = (r: number, c: number): boolean =>
    r < rows.length ? allowed.has(rows[r][c].toLowerCase()) : actionEnabled(ACTIONS[c].id)
  /** Colonna attiva più vicina a c nella riga r (-1 se la riga non ha tasti attivi) */
  const nearestEnabled = (r: number, from: number): number => {
    const n = rowLength(r)
    const c = Math.min(Math.max(from, 0), n - 1) // la riga può essere più corta della colonna di partenza
    for (let d = 0; d < n; d++) {
      if (c + d < n && keyEnabled(r, c + d)) return c + d
      if (c - d >= 0 && keyEnabled(r, c - d)) return c - d
    }
    return -1
  }

  // se il tasto selezionato si spegne, il cursore passa al tasto attivo più vicino
  useEffect(() => {
    if (zone !== 'keys' || row >= 0 && keyEnabled(Math.min(row, ACTION_ROW), Math.min(col, rowLength(Math.min(row, ACTION_ROW)) - 1))) return
    for (let d = 0; d <= ACTION_ROW; d++) {
      for (const r of [row + d, row - d]) {
        if (r < 0 || r > ACTION_ROW) continue
        const c = nearestEnabled(r, col)
        if (c >= 0) {
          setRow(r)
          setCol(c)
          return
        }
      }
    }
  }, [allowed, layout, hits.total]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- scrittura ----
  const append = (s: string): void => {
    sfx.key()
    setQuery((q) => (q + s).slice(0, 40))
    setView(null)
    setFlash(s.trim().toUpperCase())
    window.setTimeout(() => setFlash(''), 140)
  }
  const del = (): void => {
    sfx.back()
    setQuery((q) => q.slice(0, -1))
  }
  const pickItem = (i: number): void => {
    const g = items[i]
    if (g) {
      sfx.confirm()
      p.onPick(g)
    }
  }
  const toggleLayout = (): void => {
    const next: Layout = layout === 'qwerty' ? 'alfa' : 'qwerty'
    setLayout(next)
    setRow((r) => Math.min(r, LAYOUTS[next].length))
    try {
      localStorage.setItem('mr.kbd', next)
    } catch {
      // vedi sopra
    }
  }
  const runAction = (id: string): void => {
    if (id === 'space') append(' ')
    else if (id === 'back') del()
    else if (id === 'clear') setQuery('')
    else p.onApply(query)
  }

  const press = (): void => {
    if (zone === 'initials') return p.onInitial(INITIALS[ini])
    if (zone === 'pane') return showTiles ? tiles[tile]?.run() : pickItem(res)
    if (row < ACTION_ROW) return append(rows[row][col])
    runAction(ACTIONS[col].id)
  }

  const paneHasContent = showTiles ? tiles.length > 0 : items.length > 0

  const move = (d: 'up' | 'down' | 'left' | 'right'): void => {
    typed.current = false
    lastNav.current = performance.now()
    if (zone === 'initials') {
      const step = d === 'left' ? -1 : d === 'right' ? 1 : 0
      if (step) {
        for (let i = ini + step; i >= 0 && i < INITIALS.length; i += step) {
          if (initialsPresent.has(INITIALS[i])) {
            setIni(i)
            break
          }
        }
      } else if (d === 'down') {
        setZone('keys')
        const target = Math.round((ini * (rows[0].length - 1)) / (INITIALS.length - 1))
        for (let r = 0; r <= ACTION_ROW; r++) {
          const c = nearestEnabled(r, target)
          if (c >= 0) {
            setRow(r)
            setCol(c)
            break
          }
        }
      }
    } else if (zone === 'pane') {
      if (showTiles) {
        if (d === 'left') {
          if (tile % TILE_COLS === 0) setZone('keys')
          else setTile((t) => t - 1)
        } else if (d === 'right') setTile((t) => (t % TILE_COLS < TILE_COLS - 1 && t + 1 < tiles.length ? t + 1 : t))
        else if (d === 'up') setTile((t) => (t - TILE_COLS >= 0 ? t - TILE_COLS : t))
        else setTile((t) => (t + TILE_COLS < tiles.length ? t + TILE_COLS : t))
      } else if (d === 'up') setRes((i) => Math.max(0, i - 1))
      else if (d === 'down') setRes((i) => Math.min(items.length - 1, i + 1))
      else if (d === 'left') setZone('keys')
    } else if (d === 'left') {
      for (let c = col - 1; c >= 0; c--) {
        if (keyEnabled(row, c)) {
          setCol(c)
          break
        }
      }
    } else if (d === 'right') {
      let moved = false
      for (let c = col + 1; c < rowLength(row); c++) {
        if (keyEnabled(row, c)) {
          setCol(c)
          moved = true
          break
        }
      }
      if (!moved && paneHasContent) setZone('pane')
    } else if (d === 'up') {
      for (let r = row - 1; r >= 0; r--) {
        const c = nearestEnabled(r, col)
        if (c >= 0) {
          setRow(r)
          setCol(c)
          return
        }
      }
      setZone('initials')
      const near = Math.round((col * (INITIALS.length - 1)) / (rows[0].length - 1))
      setIni(initialsPresent.has(INITIALS[near]) ? near : Math.max(0, INITIALS.findIndex((x) => initialsPresent.has(x))))
    } else {
      for (let r = row + 1; r <= ACTION_ROW; r++) {
        const c = nearestEnabled(r, col)
        if (c >= 0) {
          setRow(r)
          setCol(c)
          return
        }
      }
    }
  }

  const zones: Zone[] = ['initials', 'keys', 'pane']
  useInput(
    {
      onMove: move,
      onConfirm: () => {
        // con la tastiera fisica Invio sceglie il risultato migliore; con joystick/pad preme il tasto selezionato
        if (typed.current && p.typing) {
          if (items.length) pickItem(zone === 'pane' ? res : 0)
          else p.onApply(query)
          return
        }
        press()
      },
      // B / Alt: cancella una lettera; a ricerca vuota chiude
      onBack: () => {
        if (zone === 'pane') {
          if (view) setView(null)
          else setZone('keys')
        } else if (query) del()
        else if (view) setView(null)
        else p.onClose()
      },
      onPage: (d) => setZone((z) => zones[Math.max(0, Math.min(2, zones.indexOf(z) + d))]),
      onMenu: p.onFamily,
      onAlt: toggleLayout
    },
    { modal: true }
  )

  // tastiera fisica: si scrive direttamente (catturata prima degli altri comandi); sul cabinato Start 2 cambia tastiera
  useEffect(() => {
    const kd = (e: KeyboardEvent): void => {
      if (!p.typing) {
        if (e.code === 'Digit2' && !e.repeat) {
          e.preventDefault()
          toggleLayout()
        }
        return
      }
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key.length === 1 && /[a-z0-9 '\-.]/i.test(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        typed.current = true
        append(/[a-z0-9]/i.test(e.key) ? e.key : ' ') // apostrofo, trattino e punto separano le parole
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        typed.current = true
        del()
      } else if (e.key === 'Escape' && !e.repeat) {
        e.preventDefault()
        e.stopPropagation()
        p.onClose()
      }
    }
    window.addEventListener('keydown', kd, true)
    return () => window.removeEventListener('keydown', kd, true)
  }, [p.typing, layout]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---- anteprima con copertina del risultato evidenziato ----
  const hi: Game | undefined = items.length ? (zone === 'pane' && !showTiles ? items[res] : items[0]) : undefined
  useEffect(() => {
    if (!hi) return
    let off = false
    const t = window.setTimeout(() => {
      loadAll(hi).then(() => !off && setTick((n) => n + 1))
    }, 150)
    return () => {
      off = true
      window.clearTimeout(t)
    }
  }, [hi?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const art = hi ? pickArt(hi.id) : null

  useEffect(() => {
    paneRef.current?.querySelector('.sp-res.active, .sp-tile.active')?.scrollIntoView({ block: 'nearest' })
  }, [res, tile, zone, items])

  const keyClass = (r: number, c: number, ch: string): string =>
    [
      zone === 'keys' && row === r && col === c ? 'on' : '',
      r < ACTION_ROW && !keyEnabled(r, c) ? 'off' : '',
      r === ACTION_ROW && !keyEnabled(r, c) ? 'off' : '',
      flash && flash === ch ? 'pressed' : ''
    ]
      .filter(Boolean)
      .join(' ')

  return (
    <div className="modal sp">
      <FadeBackdrop url={art?.back ?? null} />
      <div className="sp-box">
        <div className="sp-left">
          <div className="sp-query">
            <span className="sp-label">CERCA</span>
            <span className="sp-text">
              {query || <em>scrivi il titolo…</em>}
              <i className="sp-cursor" />
            </span>
            <button className="sp-x" onClick={toggleLayout} title="Cambia disposizione tastiera (X del pad · F2)">
              {layout === 'qwerty' ? 'ABC' : 'QWE'}
            </button>
            <button className="sp-x" onClick={p.onClose} title="Chiudi">
              ✕
            </button>
          </div>
          <div className="sp-info">
            {query ? `${hits.total.toLocaleString('it')} ${hits.total === 1 ? 'titolo' : 'titoli'}` : `${p.games.length.toLocaleString('it')} titoli`}
            {p.family ? ` · ${p.family}` : ''}
          </div>

          <div className="sp-initials">
            {INITIALS.map((c, i) => (
              <button
                key={c}
                className={`${zone === 'initials' && ini === i ? 'on' : ''} ${initialsPresent.has(c) ? '' : 'off'}`}
                onMouseEnter={() => {
                  setZone('initials')
                  setIni(i)
                }}
                onClick={() => p.onInitial(c)}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="sp-keys">
            {rows.map((r, ri) => (
              <div className="sp-row" key={ri}>
                {r.map((k, ci) => (
                  <button
                    key={k}
                    className={keyClass(ri, ci, k)}
                    onMouseEnter={() => {
                      if (keyEnabled(ri, ci)) {
                        setZone('keys')
                        setRow(ri)
                        setCol(ci)
                      }
                    }}
                    onClick={() => keyEnabled(ri, ci) && append(k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            ))}
            <div className="sp-row actions">
              {ACTIONS.map((a, ci) => (
                <button
                  key={a.id}
                  className={keyClass(ACTION_ROW, ci, a.id)}
                  onMouseEnter={() => {
                    if (keyEnabled(ACTION_ROW, ci)) {
                      setZone('keys')
                      setRow(ACTION_ROW)
                      setCol(ci)
                    }
                  }}
                  onClick={() => keyEnabled(ACTION_ROW, ci) && runAction(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-hint">
            {p.typing ? 'Scrivi con la tastiera, oppure usa joystick/pad · ' : 'Joystick: muovi · Pulsante 1: scrivi · Pulsante 2: cancella · Start 2: cambia tastiera · '}
            I tasti spenti non portano a nessun titolo · LB/RB cambia area · Start cambia famiglia
          </div>
        </div>

        <div className="sp-right">
          {hi && (
            <div className="sp-preview" key={hi.id}>
              <div className="sp-cover">
                {art?.cover ? <img src={art.cover} alt={hi.name} draggable={false} /> : <div className="sp-cover-ph">{hi.name.slice(0, 1)}</div>}
              </div>
              <div className="sp-pinfo">
                <div className="sp-pname">{splitTitle(hi.name).main}</div>
                {splitTitle(hi.name).tag && <div className="sp-ptag">{splitTitle(hi.name).tag}</div>}
                <div className="sp-pmeta">{[hi.group, hi.year && hi.year.replace(/\?/g, '')].filter(Boolean).join(' · ')}</div>
                <button className={`sp-star ${p.favIds.has(hi.id) ? 'on' : ''}`} onClick={() => p.onToggleFav(hi)}>
                  {p.favIds.has(hi.id) ? '★ NEI PREFERITI' : '☆ AGGIUNGI AI PREFERITI'}
                </button>
              </div>
            </div>
          )}

          <div className="sp-pane" ref={paneRef}>
            {view && (
              <div className="sp-viewhead">
                {view === 'fav' ? '★ PREFERITI' : '⏱ ULTIMI GIOCATI'}
                <button onClick={() => setView(null)}>◀ INDIETRO</button>
              </div>
            )}
            {showTiles && (
              <div className="sp-tiles">
                {tiles.map((t, i) => (
                  <button
                    key={t.id}
                    className={`sp-tile ${zone === 'pane' && tile === i ? 'active' : ''}`}
                    style={{ animationDelay: `${i * 22}ms` }}
                    onMouseMove={(e) => {
                      if (mouseMoved(e)) {
                        setZone('pane')
                        setTile(i)
                      }
                    }}
                    onClick={t.run}
                  >
                    <span className="sp-ticon">{t.icon}</span>
                    <span className="sp-tlabel">{t.label}</span>
                    <span className="sp-tsub">{t.sub}</span>
                  </button>
                ))}
              </div>
            )}
            {!showTiles && items.length === 0 && (
              <div className="sp-empty">{query ? <>Nessun titolo trovato per “{query}”.</> : <>Nessun gioco in questa lista.</>}</div>
            )}
            {!showTiles &&
              items.map((g, i) => {
                const t = splitTitle(g.name)
                return (
                  <button
                    key={g.id}
                    className={`sp-res ${zone === 'pane' && res === i ? 'active' : ''}`}
                    style={{ animationDelay: `${Math.min(i, 12) * 18}ms` }}
                    onMouseMove={(e) => {
                      if (mouseMoved(e)) {
                        setZone('pane')
                        setRes(i)
                      }
                    }}
                    onClick={() => p.onPick(g)}
                  >
                    <span className="sp-res-name">
                      {p.favIds.has(g.id) && <b className="fav">★</b>}
                      <Hl text={t.main} query={query} />
                      {t.tag && <small>{t.tag}</small>}
                    </span>
                    {g.group && <span className="sp-res-group">{g.group}</span>}
                  </button>
                )
              })}
            {!showTiles && query && hits.total > items.length && (
              <button className="sp-more" onClick={() => p.onApply(query)}>
                … e altri {(hits.total - items.length).toLocaleString('it')}: MOSTRA TUTTI NELLA LISTA
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
