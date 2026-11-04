import { useEffect, useRef, useState } from 'react'
import { IMAGE_MODES } from './ScreenPreview'
import { markConsoleImagesDirty, refreshConsoleArt } from '../consoleArt'
import { SVG_FOR } from './consoleSvgs'
import type { ArtBulkState, DiagnosticReport, ImageStyle, PickKind, Settings, SharpnessInfo, SystemInfo } from '@shared/types'
import { ToolFinder } from './ToolFinder'
import { useInput } from '../hooks/useInput'
import { configureSound, sfx } from '../sound'
import { getLang, setLang, t } from '../i18n'

type PathKey = 'romsDir' | 'biosDir' | 'retroarchPath' | 'coresDir' | 'mamePath' | 'mameChdDir' | 'mameRomDir' | 'mediaDir' | 'datDir' | 'overlayPath' | 'overlayDir' | 'savesDir'

interface Props {
  onClose: () => void
  onSaved: () => void
  onPc: () => void
  onRomCheck: () => void
  onGuide?: () => void
}

export default function SettingsScreen({ onClose, onSaved, onPc, onRomCheck, onGuide }: Props): React.JSX.Element {
  const [s, setS] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [mameInfo, setMameInfo] = useState<string>('')
  const [mediaInfo, setMediaInfo] = useState<string[]>([])
  const bodyRef = useRef<HTMLDivElement>(null)
  const [tab, setTab] = useState<'general' | 'systems' | 'look' | 'screen' | 'covers' | 'extras' | 'saves' | 'cabinet' | 'diag'>('general')
  const [diag, setDiag] = useState<DiagnosticReport | null>(null)
  const [copied, setCopied] = useState(false)
  const [all, setAll] = useState<SystemInfo[]>([])
  const [sharp, setSharp] = useState<SharpnessInfo | null>(null)
  const [cheatMsg, setCheatMsg] = useState('')
  const [cheatPct, setCheatPct] = useState<number | null>(null)
  useEffect(() => window.mr.onCheatsProgress(setCheatPct), [])
  const [covers, setCovers] = useState<Record<string, { have: number; total: number }>>({})
  const loadCovers = (): void => {
    window.mr.getCoverCounts().then((c) => setCovers(c ?? {}), () => undefined)
  }
  const [bulk, setBulk] = useState<Record<string, ArtBulkState>>({})
  useEffect(
    () =>
      window.mr.onArtBulk((b) => {
        setBulk((o) => ({ ...o, [b.systemId]: b }))
        if (!b.running) loadCovers()
      }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  )
  const [saveStats, setSaveStats] = useState<{ dir: string; files: number; bytes: number } | null>(null)
  const [saveMsg, setSaveMsg] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(false)
  const [conImgs, setConImgs] = useState<Record<string, string | null>>({})
  const [ovFound, setOvFound] = useState<Record<string, string | null>>({})

  useEffect(() => {
    window.mr.getSettings().then(setS)
    window.mr.getSystems().then(setAll)
  }, [])

  useInput({
    onBack: onClose,
    // con tastiera e pad la pagina scorre con su/giù
    onMove: (d) => {
      if (d === 'up' || d === 'down') bodyRef.current?.scrollBy({ top: d === 'up' ? -160 : 160, behavior: 'smooth' })
    }
  })

  // bordi trovati da soli nella cartella indicata (si aggiornano quando cambia la cartella)
  const ovDir = s?.overlayDir ?? ''
  useEffect(() => {
    if (tab !== 'look' || !ovDir) {
      setOvFound({})
      return
    }
    const h = window.setTimeout(() => window.mr.findOverlays(ovDir).then(setOvFound), 300)
    return () => window.clearTimeout(h)
  }, [tab, ovDir])

  // scheda Aspetto: quali console hanno già una foto nella cartella delle immagini
  useEffect(() => {
    if (tab === 'covers') loadCovers()
    if (tab === 'screen') window.mr.getSharpnessInfo().then((i) => setSharp(i ?? null), () => undefined)
    if (tab === 'look') window.mr.listConsoleImages().then(setConImgs, () => undefined)
  }, [tab])

  // scheda Salvataggi: cartella, numero di file e spazio
  useEffect(() => {
    if (tab === 'saves') window.mr.getSaveStats().then(setSaveStats, () => undefined)
  }, [tab])

  if (!s) return <div className="loading">{t('Caricamento…')}</div>

  const pick = async (key: PathKey, kind: PickKind): Promise<void> => {
    const p = await window.mr.pickPath(kind)
    if (p) setS({ ...s, [key]: p })
  }

  const save = async (): Promise<void> => {
    await window.mr.saveSettings(s)
    setSaved(true)
    onSaved()
    setTimeout(() => setSaved(false), 1800)
  }

  const field = (label: string, hint: string, key: PathKey, kind: PickKind): React.JSX.Element => (
    <div className="field">
      <label>{t(label)}</label>
      <div className="field-row">
        <input value={s[key]} placeholder={t(hint)} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
        <button className="chip" onClick={() => pick(key, kind)}>
          {t('SFOGLIA')}
        </button>
      </div>
    </div>
  )

  return (
    <div className="screen settings" style={{ ['--accent' as string]: '#ffd400' }}>
      <header className="topbar">
        <button className="chip" onClick={onClose}>
          {t('◀ INDIETRO')}
        </button>
        <h2 className="sys-title">{t('Impostazioni')}</h2>
        <button className="chip save" onClick={save}>
          {saved ? t('✔ SALVATO') : t('💾 SALVA')}
        </button>
      </header>
      <div className="settings-body" ref={bodyRef}>
        <div className="tabs">
          <button className={`tab ${tab === 'general' ? 'on' : ''}`} onClick={() => setTab('general')}>{t('GENERALE')}</button>
          <button className={`tab ${tab === 'systems' ? 'on' : ''}`} onClick={() => setTab('systems')}>{t('SISTEMI IN HOME')}</button>
          <button className={`tab ${tab === 'look' ? 'on' : ''}`} onClick={() => setTab('look')}>{t('ASPETTO')}</button>
          <button className={`tab ${tab === 'screen' ? 'on' : ''}`} onClick={() => setTab('screen')}>{t('SCHERMO')}</button>
          <button className={`tab ${tab === 'covers' ? 'on' : ''}`} onClick={() => setTab('covers')}>{t('COPERTINE')}</button>
          <button className={`tab ${tab === 'extras' ? 'on' : ''}`} onClick={() => setTab('extras')}>{t('TROFEI E TRUCCHI')}</button>
          <button className={`tab ${tab === 'saves' ? 'on' : ''}`} onClick={() => setTab('saves')}>{t('SALVATAGGI')}</button>
          <button className={`tab ${tab === 'cabinet' ? 'on' : ''}`} onClick={() => setTab('cabinet')}>{t('MODALITÀ CABINATO')}</button>
          <button
            className={`tab ${tab === 'diag' ? 'on' : ''}`}
            onClick={async () => {
              setTab('diag')
              await window.mr.saveSettings(s)
              setDiag(await window.mr.getDiagnostics())
            }}
          >
            {t('DIAGNOSTICA')}
          </button>
          {onGuide && <button className="tab" onClick={onGuide}>{t('▶ RIFAI LA GUIDA')}</button>}
        </div>
        {tab === 'saves' ? (
          <div className="sysopts saves">
            <p className="hint">{t('Qui sta tutto ciò che si salva giocando: partite delle console, memory card, stati e punteggi record. Una cartella sola, facile da copiare o da salvare altrove.')}</p>
            <div className="savedir">
              <span className="savedir-p">{saveStats?.dir ?? '…'}</span>
              <span className="savedir-n">
                {saveStats ? t('{n} file · {m} MB', { n: saveStats.files.toLocaleString(getLang() === 'it' ? 'it' : 'en'), m: (saveStats.bytes / 1048576).toFixed(1) }) : ''}
              </span>
            </div>
            {field('Cartella dei salvataggi', 'Vuota = la cartella «saves» accanto alle ROM (sullo stesso disco)', 'savesDir', 'dir')}
            <label className="check">
              <input type="checkbox" checked={s.resumeConsoles} onChange={(e) => setS({ ...s, resumeConsoles: e.target.checked })} />
              {t('Console: continua da dove eri (sostituisce la Memory Card). Salva da solo quando esci e, se trova un salvataggio, ti chiede se continuare o iniziare una nuova partita')}
            </label>
            <h3 className="sub-h">{t('Ripresa per singola console')}</h3>
            <div className="persys">
              {all.filter((x) => x.phase === 1 && x.core && x.engine !== 'mame' && x.id !== 'arcade' && x.id !== 'neogeo').map((x) => (
                <label key={x.id} className="persys-row" style={{ ['--tile' as string]: x.color }}>
                  <span className="persys-n">{x.name}</span>
                  <select
                    value={s.resumeBySystem?.[x.id] === undefined ? '' : s.resumeBySystem[x.id] ? 'on' : 'off'}
                    onChange={(e) => {
                      const next = { ...(s.resumeBySystem ?? {}) }
                      if (e.target.value) next[x.id] = e.target.value === 'on'
                      else delete next[x.id]
                      setS({ ...s, resumeBySystem: next })
                    }}
                  >
                    <option value="">{t('Come l\'interruttore generale')}</option>
                    <option value="on">{t('Sì, continua da dove eri')}</option>
                    <option value="off">{t('No, parti sempre da capo')}</option>
                  </select>
                </label>
              ))}
            </div>
            <label className="check">
              <input type="checkbox" checked={s.hiscore} onChange={(e) => setS({ ...s, hiscore: e.target.checked })} />
              {t('Arcade (MAME): salva i punteggi record dei giochi che lo permettono')}
            </label>
            <p className="hint">{t('Per i giochi arcade la scelta "nuova partita / riprendi" si fa nell\'anteprima del gioco (frecce sinistra e destra). Il salvataggio delle console si scrive su disco ogni 10 secondi: se il cabinato si spegne di colpo, si perde pochissimo. Ricorda di premere SALVA.')}</p>
            <div className="field-row">
              <button className="chip" onClick={() => window.mr.openSaves()}>{t('📂 APRI LA CARTELLA')}</button>
              <button
                className="chip"
                onClick={async () => {
                  setSaveMsg(t('Backup in corso…'))
                  await window.mr.saveSettings(s)
                  const r = await window.mr.backupSaves()
                  setSaveMsg(r.ok ? t('✔ Backup creato: {n} file in {p}', { n: r.files ?? 0, p: r.path ?? '' }) : r.error ? `⚠ ${r.error}` : '')
                }}
              >
                {t('📦 BACKUP IN UNO ZIP…')}
              </button>
              <button className="chip" onClick={() => setConfirmRestore(true)}>{t('♻ RIPRISTINA DA UNO ZIP…')}</button>
              <button
                className="chip"
                onClick={async () => {
                  setSaveMsg(t('Importazione in corso…'))
                  await window.mr.saveSettings(s)
                  const r = await window.mr.importSaves()
                  setSaveMsg(t('✔ Importati {n} file (quelli già presenti non sono stati toccati)', { n: r.copied }))
                  window.mr.getSaveStats().then(setSaveStats, () => undefined)
                }}
              >
                {t('⬇ IMPORTA I SALVATAGGI ESISTENTI')}
              </button>
            </div>
            {confirmRestore && (
              <div className="warnbox">
                <b>{t('Ripristinare un backup?')}</b> {t('I file con lo stesso nome nella cartella dei salvataggi saranno sostituiti da quelli del backup.')}
                <div className="field-row">
                  <button
                    className="chip save"
                    onClick={async () => {
                      setConfirmRestore(false)
                      await window.mr.saveSettings(s)
                      const r = await window.mr.restoreSaves()
                      setSaveMsg(r.ok ? t('✔ Ripristinati {n} file', { n: r.files ?? 0 }) : r.error ? `⚠ ${r.error}` : '')
                      window.mr.getSaveStats().then(setSaveStats, () => undefined)
                    }}
                  >
                    {t('SÌ, RIPRISTINA')}
                  </button>
                  <button className="chip" onClick={() => setConfirmRestore(false)}>{t('ANNULLA')}</button>
                </div>
              </div>
            )}
            {saveMsg && <p className="hint">{saveMsg}</p>}
            <p className="hint">{t('"Importa" porta qui i salvataggi di RetroArch (dalla sua cartella saves e states) e quelli di MAME usati finora, senza sovrascrivere nulla. Quelli che RetroArch teneva accanto alle ROM vanno copiati a mano.')}</p>
          </div>
        ) : tab === 'look' ? (
          <div className="sysopts">
            <h3 className="sub-h">{t('Stile della schermata dei sistemi')}</h3>
            <div className="uistyles">
              {([['comic', 'FUMETTO', 'Poster con esplosione gialla, fascia nera e retino: lo stile a fumetto.'], ['stage', 'PALCOSCENICO', 'Riflettore, anello luminoso e nome gigante dietro la console.']] as const).map(([id, name, desc]) => (
                <button key={id} className={`uistyle ${s.uiStyle === id ? 'on' : ''}`} onClick={() => {
                  setS({ ...s, uiStyle: id })
                  document.documentElement.dataset.ui = id
                }}>
                  <b>{t(name)}</b>
                  <small>{t(desc)}</small>
                </button>
              ))}
            </div>
            <h3 className="sub-h">{t('Immagini delle console')}</h3>
            <p className="hint">{t('Ogni sistema mostra la sua console. Se metti nella cartella una foto (PNG, JPG o WEBP) con il nome del sistema, per esempio snes.png, il programma la usa e la trasforma in stile fumetto. Dove non c\'è una foto usa un\'illustrazione, o un simbolo.')}</p>
            <label className="check">
              <input type="checkbox" checked={s.stylizePhotos} onChange={(e) => setS({ ...s, stylizePhotos: e.target.checked })} />
              {t('Trasforma le foto in stile fumetto (sfondo tolto, colori vivi, contorno nero)')}
            </label>
            <div className="field-row">
              <button
                className="chip"
                onClick={() => {
                  markConsoleImagesDirty()
                  window.mr.openConsoleImages()
                }}
              >
                {t('📂 APRI LA CARTELLA DELLE IMMAGINI')}
              </button>
              <button
                className="chip"
                onClick={async () => {
                  refreshConsoleArt()
                  setConImgs(await window.mr.listConsoleImages())
                }}
              >
                {t('⟳ RILEGGI LE IMMAGINI')}
              </button>
            </div>
            <div className="conlist">
              {all.filter((x) => x.phase === 1).map((x) => {
                const has = !!conImgs[x.id]
                const art = has ? t('foto') : SVG_FOR[x.id] ? t('illustrazione') : t('simbolo')
                return (
                  <div key={x.id} className={`conrow ${has ? 'ok' : ''}`} style={{ ['--tile' as string]: x.color }}>
                    <span className="conrow-n">{x.name}</span>
                    <span className="conrow-s">{has ? '✔' : '·'} {art}</span>
                    <code>{x.id}.png</code>
                  </div>
                )
              })}
            </div>
            <h3 className="sub-h">{t('Tema del launcher')}</h3>
            <div className="themes">
              {([['fighter', 'Picchiaduro', '#12121c', '#ff2d55'], ['neon', 'Neon', '#1c0b52', '#00e5ff'], ['retro', 'Fosforo verde', '#0a2812', '#5dff8f'], ['mono', 'Notte', '#181818', '#ffffff']] as const).map(([id, name, bg, fg]) => (
                <button
                  key={id}
                  className={`theme ${s.theme === id ? 'on' : ''}`}
                  style={{ ['--tbg' as string]: bg, ['--tfg' as string]: fg }}
                  onClick={() => {
                    setS({ ...s, theme: id })
                    document.documentElement.dataset.theme = id
                  }}
                >
                  <i /> {name}
                </button>
              ))}
            </div>
          </div>
        ) : tab === 'covers' ? (
          <div className="sysopts">
            <p className="hint">{t('Le copertine si scaricano da una fonte gratuita, senza account. Qui scegli come e per quali sistemi.')}</p>
            <label className="check">
          <input type="checkbox" checked={s.downloadArt} onChange={(e) => setS({ ...s, downloadArt: e.target.checked })} />
          {t('Scarica automaticamente copertine e immagini (gratuito, senza account)')}
        </label>
            <label className="check">
          <input type="checkbox" checked={s.autoCovers} onChange={(e) => setS({ ...s, autoCovers: e.target.checked })} />
          {t('Quando apro un sistema, scarica da sola le copertine di tutti i suoi giochi (usa più dati)')}
        </label>
            <h3 className="sub-h">{t('Cerca le copertine di un sistema')}</h3>
            <div className="persys">
              {all.filter((x) => x.phase === 1 && x.thumbs).map((x) => {
                const b = bulk[x.id]
                const c = covers[x.id]
                const n = (v: number): string => v.toLocaleString(getLang() === 'it' ? 'it' : 'en')
                const status = b?.running
                  ? `${n(b.done)}/${n(b.total)}`
                  : c && c.total > 0
                    ? c.have >= c.total * 0.95
                      ? t('✔ completa: {h}/{n}', { h: n(c.have), n: n(c.total) })
                      : c.have > 0
                        ? t('{h} di {n} presenti', { h: n(c.have), n: n(c.total) })
                        : t('nessuna ancora ({n} giochi)', { n: n(c.total) })
                    : ''
                return (
                  <div key={x.id} className="persys-row" style={{ ['--tile' as string]: x.color }}>
                    <span className="persys-n">{x.name}</span>
                    <span className="persys-st">
                      {status}
                    </span>
                    <button className={`chip ${b?.running ? 'on' : ''}`} onClick={() => (b?.running ? window.mr.cancelArtBulk() : window.mr.startArtBulk(x.id))}>
                      {b?.running ? t('FERMA') : t('🖼 CERCA COPERTINE')}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ) : tab === 'extras' ? (
          <div className="sysopts">
            <h3 className="sub-h">{t('Trofei (RetroAchievements)')}</h3>
            <p className="hint">{t('RetroAchievements dà trofei nei giochi delle console (RetroArch). Serve un account gratuito su retroachievements.org: qui inserisci il nome utente e la password. La password resta solo su questo PC. I giochi devono essere le versioni riconosciute dal sito.')}</p>
            <label className="check">
              <input type="checkbox" checked={s.raEnabled} onChange={(e) => setS({ ...s, raEnabled: e.target.checked })} />
              {t('Attiva i trofei nei giochi')}
            </label>
            <div className="field">
              <label>{t('Nome utente')}</label>
              <input value={s.raUser} onChange={(e) => setS({ ...s, raUser: e.target.value })} />
            </div>
            <div className="field">
              <label>{t('Password')}</label>
              <input type="password" value={s.raPassword} onChange={(e) => setS({ ...s, raPassword: e.target.value })} />
            </div>
            <label className="check">
              <input type="checkbox" checked={s.raHardcore} onChange={(e) => setS({ ...s, raHardcore: e.target.checked })} />
              {t('Modalità hardcore (trofei con più valore, ma niente salvataggi di stato né trucchi: il "continua da dove eri" non funziona)')}
            </label>
            <h3 className="sub-h">{t('Trucchi (cheat)')}</h3>
            <p className="hint">{t('Scarica il database dei trucchi di RetroArch (gratuito). Se c\'è un file per il gioco che avvii, i trucchi vengono caricati da soli e li attivi o disattivi dal menu di RetroArch (Menu rapido → Trucchi). Non funziona con la modalità hardcore.')}</p>
            <label className="check">
              <input type="checkbox" checked={s.cheatsAuto} onChange={(e) => setS({ ...s, cheatsAuto: e.target.checked })} />
              {t('Carica da soli i trucchi del gioco, se ci sono')}
            </label>
            <div className="field-row">
              <button
                className="chip"
                onClick={async () => {
                  setCheatPct(0)
                  setCheatMsg(t('Scarico…'))
                  const r = await window.mr.installCheats()
                  setCheatMsg(r.ok ? t('✔ {n} file di trucchi installati', { n: r.files.toLocaleString(getLang() === 'it' ? 'it' : 'en') }) : t('✘ {e}', { e: r.error ?? '' }))
                }}
              >
                {t('⬇ SCARICA I TRUCCHI')}
              </button>
              <span className="persys-st">{cheatMsg}</span>
            </div>
            {cheatPct !== null && cheatPct < 100 && cheatMsg === t('Scarico…') && (
              <div className="pbar" role="progressbar" aria-valuenow={cheatPct}>
                <i style={{ width: `${cheatPct}%` }} />
                <b>{cheatPct}%</b>
              </div>
            )}
            <div className="field-row">
            </div>
            <p className="hint">{t('Ricorda di premere SALVA. I trucchi e i trofei valgono per i giochi lanciati con RetroArch; MAME ha i suoi trucchi nel menu interno.')}</p>
          </div>
        ) : tab === 'screen' ? (
          <div className="sysopts">
            <h3 className="sub-h">{t('Immagine dei giochi')}</h3>
            <p className="hint">{t('La modalità generale si sceglie in')} <b>{t('IL TUO PC')}</b> {t('(con l\'anteprima delle misure sul tuo schermo). Qui puoi dare a un sistema una modalità diversa: per esempio pixel perfetti per le console e altezza piena per l\'arcade.')}</p>
            <div className="persys">
              {all.filter((x) => x.phase === 1).map((x) => (
                <label key={x.id} className="persys-row" style={{ ['--tile' as string]: x.color }}>
                  <span className="persys-n">{x.name}</span>
                  <select
                    value={s.imageBySystem?.[x.id] ?? ''}
                    onChange={(e) => {
                      const next = { ...(s.imageBySystem ?? {}) }
                      if (e.target.value) next[x.id] = e.target.value as ImageStyle
                      else delete next[x.id]
                      setS({ ...s, imageBySystem: next })
                    }}
                  >
                    <option value="">{t('Come la modalità generale')}</option>
                    {IMAGE_MODES.map(([id, name]) => (
                      <option key={id} value={id}>{t(name)}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <h3 className="sub-h">{t('Monitor montato in verticale (solo MAME)')}</h3>
            <div className="field">
              <select value={s.tate} onChange={(e) => setS({ ...s, tate: e.target.value as Settings['tate'] })}>
                <option value="off">{t('No: monitor orizzontale (i giochi verticali restano al centro)')}</option>
                <option value="cw">{t('Sì, ruotato in senso orario')}</option>
                <option value="ccw">{t('Sì, ruotato in senso antiorario')}</option>
              </select>
            </div>
            <p className="hint">{t('Per sfruttare tutto lo schermo nei giochi verticali (shoot\'em up) il monitor va montato ruotato; ruota anche lo schermo da Windows, poi scegli qui il senso.')}</p>
            <h3 className="sub-h">{t('Bordo grafico ai lati (overlay di RetroArch)')}</h3>
            <label className="check">
              <input type="checkbox" checked={s.overlayEnabled} onChange={(e) => setS({ ...s, overlayEnabled: e.target.checked })} />
              {t('Riempi le strisce laterali con un bordo grafico')}
            </label>
            {field('Cartella dei bordi (.cfg)', 'Cartella con i bordi scaricati (si cerca anche nelle sottocartelle): per ogni sistema il programma sceglie da solo il file giusto', 'overlayDir', 'dir')}
            {field('Bordo comune a tutti gli altri sistemi (facoltativo)', 'Usato dai sistemi per cui non si trova un bordo', 'overlayPath', 'cfg')}
            <h3 className="sub-h">{t('Bordo per ogni sistema')}</h3>
            <div className="persys">
              {all.filter((x) => x.phase === 1 && x.core).map((x) => {
                const manual = s.overlayBySystem?.[x.id] ?? ''
                const found = ovFound[x.id]
                const file = (p: string): string => p.replace(/^.*[\\/]/, '')
                return (
                  <label key={x.id} className="persys-row" style={{ ['--tile' as string]: x.color }}>
                    <span className="persys-n">{x.name}</span>
                    <select
                      value={manual}
                      onChange={async (e) => {
                        const next = { ...(s.overlayBySystem ?? {}) }
                        let v = e.target.value
                        if (v === '__pick__') {
                          const p = await window.mr.pickPath('cfg')
                          if (!p) return
                          v = p
                        }
                        if (v) next[x.id] = v
                        else delete next[x.id]
                        setS({ ...s, overlayBySystem: next })
                      }}
                    >
                      <option value="">{found ? t('Automatico: {f}', { f: file(found) }) : t('Automatico (nessun bordo trovato)')}</option>
                      <option value="-">{t('Nessun bordo')}</option>
                      {manual && manual !== '-' && <option value={manual}>{file(manual)}</option>}
                      <option value="__pick__">{t('Scegli un file…')}</option>
                    </select>
                  </label>
                )
              })}
            </div>
            <h3 className="sub-h">{t('Nitidezza dei pixel (RetroArch)')}</h3>
            <div className="field">
              <select value={s.sharpness ?? 'off'} onChange={(e) => setS({ ...s, sharpness: e.target.value as Settings['sharpness'] })}>
                <option value="off">{t('Nessuna (pixel come sono)')}</option>
                <option value="soft" disabled={!!sharp && (!sharp.soft.ok || !sharp.installed.soft)}>
                  {t('Morbida (bordi dei pixel più dolci, leggerissima)')}
                  {sharp && !sharp.soft.ok ? ` — ${t(sharp.soft.reason)}` : sharp && !sharp.installed.soft ? ` — ${t('shader non installato')}` : ''}
                </option>
                <option value="high" disabled={!!sharp && (!sharp.high.ok || !sharp.installed.high)}>
                  {t('Alta qualità (xBRZ: linee pulite, richiede una buona scheda video)')}
                  {sharp && !sharp.high.ok ? ` — ${t(sharp.high.reason)}` : sharp && !sharp.installed.high ? ` — ${t('shader non installato')}` : ''}
                </option>
              </select>
            </div>
            <p className="hint">
              {t('Migliora l\'aspetto dei pixel ingranditi. Le opzioni compaiono solo se questo PC le regge e se gli shader sono installati (RetroArch → Aggiornamenti online → Aggiorna shader Slang). Con l\'effetto CRT su Automatico la nitidezza ha la precedenza; scegli un CRT a mano per averli insieme. Se un sistema è troppo pesante, il programma sceglie da solo un gradino più leggero. Vale per i giochi lanciati con RetroArch, non per MAME.')}
              {sharp && !sharp.retroarch ? ` ${t('Indica prima retroarch.exe nelle Impostazioni')}.` : ''}
            </p>
            <h3 className="sub-h">{t('Effetto schermo a tubo (CRT) nei giochi')}</h3>
            <div className="field">
              <select value={s.crtShader} onChange={(e) => setS({ ...s, crtShader: e.target.value as Settings['crtShader'] })}>
                <option value="auto">{t('Automatico (lo sceglie il programma in base al tuo PC)')}</option>
                <option value="off">{t('Nessuno (immagine pulita)')}</option>
                <option value="crt-easymode">{t('CRT leggero (Easymode)')}</option>
                <option value="crt-geom">{t('CRT classico con curvatura (Geom)')}</option>
                <option value="crt-lottes">{t('CRT morbido (Lottes)')}</option>
                <option value="crt-royale">{t('CRT realistico (Royale, richiede una scheda video potente)')}</option>
              </select>
            </div>
            <p className="hint">
              {t('Vale per i giochi lanciati con RetroArch. Se lo shader scelto non è installato, il programma torna al modo automatico. Per installarli: in RetroArch, Aggiornamenti online → Aggiorna shader Slang. Ricorda di premere SALVA.')}
            </p>
          </div>
        ) : tab === 'cabinet' ? (
          <div className="sysopts">
            <p className="hint">{t('Per usare il computer come un vero cabinato: il programma parte da solo, a tutto schermo, senza bordi né cursore. Ricorda di premere SALVA.')}</p>
            <label className="check">
              <input type="checkbox" checked={s.cabinetFullscreen} onChange={(e) => setS({ ...s, cabinetFullscreen: e.target.checked })} />
              {t('Schermo intero senza bordi')}
            </label>
            <label className="check">
              <input type="checkbox" checked={s.cabinetAutostart} onChange={(e) => setS({ ...s, cabinetAutostart: e.target.checked })} />
              {t('Avvia Mr. Emulator quando si accende Windows (funziona nella versione installata)')}
            </label>
            <label className="check">
              <input type="checkbox" checked={s.cabinetHideCursor} onChange={(e) => setS({ ...s, cabinetHideCursor: e.target.checked })} />
              {t('Nascondi il cursore del mouse dopo qualche secondo')}
            </label>
            <label className="check">
              <input type="checkbox" checked={s.cabinetLockClose} onChange={(e) => setS({ ...s, cabinetLockClose: e.target.checked })} />
              {t('Blocca la chiusura accidentale (Alt+F4 non spegne il programma)')}
            </label>
            <p className="hint">
              {t('Con la chiusura bloccata si esce con')} <b>{t('Ctrl + Maiusc + Q')}</b> {t('oppure con il pulsante qui sotto. Al prossimo avvio di Windows il programma si apre da solo sulla home.')}
            </p>
            <div className="field-row">
              <button className="chip" onClick={() => window.mr.quitApp()}>{t('⏻ CHIUDI IL PROGRAMMA')}</button>
            </div>
          </div>
        ) : tab === 'diag' ? (
          <div className="diag">
            {!diag ? (
              <p className="hint">{t('Controllo in corso…')}</p>
            ) : (
              <>
                <p className="hint">
                  {diag.problems === 0 && diag.warnings === 0 ? t('✔ Tutto a posto.') : `${diag.problems} problemi · ${diag.warnings} avvisi.`} {t('Se qualcosa non funziona, premi COPIA e incolla il testo nella chat.')}
                </p>
                <div className="field-row">
                  <button
                    className="chip"
                    onClick={() => {
                      navigator.clipboard.writeText(diag.text).then(() => {
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1800)
                      }, () => undefined)
                    }}
                  >
                    {copied ? t('✔ COPIATO') : t('📋 COPIA IL TESTO')}
                  </button>
                  <button className="chip" onClick={() => window.mr.getDiagnostics().then(setDiag)}>{t('⟳ RICONTROLLA')}</button>
                </div>
                <ul className="diag-list">
                  {diag.checks.map((k, i) => (
                    <li key={i} className={`diag-${k.level}`}>
                      <span className="diag-ic">{k.level === 'ok' ? '✔' : k.level === 'warn' ? '⚠' : '✖'}</span>
                      <span className="diag-t">{k.title}</span>
                      {k.detail && <span className="diag-d">{k.detail}</span>}
                      {k.fix && <span className="diag-f">→ {k.fix}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : tab === 'systems' ? (
          <div className="sysopts">
            <p className="hint">{t('Scegli quali sistemi mostrare nella griglia della home. Le ROM restano dove sono: nascondere un sistema non cancella nulla. Ricorda di premere SALVA.')}</p>
            <div className="field-row">
              <button className="chip" onClick={() => setS({ ...s, hiddenSystems: [] })}>{t('MOSTRA TUTTI')}</button>
              <button className="chip" onClick={() => setS({ ...s, hiddenSystems: all.filter((x) => x.gameCount === 0 && x.phase === 1).map((x) => x.id) })}>{t('NASCONDI QUELLI SENZA GIOCHI')}</button>
            </div>
            <div className="sysopt-grid">
              {all.map((x) => {
                const hidden = s.hiddenSystems.includes(x.id)
                return (
                  <label key={x.id} className={`sysopt ${hidden ? 'off' : ''}`} style={{ ['--tile' as string]: x.color }}>
                    <input type="checkbox" checked={!hidden} onChange={() => setS({ ...s, hiddenSystems: hidden ? s.hiddenSystems.filter((i) => i !== x.id) : [...s.hiddenSystems, x.id] })} />
                    <span className="sysopt-short">{x.short}</span>
                    <span className="sysopt-name">{x.name}</span>
                    <span className="sysopt-count">{x.phase !== 1 ? t('in arrivo') : `${x.gameCount.toLocaleString('it')} giochi`}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <>
        <div className="opt-row">
          <span>Language / Lingua</span>
          <select
            value={s.language}
            onChange={(e) => {
              const language = e.target.value as Settings['language']
              setS({ ...s, language })
              setLang(language)
            }}
          >
            <option value="auto">{t('Automatica (come il sistema)')}</option>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </select>
        </div>
        {field('Cartella ROM', 'Es. D:\\Giochi\\roms (con sottocartelle: snes, megadrive, arcade…)', 'romsDir', 'dir')}
        {field('Cartella BIOS', 'I tuoi file BIOS vanno qui (viene passata a RetroArch)', 'biosDir', 'dir')}
        <div className="field-row">
          <button className="chip" onClick={() => window.mr.openFolder('roms')}>{t('APRI CARTELLA ROM')}</button>
          <button className="chip" onClick={() => window.mr.openFolder('bios')}>{t('APRI CARTELLA BIOS')}</button>
          <button className="chip" onClick={() => window.mr.setupFolders().then(setS)}>{t('CREA CARTELLE MANCANTI')}</button>
        </div>
        {field('RetroArch (retroarch.exe)', 'Es. C:\\RetroArch-Win64\\retroarch.exe', 'retroarchPath', 'file')}
        {field('MAME (mame.exe)', 'Es. D:\\MAME\\mame.exe — serve per il sistema Arcade (MAME); usa la stessa versione del tuo set ROM', 'mamePath', 'file')}
        <ToolFinder kind="retroarch" current={s.retroarchPath} onUse={(p) => setS((o) => (o ? { ...o, retroarchPath: p } : o))} />
        <ToolFinder kind="mame" current={s.mamePath} onUse={(p) => setS((o) => (o ? { ...o, mamePath: p } : o))} />
        <div className="field-row">
          <button
            className="chip"
            onClick={async () => {
              setMameInfo(t('Controllo in corso… (la prima volta può richiedere qualche secondo)'))
              await window.mr.saveSettings(s)
              const r = await window.mr.checkMame()
              setMameInfo(r.ok ? `✔ MAME ${r.version} · ${r.machines.toLocaleString('it')} ${t('macchine riconosciute')}${r.warning ? ` — ⚠ ${r.warning}` : ''}` : `⚠ ${r.error ?? t('MAME non risponde')}`)
            }}
          >
            {t('VERIFICA MAME')}
          </button>
          <span className="hint" style={{ margin: 0, alignSelf: 'center' }}>{mameInfo}</span>
        </div>
        {field('Cartella ROM di MAME (facoltativa)', 'Vuota = la sottocartella "mame" della cartella ROM. Consigliato: una cartella per versione, es. mame0229', 'mameRomDir', 'dir')}
        <div className="field-row">
          <button
            className="chip"
            onClick={async () => {
              const r = await window.mr.makeMameFolder()
              setMameInfo(r.ok ? `${t('✔ Creata e impostata:')} ${r.path}` : `⚠ ${r.error ?? t('Non riuscito')}`)
              setS(await window.mr.getSettings())
              onSaved()
            }}
          >
            {t('CREA LA CARTELLA DI QUESTA VERSIONE DI MAME')}
          </button>
          <button
            className="chip"
            onClick={async () => {
              const dir = await window.mr.pickPath('dir')
              if (!dir) return
              try {
                setS(await window.mr.setupRoot(dir))
                setMameInfo(t('✔ Tutto impostato dentro {dir} (roms, bios e la cartella di MAME)', { dir }))
                onSaved()
              } catch {
                setMameInfo(t('⚠ Non riesco a creare le cartelle lì: controlla che il disco sia collegato e scrivibile.'))
              }
            }}
          >
            {t('USA UN ALTRO DISCO PER TUTTO…')}
          </button>
        </div>
        {field('Cartella DAT (FinalBurn Neo, Kawaks, MAME…)', 'File .dat o .xml con nome breve e titolo dei giochi: servono a dare il nome giusto e a trovare le copertine delle console. Hanno la precedenza sulle Software List di MAME', 'datDir', 'dir')}
        {field('Cartella immagini locali (Multimedia / EXTRAs)', 'Cartella con snap, titles, flyers… (file col nome breve del gioco). Ha la precedenza sul download', 'mediaDir', 'dir')}
        <div className="field-row">
          <button
            className="chip"
            onClick={async () => {
              setMediaInfo([t('Analisi in corso…')])
              await window.mr.saveSettings(s)
              const r = await window.mr.analyzeMedia()
              if (r.error) return setMediaInfo([`⚠ ${r.error}`])
              const kindName = { boxart: t('Copertine'), snap: t('Schermate'), title: t('Titoli'), video: t('Video delle partite'), sound: t('Colonna sonora') } as const
              const lines = r.found.map((f) => `✔ ${kindName[f.kind]}: ${f.name}${f.type === 'zip' ? t(' (archivio ZIP)') : ''} · ${f.count.toLocaleString('it')} ${f.kind === 'sound' ? t('cartelle di giochi') : f.kind === 'video' ? t('file') : t('immagini')}`)
              if (!r.found.length) lines.push(t('⚠ Non riconosco nessuna cartella di immagini, video o musica.'))
              if (r.unsupported.length) lines.push(`${t('⚠ Archivi che non so leggere (serve estrarli):')} ${r.unsupported.join(', ')}`)
              if (r.other.length) lines.push(`${t('Altre cartelle trovate (non usate):')} ${r.other.slice(0, 14).join(', ')}${r.other.length > 14 ? '…' : ''}`)
              setMediaInfo(lines)
              onSaved()
            }}
          >
            {t('ANALIZZA LA CARTELLA IMMAGINI')}
          </button>
        </div>
        {mediaInfo.length > 0 && (
          <div className="hint" style={{ margin: 0, lineHeight: 1.7 }}>
            {mediaInfo.map((l) => (
              <div key={l}>{l}</div>
            ))}
          </div>
        )}
        {field('Cartella dei dischi CHD per MAME (facoltativa)', 'Se i dischi non stanno già dentro la cartella ROM di MAME', 'mameChdDir', 'dir')}
        <label className="check">
          <input type="checkbox" checked={s.mameClones} onChange={(e) => setS({ ...s, mameClones: e.target.checked })} />
          {t('Arcade (MAME): mostra anche le varianti dei giochi (nei set "merged" stanno dentro lo ZIP del gioco principale)')}
        </label>
        {field('Cartella dei core (facoltativa)', 'Se vuota si usa la cartella "cores" accanto a RetroArch', 'coresDir', 'dir')}
        <label className="check">
          <input type="checkbox" checked={s.fullscreen} onChange={(e) => setS({ ...s, fullscreen: e.target.checked })} />
          {t('Avvia i giochi a schermo intero')}
        </label>
        <label className="check">
          <input type="checkbox" checked={s.checkUpdates} onChange={(e) => setS({ ...s, checkUpdates: e.target.checked })} />
          {t('Avvisami quando esce una nuova versione (una richiesta a GitHub al giorno, non si invia nulla di tuo)')}
        </label>
        <label className="check">
          <input type="checkbox" checked={s.groupDiscs} onChange={(e) => setS({ ...s, groupDiscs: e.target.checked })} />
          {t('Giochi a più dischi (PlayStation, 3DO, Dreamcast): un solo gioco nella lista; il cambio disco si fa dal menu di RetroArch')}
        </label>
        <label className="check">
          <input type="checkbox" checked={s.showUnsupported} onChange={(e) => setS({ ...s, showUnsupported: e.target.checked })} />
          {t('Arcade e Neo Geo: mostra anche i giochi che il motore (FBNeo) non supporta, come i set MAME completi')}
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={s.soundOn}
            onChange={(e) => {
              setS({ ...s, soundOn: e.target.checked })
              configureSound(e.target.checked, s.soundVolume)
              if (e.target.checked) sfx.confirm()
            }}
          />
          {t('Suoni dell\'interfaccia (bip da sala giochi)')}
        </label>
        {s.soundOn && (
          <div className="field-row" style={{ alignItems: 'center' }}>
            <span className="hint" style={{ margin: 0 }}>{t('Volume')}</span>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={s.soundVolume}
              style={{ flex: 1, maxWidth: 320 }}
              onChange={(e) => {
                const v = Number(e.target.value)
                setS({ ...s, soundVolume: v })
                configureSound(true, v)
                sfx.confirm()
              }}
            />
          </div>
        )}
        <label className="check">
          <input type="checkbox" checked={s.videoPreview} onChange={(e) => setS({ ...s, videoPreview: e.target.checked })} />
          {t('Filmato della partita sul gioco selezionato (serve la cartella videosnaps del pacchetto Multimedia)')}
        </label>
        <div className="field-row" style={{ alignItems: 'center' }}>
          <span className="hint" style={{ margin: 0 }}>{t('Volume della colonna sonora')}</span>
          <input type="range" min={0.05} max={1} step={0.05} value={s.musicVolume} style={{ flex: 1, maxWidth: 320 }} onChange={(e) => setS({ ...s, musicVolume: Number(e.target.value) })} />
        </div>
        <label className="check">
          <input type="checkbox" checked={s.launchAnimation} onChange={(e) => setS({ ...s, launchAnimation: e.target.checked })} />
          {t('Sequenza "INSERT COIN" prima di avviare un gioco (si salta con un pulsante)')}
        </label>
        <div className="field-row" style={{ alignItems: 'center' }}>
          <span className="hint" style={{ margin: 0 }}>{t('Rotazione di copertine a riposo, dopo')}</span>
          <select value={s.attractSeconds} onChange={(e) => setS({ ...s, attractSeconds: Number(e.target.value) })}>
            <option value={0}>{t('mai')}</option>
            <option value={60}>{t('1 minuto')}</option>
            <option value={90}>{t('1 minuto e mezzo')}</option>
            <option value={180}>{t('3 minuti')}</option>
            <option value={300}>{t('5 minuti')}</option>
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.titleScreen} onChange={(e) => setS({ ...s, titleScreen: e.target.checked })} />
          {t('Mostra la schermata iniziale "premi start" all\'avvio')}
        </label>
        <label className="check">
          <input type="checkbox" checked={s.lightEffects} onChange={(e) => setS({ ...s, lightEffects: e.target.checked })} />
          {t('Effetti ridotti (consigliato per PC lenti: meno animazioni e luci)')}
        </label>
        <button className="chip" onClick={onRomCheck}>
          {t('🧪 CONTROLLO ROM DI MAME (trova gli ZIP difettosi)')}
        </button>
        <button className="chip" onClick={onPc}>
          {t('⚡ OTTIMIZZAZIONE AUTOMATICA DEL PC')}
        </button>
        <button className="big" onClick={save}>
          {saved ? t('✔ SALVATO') : t('SALVA')}
        </button>
        <p className="note">
          {t('Mr. Emulator non include né scarica ROM o BIOS. Usa solo i file che indichi tu.')}
        </p>
          </>
        )}
      </div>
    </div>
  )
}
