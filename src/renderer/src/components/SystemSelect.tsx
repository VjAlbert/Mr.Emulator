import { useEffect, useRef, useState } from 'react'
import type { LibraryEvent, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import { sfx } from '../sound'
import ArtShowcase from './ArtShowcase'
import Orbs from './Orbs'
import SystemArt from './SystemArt'
import { getLang, t } from '../i18n'

const COLS = 4

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
      <header className="topbar">
        <h1 className="logo">
          {t('MR.')} <span>{t('EMULATOR')}</span>
        </h1>
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
        <section className="hero" key={sel.id}>
          <SystemArt id={sel.id} className="hero-art" />
          <div className="hero-short">{sel.short}</div>
          <div className="hero-name">{sel.name}</div>
          <div className="hero-count">
            {sel.phase !== 1 ? t('IN ARRIVO') : `${sel.gameCount.toLocaleString(getLang() === 'it' ? 'it' : 'en')} ${sel.gameCount === 1 ? t('GIOCO') : t('GIOCHI')}`}
          </div>
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
              <SystemArt id={s.id} className="tile-art" />
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
