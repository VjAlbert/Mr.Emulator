import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '@shared/types'
import { setModalOpen, useInput } from '../hooks/useInput'
import { INITIALS, searchTitles, splitTitle } from '../search'

type Zone = 'initials' | 'keys' | 'results'

const ROWS = ['1234567890'.split(''), 'QWERTYUIOP'.split(''), "ASDFGHJKL'".split(''), 'ZXCVBNM-.'.split('')]
const ACTIONS = [
  { id: 'space', label: 'SPAZIO' },
  { id: 'back', label: '⌫ CANCELLA' },
  { id: 'clear', label: 'AZZERA' },
  { id: 'apply', label: 'MOSTRA TUTTI' }
]
const rowLen = (r: number): number => (r < ROWS.length ? ROWS[r].length : ACTIONS.length)
const ACTION_ROW = ROWS.length

interface Props {
  /** Titoli tra cui cercare (già ristretti alla famiglia scelta) e le loro chiavi normalizzate */
  games: Game[]
  keys: string[]
  initialQuery: string
  family: string
  /** true = si può scrivere anche con la tastiera fisica (non con un pannello arcade, dove i tasti sono pulsanti di gioco) */
  typing: boolean
  onFamily: () => void
  onPick: (g: Game) => void
  onApply: (query: string) => void
  onInitial: (ch: string) => void
  onClose: () => void
}

/**
 * Ricerca pensata anche per chi non ha la tastiera: tastiera sullo schermo che si usa con joystick,
 * pad o mouse, iniziali per saltare subito, risultati in tempo reale.
 */
