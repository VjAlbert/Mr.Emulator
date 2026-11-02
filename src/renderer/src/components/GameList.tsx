import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Game, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import CoverCarousel from './CoverCarousel'
import Orbs from './Orbs'
import FadeBackdrop from './FadeBackdrop'
import SearchPanel from './SearchPanel'
import { pickArt } from '../hooks/useArt'
import { sfx } from '../sound'
import { music } from '../music'
import type { MediaTrack } from '@shared/types'
import type { LibraryStats } from '@shared/types'
import { decadeLabel, decadeOf, initialOf, matchAll, norm, splitTitle } from '../search'

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
  /** Apre il controllo ROM (solo per i sistemi MAME) */
  onRomCheck?: () => void
  /** Se c'è, il clic sull'avviso lo esegue (per copiare i dettagli di un errore) */
  onToastClick?: () => void
}

export default function GameList({ system, games, message, onLaunch, onBack, letterJump, onRomCheck, onToastClick }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0)
  const [, setTick] = useState(0)
  const [query, setQuery] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(600)
  const listRef = useRef<HTMLDivElement>(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const byMouse = useRef(false)
  // il puntatore fermo sulla lista non deve "rubare" la selezione quando le righe scorrono sotto di lui:
  // il mouse conta solo se si muove davvero e non subito dopo un comando da tastiera o pad
  const lastMouse = useRef({ x: -1, y: -1 })
  const lastNav = useRef(0)
  const mouseMoved = (e: React.MouseEvent): boolean => {
    const moved = Math.abs(e.clientX - lastMouse.current.x) + Math.abs(e.clientY - lastMouse.current.y) > 2
    lastMouse.current = { x: e.clientX, y: e.clientY }
    return moved && performance.now() - lastNav.current > 250
  }
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
  // decennio (solo se i giochi hanno l'anno: MAME) e preferiti / ultimi giochi
  const [decade, setDecade] = useState<string>(() => {
    try {
      return localStorage.getItem(`mr.decade.${system.id}`) ?? ''
    } catch {
      return ''
    }
  })
  const decades = useMemo(() => {
    const m = new Map<string, number>()
    for (const g of games) {
      const d = decadeOf(g.year)
      if (d) m.set(d, (m.get(d) ?? 0) + 1)
    }
    return [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
  }, [games])
  const activeDecade = decades.some(([d]) => d === decade) ? decade : ''
  const changeDecade = (d: string): void => {
    setDecade(d)
    try {
      localStorage.setItem(`mr.decade.${system.id}`, d)
    } catch {
      // vedi sopra
    }
  }
  // se la lista di MAME è vuota si spiega perché (solo BIOS? set di un'altra versione?)
  const [stats, setStats] = useState<LibraryStats | null>(null)
  useEffect(() => {
    if (system.engine === 'mame' && games.length === 0) window.mr.getLibraryStats(system.id).then(setStats)
  }, [system.id, system.engine, games.length])
  // giochi con ROM difettose (dal controllo ROM) e controllo di un singolo gioco
  const [badSet, setBadSet] = useState<Set<string>>(new Set())
  const [note, setNote] = useState('')
  useEffect(() => {
    if (system.engine !== 'mame') return
    const apply = (s: { badList: Array<{ name: string }> }): void => setBadSet(new Set(s.badList.map((b) => b.name)))
    window.mr.getVerify().then(apply)
    return window.mr.onVerify(apply)
  }, [system.engine])
  const checkOne = async (g: Game): Promise<void> => {
    if (!g.machine) return
    setNote('Controllo in corso…')
    const r = await window.mr.verifyMachine(g.machine)
    const msg = !r.ok
      ? (r.error ?? 'Controllo non riuscito.')
      : r.issues.length === 0
        ? '✔ ROM a posto: questo gioco è completo.'
        : `⚠ ROM difettosa: ${r.issues.slice(0, 3).map((i) => `${i.set}.zip → ${i.file}`).join(' · ')}${r.issues.length > 3 ? ` (+${r.issues.length - 3})` : ''}`
    setNote(msg)
    window.setTimeout(() => setNote(''), 9000)
  }
  const [prefs, setPrefs] = useState<{ favorites: string[]; recents: string[] }>({ favorites: [], recents: [] })
  useEffect(() => {
    window.mr.getPrefs().then(setPrefs)
  }, [])
  const favIds = useMemo(() => new Set(prefs.favorites), [prefs.favorites])
  const byId = useMemo(() => new Map(games.map((g) => [g.id, g])), [games])
  const favGames = useMemo(() => games.filter((g) => favIds.has(g.id)), [games, favIds])
  const recentGames = useMemo(
    () => prefs.recents.map((id) => byId.get(id)).filter((g): g is Game => !!g),
    [prefs.recents, byId]
  )
  const toggleFav = (g: Game): void => {
    window.mr.toggleFavorite(g.id).then((favorites) => setPrefs((p) => ({ ...p, favorites })))
  }

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
    if (!activeFamily && !activeDecade) return { base: games, baseKeys: keys }
    const b: Game[] = []
    const k: string[] = []
    for (let i = 0; i < games.length; i++) {
      if (activeFamily && games[i].group !== activeFamily) continue
      if (activeDecade && decadeOf(games[i].year) !== activeDecade) continue
      b.push(games[i])
      k.push(keys[i])
    }
    return { base: b, baseKeys: k }
  }, [games, keys, activeFamily, activeDecade])

  const { list, listKeys } = useMemo(() => {
    if (!query.trim()) return { list: base, listKeys: baseKeys }
    const idx = matchAll(baseKeys, query)
    return { list: idx.map((i) => base[i]), listKeys: idx.map((i) => baseKeys[i]) }
  }, [base, baseKeys, query])

  const game = list[index]
  // ---- media del gioco selezionato: filmato (videosnaps) e colonna sonora (soundtrack) ----
  const [mediaOpts, setMediaOpts] = useState({ video: false, music: true })
  useEffect(() => {
    window.mr.getSettings().then((s) => setMediaOpts({ video: s.videoPreview && !s.lightEffects && !!s.mediaDir, music: !!s.mediaDir }))
  }, [])
  const [video, setVideo] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [mediaNonce, setMediaNonce] = useState(0)
  const [tracks, setTracks] = useState<MediaTrack[]>([])
  useEffect(() => {
    // al cambio di gioco il filmato sparisce subito; ricompare dopo una breve sosta (scorrendo veloce non si carica niente)
    setVideo(null)
    setVideoReady(false)
    setTracks([])
    if (!game || game.demo || !game.machine && system.engine === 'mame') return
    let off = false
    const t = window.setTimeout(() => {
      if (mediaOpts.video) window.mr.getVideo(game).then((u) => !off && setVideo(u))
      if (mediaOpts.music) window.mr.getTracks(game).then((ts) => !off && setTracks(ts))
    }, 650)
    return () => {
      off = true
      window.clearTimeout(t)
    }
  }, [game?.id, mediaOpts.video, mediaOpts.music, mediaNonce]) // eslint-disable-line react-hooks/exhaustive-deps
  const firstIndex = useRef(true)
  useEffect(() => {
    if (firstIndex.current) firstIndex.current = false
    else sfx.move()
  }, [index])
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
    if (activeDecade && decadeOf(g.year) !== activeDecade) changeDecade('')
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

  /** Avvia un gioco: il filmato dell'anteprima si ferma (non deve girare mentre si gioca) e riparte al ritorno */
  const launchGame = (g: Game): void => {
    setVideo(null)
    setVideoReady(false)
    window.addEventListener('focus', () => setMediaNonce((n) => n + 1), { once: true })
    onLaunch(g)
  }

  const move = (fn: (i: number) => number): void => {
    byMouse.current = false
    lastNav.current = performance.now()
    setIndex((i) => Math.max(0, Math.min(list.length - 1, fn(i))))
  }

  useInput({
    onMove: (dir) => move((i) => (dir === 'up' || dir === 'left' ? i - 1 : i + 1)),
    onPage: (d) => move((i) => i + d * PAGE),
    onConfirm: () => game && launchGame(game),
    // Tab / Start del pad / Moneta 1: passa alla famiglia successiva (anche senza mouse)
    onMenu: nextFamily,
    // Y / X del pad: apre la ricerca
    onSearch: () => setSearchOpen(true),
    // Select del pad / F3: colonna sonora del gioco (pausa / riprendi / avvia)
    onMusic: () => game && (tracks.length ? music.toggleFor(game.id, game.name, tracks) : music.toggle()),
    // X del pad / F2: aggiunge o toglie il gioco dai preferiti
    onAlt: () => game && toggleFav(game),
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

  // la riga selezionata resta visibile (non quando è il mouse a cambiarla). Si fa prima del disegno e lo stato
  // dello scorrimento si aggiorna subito: altrimenti le righe da disegnare restano indietro di un'istante e la selezione "balla"
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    if (byMouse.current) {
      byMouse.current = false
      return
    }
    const top = index * ROW_H
    let next = el.scrollTop
    if (top < next) next = top
    else if (top + ROW_H > next + el.clientHeight) next = top + ROW_H - el.clientHeight
    if (next !== el.scrollTop) {
      el.scrollTop = next
      setScrollTop(el.scrollTop)
    }
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
        } else if (e.code === 'Digit2' && !e.repeat && game) {
          e.preventDefault()
          toggleFav(game)
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
  }, [list, listKeys, letterJump, searchOpen, game]) // eslint-disable-line react-hooks/exhaustive-deps

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
        onMouseMove={(e) => {
          if (i !== index && mouseMoved(e)) {
            byMouse.current = true
            setIndex(i)
          }
        }}
        onClick={() => launchGame(g)}
      >
        <span className="row-num">{String(i + 1).padStart(3, '0')}</span>
        <span className="row-name">
          {favIds.has(g.id) && <b className="fav">★</b>}
          {g.machine && badSet.has(g.machine) && <b className="warnmark">⚠</b>}
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
        {system.engine === 'mame' && onRomCheck && (
          <button className="chip" onClick={onRomCheck} title="Controlla gli ZIP delle ROM con MAME">
            🧪 CONTROLLO ROM
          </button>
        )}
        <button className="chip search-btn" onClick={() => setSearchOpen(true)} title="Cerca un titolo ( / · Y del pad · pulsante 4 del pannello )">
          🔍 CERCA
        </button>
        {activeDecade && (
          <button className="chip on" onClick={() => changeDecade('')} title="Togli il filtro per anni">
            {decadeLabel(activeDecade)} ✕
          </button>
        )}
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
                  {stats && stats.total > 0 && stats.bios + stats.device >= Math.ceil(stats.total * 0.8) ? (
                    <>
                      Nella cartella ci sono <b>{stats.total.toLocaleString('it')} ZIP, ma solo BIOS e dispositivi</b>: mancano gli ZIP dei <b>giochi</b>.
                      <br />
                      Serve anche il pacchetto delle ROM dei giochi della stessa versione di MAME ({stats.version || 'quella in uso'}).
                    </>
                  ) : stats && stats.total > 0 && stats.unknown > 0 ? (
                    <>
                      Nella cartella ci sono {stats.total.toLocaleString('it')} ZIP, ma <b>{stats.unknown.toLocaleString('it')} non sono riconosciuti da questo MAME</b> ({stats.version}).
                      <br />
                      Di solito vuol dire che il set ROM è di un'altra versione di MAME.
                    </>
                  ) : (
                    <>
                      Nessun gioco trovato in <b>{system.folder}</b>.
                      <br />
                      Copia qui le tue ROM e riapri questo sistema.
                    </>
                  )}
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

        <aside className={`preview ${video && videoReady ? 'has-video' : ''}`}>
          {game && title ? (
            <>
              {video && (
                <div className={`vmon ${videoReady ? 'on' : ''}`}>
                  <video
                    key={video}
                    src={video}
                    autoPlay
                    muted
                    loop
                    playsInline
                    onCanPlay={() => setVideoReady(true)}
                    onError={() => setVideo(null)}
                  />
                  <i className="vmon-scan" />
                  <span className="vmon-tag">● PLAY</span>
                </div>
              )}
              {/* con il filmato in primo piano la copertina resta visibile, come una custodia davanti allo schermo */}
              {video && videoReady && pickArt(game.id).cover && <img className="vcover" src={pickArt(game.id).cover!} alt="" draggable={false} />}
              <CoverCarousel games={list} systemName={system.name} color={system.color} index={index} onSelect={(i) => move(() => i)} onActivate={() => launchGame(game)} onLoaded={() => setTick((n) => n + 1)} />
              <div key={game.id} className="preview-card">
                <div className="preview-name">{title.main}</div>
                {title.tag && <div className="preview-tag">{title.tag}</div>}
                <div className="preview-meta">
                  {system.name}
                  {game.demo ? ' · DEMO' : ''}
                </div>
                {game.machine && badSet.has(game.machine) && <div className="warnchip">⚠ ROM DIFETTOSA: apri il Controllo ROM</div>}
                {tracks.length > 0 && (
                  <button className="sp-star music" onClick={() => music.toggleFor(game.id, game.name, tracks)} title="Colonna sonora (Select del pad · F3)">
                    ♪ COLONNA SONORA ({tracks.length} {tracks.length === 1 ? 'brano' : 'brani'})
                  </button>
                )}
                {system.engine === 'mame' && (
                  <button className="sp-star" onClick={() => checkOne(game)}>
                    🧪 CONTROLLA QUESTO GIOCO
                  </button>
                )}
                <button className={`sp-star ${favIds.has(game.id) ? 'on' : ''}`} onClick={() => toggleFav(game)} title="Preferito (X del pad · F2 · Start 2 sul pannello)">
                  {favIds.has(game.id) ? '★ NEI PREFERITI' : '☆ AGGIUNGI AI PREFERITI'}
                </button>
                <div className="preview-start">▶ PREMI INVIO PER GIOCARE</div>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {searchOpen && (
        <SearchPanel
          systemName={system.name}
          color={system.color}
          games={base}
          keys={baseKeys}
          initialQuery={query}
          family={activeFamily}
          typing={letterJump}
          families={groups}
          decades={decades}
          favorites={favGames}
          recents={recentGames}
          favIds={favIds}
          onFamilyPick={(f) => {
            changeFamily(f)
            setSearchOpen(false)
          }}
          onDecadePick={(d) => {
            changeDecade(d)
            setSearchOpen(false)
          }}
          onToggleFav={toggleFav}
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

      {(note || message) && (
        <div className="toast" style={onToastClick && !note ? { cursor: 'pointer', pointerEvents: 'auto' } : undefined} onClick={!note ? onToastClick : undefined}>
          {note || message}
        </div>
      )}
    </div>
  )
}
