import { useEffect, useRef, useState } from 'react'
import type { LibraryEvent, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import { sfx } from '../sound'
import ArtShowcase from './ArtShowcase'
import Orbs from './Orbs'
import ConsoleImage from './ConsoleImage'
import { getLang, t } from '../i18n'

const COLS = 3

/** Punte dell'esplosione gialla dietro la console (stile fumetto) */
const BURST = Array.from({ length: 32 }, (_, i) => {
  const r = i % 2 ? 58 : 98
  const a = (i * Math.PI) / 16
  return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
}).join(' ')

interface Props {
  systems: SystemInfo[]
  onOpen: (s: SystemInfo) => void
  onSettings: () => void
  onPc: () => void
  onInput: () => void
  lib: LibraryEvent | null
  /** Nuova versione disponibile (se c'è) */
  update?: { version: string; url: string } | null
  onUpdate?: () => void
}

export default function SystemSelect({ systems, onOpen, onSettings, onPc, onInput, lib, update, onUpdate }: Props): React.JSX.Element {
  const [index, setIndex] = useState(0)
  // stile della schermata (fumetto o palcoscenico), scelto nelle impostazioni
  const [style, setStyle] = useState<'comic' | 'stage'>('comic')
  useEffect(() => {
    window.mr.getSettings().then((s) => setStyle(s.uiStyle === 'stage' ? 'stage' : 'comic'), () => undefined)
  }, [])
  const sel = systems[index]
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) firstRender.current = false
    else sfx.move()
  }, [index])

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, systems.length - 1)))
  }, [systems.length])

  const gridRef = useRef<HTMLElement>(null)
  // il sistema scelto resta sempre visibile quando la griglia scorre
  useEffect(() => {
    gridRef.current?.children[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [index])

  useInput({
    onMove: (dir) =>
      setIndex((i) => {
        const n = systems.length
        if (dir === 'left') return Math.max(0, i - 1)
        if (dir === 'right') return Math.min(n - 1, i + 1)
        if (dir === 'up') return i - COLS >= 0 ? i - COLS : i
        return i + COLS < n ? i + COLS : i
      }),
    onConfirm: () => sel && sel.phase === 1 && onOpen(sel),
    onMenu: onSettings
  })

  if (!sel) {
    // lista vuota: o si sta ancora caricando, o l'utente ha nascosto tutti i sistemi
    return (
      <div className="loading" style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', justifyContent: 'center' }}>
        <div>{lib?.scanning ? t('Caricamento…') : t('Nessun sistema da mostrare.')}</div>
        {!lib?.scanning && (
          <>
            <div className="hint">{t('Puoi sceglierli in Impostazioni → Sistemi in home.')}</div>
            <button className="chip" onClick={onSettings}>{t('⚙ IMPOSTAZIONI')}</button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="screen select" style={{ ['--accent' as string]: sel.color }}>
      <Orbs />
      {sel.phase === 1 && <ArtShowcase systemId={sel.id} />}
      {/* stile fumetto: retino e fasce diagonali nel colore del sistema, sopra le dissolvenze delle copertine */}
      {style === 'comic' && <div className="comic-bg" key={sel.id} aria-hidden="true" />}
      <header className="topbar">
        <div className="brand">
          <h1 className="logo">
            {t('MR.')} <span>{t('EMULATOR')}</span>
          </h1>
          <small className="by">by Assistente Malpagato software</small>
        </div>
        <div className="top-actions">
          {lib?.offline && (
            <span className="scan warn" title={`Non trovo: ${lib.offline}`}>
              {t('💾 CARTELLA NON RAGGIUNGIBILE')}
            </span>
          )}
          {lib?.scanning && (
            <span className="scan" title={t('La libreria si aggiorna in background')}>
              {t('⟳ SCANSIONE')}{lib.found > 0 ? ` · ${lib.found.toLocaleString('it')}` : ''}
            </span>
          )}
          {update && (
            <button className="chip update" onClick={onUpdate} title={t('Apre la pagina di download su GitHub')}>
              {t('⬆ NUOVA VERSIONE {v}', { v: update.version })}
            </button>
          )}
          <button className="chip" onClick={onInput}>
            {t('🎮 COMANDI')}
          </button>
          <button className="chip" onClick={onPc}>
            {t('⚡ IL TUO PC')}
          </button>
          <button className="chip" onClick={onSettings}>
            {t('⚙ IMPOSTAZIONI')}
          </button>
        </div>
      </header>

      <div className="select-body">
        <section className={`hero hero-${style}`} key={sel.id}>
          {style === 'comic' ? (
            <div className="poster">
              <div className="poster-bg" />
              <svg className="burst" viewBox="-100 -100 200 200" aria-hidden="true">
                <polygon points={BURST} />
              </svg>
              <span className="poster-tag">{t('1P START!')}</span>
              <ConsoleImage id={sel.id} color={sel.color} className="poster-con" />
              <div className="poster-ribbon">
                <span style={{ fontSize: sel.name.length > 20 ? '1.35em' : sel.name.length > 14 ? '1.75em' : '2.2em' }}>{sel.name}</span>
              </div>
              <div className="poster-count">
                {sel.phase !== 1 ? t('IN ARRIVO') : `${sel.gameCount.toLocaleString(getLang() === 'it' ? 'it' : 'en')} ${sel.gameCount === 1 ? t('GIOCO') : t('GIOCHI')}`}
              </div>
            </div>
          ) : (
            <div className="stage">
              <div className="stage-beam" />
              <div className="stage-short">{sel.short}</div>
              <div className="stage-floor" />
              <div className="stage-ring" />
              <div className="stage-ring r2" />
              <ConsoleImage id={sel.id} color={sel.color} className="stage-con" />
              <div className="stage-name">{sel.name}</div>
              <div className="stage-count">
                {sel.phase !== 1 ? t('IN ARRIVO') : `${sel.gameCount.toLocaleString(getLang() === 'it' ? 'it' : 'en')} ${sel.gameCount === 1 ? t('GIOCO') : t('GIOCHI')}`}
              </div>
            </div>
          )}
        </section>

        <section className="grid" ref={gridRef} style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
          {systems.map((s, i) => (
            <button
              key={s.id}
              className={`tile ${i === index ? 'active' : ''} ${s.phase !== 1 ? 'locked' : ''}`}
              style={{ ['--tile' as string]: s.color }}
              onMouseEnter={() => setIndex(i)}
              onClick={() => s.phase === 1 && onOpen(s)}
            >
              <span className="tile-bg" />
              <span className="tile-halo" />
              <ConsoleImage id={s.id} color={s.color} className="tile-con" />
              <span className="tile-short">{s.short}</span>
              <span className="tile-name">{s.name}</span>
              {s.phase !== 1 && <span className="tile-lock">{t('SOON')}</span>}
            </button>
          ))}
        </section>
      </div>

      <footer className="hints">
        <span>{t('◀▲▼▶ MUOVI')}</span>
        <span>{t('INVIO / A CONFERMA')}</span>
        <span>{t('TAB / START IMPOSTAZIONI')}</span>
      </footer>
    </div>
  )
}