export default function SearchPanel(p: Props): React.JSX.Element {
  const [query, setQuery] = useState(p.initialQuery)
  const [zone, setZone] = useState<Zone>('keys')
  const [row, setRow] = useState(1)
  const [col, setCol] = useState(0)
  const [ini, setIni] = useState(0)
  const [res, setRes] = useState(0)
  const typed = useRef(false) // l'ultimo input veniva dalla tastiera fisica
  const resRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setModalOpen(true)
    return () => setModalOpen(false)
  }, [])

  const hits = useMemo(() => searchTitles(p.keys, query, 30), [p.keys, query])
  useEffect(() => setRes(0), [hits])
  useEffect(() => {
    resRef.current?.querySelector('.sp-res.active')?.scrollIntoView({ block: 'nearest' })
  }, [res, hits])

  const append = (s: string): void => setQuery((q) => (q + s).slice(0, 40))
  const del = (): void => setQuery((q) => q.slice(0, -1))
  const hasResults = hits.top.length > 0
  const pickIndex = (i: number): void => {
    const g = p.games[hits.top[i]]
    if (g) p.onPick(g)
  }

  const press = (): void => {
    if (zone === 'initials') return p.onInitial(INITIALS[ini])
    if (zone === 'results') return pickIndex(res)
    if (row < ACTION_ROW) return append(ROWS[row][col])
    const a = ACTIONS[col].id
    if (a === 'space') append(' ')
    else if (a === 'back') del()
    else if (a === 'clear') setQuery('')
    else p.onApply(query)
  }

  const move = (d: 'up' | 'down' | 'left' | 'right'): void => {
    typed.current = false
    if (zone === 'initials') {
      if (d === 'left') setIni((i) => Math.max(0, i - 1))
      else if (d === 'right') setIni((i) => Math.min(INITIALS.length - 1, i + 1))
      else if (d === 'down') {
        setZone('keys')
        setRow(0)
        setCol(Math.round((ini * (ROWS[0].length - 1)) / (INITIALS.length - 1)))
      }
    } else if (zone === 'results') {
      if (d === 'up') setRes((i) => Math.max(0, i - 1))
      else if (d === 'down') setRes((i) => Math.min(hits.top.length - 1, i + 1))
      else if (d === 'left') setZone('keys')
    } else {
      if (d === 'left') setCol((c) => Math.max(0, c - 1))
      else if (d === 'right') {
        if (col >= rowLen(row) - 1) {
          if (hasResults) setZone('results')
        } else setCol((c) => c + 1)
      } else if (d === 'up') {
        if (row === 0) {
          setZone('initials')
          setIni(Math.round((col * (INITIALS.length - 1)) / (ROWS[0].length - 1)))
        } else {
          setRow(row - 1)
          setCol((c) => Math.min(c, rowLen(row - 1) - 1))
        }
      } else if (row < ACTION_ROW) {
        setRow(row + 1)
        setCol((c) => Math.min(c, rowLen(row + 1) - 1))
      }
    }
  }

  const zones: Zone[] = ['initials', 'keys', 'results']
  useInput(
    {
      onMove: move,
      onConfirm: () => {
        // con la tastiera fisica Invio sceglie il risultato migliore; con joystick/pad preme il tasto selezionato
        if (typed.current && p.typing) {
          if (hasResults) pickIndex(zone === 'results' ? res : 0)
          else p.onApply(query)
          return
        }
        press()
      },
      // B / Alt: cancella una lettera; a ricerca vuota chiude
      onBack: () => {
        if (zone === 'results') setZone('keys')
        else if (query) del()
        else p.onClose()
      },
      onPage: (d) => setZone((z) => zones[Math.max(0, Math.min(2, zones.indexOf(z) + d))]),
      onMenu: p.onFamily
    },
    { modal: true }
  )

  // tastiera fisica: si scrive direttamente (catturata prima degli altri comandi)
  useEffect(() => {
    if (!p.typing) return
    const kd = (e: KeyboardEvent): void => {
      if (e.ctrlKey || e.altKey || e.metaKey) return
      if (e.key.length === 1 && /[a-z0-9 '\-.]/i.test(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        typed.current = true
        append(e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        e.stopPropagation()
        typed.current = true
        del()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        p.onClose()
      }
    }
    window.addEventListener('keydown', kd, true)
    return () => window.removeEventListener('keydown', kd, true)
  }, [p.typing]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="modal sp">
      <div className="sp-box">
        <div className="sp-left">
          <div className="sp-query">
            <span className="sp-label">CERCA</span>
            <span className="sp-text">
              {query || <em>scrivi il titolo…</em>}
              <i className="sp-cursor" />
            </span>
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
                className={zone === 'initials' && ini === i ? 'on' : ''}
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
            {ROWS.map((r, ri) => (
              <div className="sp-row" key={ri}>
                {r.map((k, ci) => (
                  <button
                    key={k}
                    className={zone === 'keys' && row === ri && col === ci ? 'on' : ''}
                    onMouseEnter={() => {
                      setZone('keys')
                      setRow(ri)
                      setCol(ci)
                    }}
                    onClick={() => append(k)}
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
                  className={zone === 'keys' && row === ACTION_ROW && col === ci ? 'on' : ''}
                  onMouseEnter={() => {
                    setZone('keys')
                    setRow(ACTION_ROW)
                    setCol(ci)
                  }}
                  onClick={() => {
                    if (a.id === 'space') append(' ')
                    else if (a.id === 'back') del()
                    else if (a.id === 'clear') setQuery('')
                    else p.onApply(query)
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="sp-hint">
            {p.typing ? 'Scrivi con la tastiera, oppure usa joystick/pad · ' : 'Joystick: muovi · Pulsante 1: scrivi · Pulsante 2: cancella · '}
            LB/RB cambia area · Start cambia famiglia
          </div>
        </div>

        <div className="sp-right" ref={resRef}>
          {!query && <div className="sp-empty">Scrivi qualche lettera, oppure scegli un'iniziale per saltare subito a quella lettera.</div>}
          {query && !hasResults && <div className="sp-empty">Nessun titolo trovato per “{query}”.</div>}
          {hits.top.map((gi, i) => {
            const g = p.games[gi]
            const t = splitTitle(g.name)
            return (
              <button
                key={g.id}
                className={`sp-res ${zone === 'results' && res === i ? 'active' : ''}`}
                onMouseEnter={() => {
                  setZone('results')
                  setRes(i)
                }}
                onClick={() => p.onPick(g)}
              >
                <span className="sp-res-name">
                  {t.main}
                  {t.tag && <small>{t.tag}</small>}
                </span>
                {g.group && <span className="sp-res-group">{g.group}</span>}
              </button>
            )
          })}
          {hits.total > hits.top.length && (
            <button className="sp-more" onClick={() => p.onApply(query)}>
              … e altri {(hits.total - hits.top.length).toLocaleString('it')}: MOSTRA TUTTI NELLA LISTA
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
