import { useEffect, useRef, useState } from 'react'
import { IMAGE_MODES } from './ScreenPreview'
import type { DiagnosticReport, ImageStyle, PickKind, Settings, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import { configureSound, sfx } from '../sound'
import { setLang, t } from '../i18n'

type PathKey = 'romsDir' | 'biosDir' | 'retroarchPath' | 'coresDir' | 'mamePath' | 'mameChdDir' | 'mameRomDir' | 'mediaDir' | 'datDir' | 'overlayPath' | 'overlayDir'

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
  const [tab, setTab] = useState<'general' | 'systems' | 'look' | 'cabinet' | 'diag'>('general')
  const [diag, setDiag] = useState<DiagnosticReport | null>(null)
  const [copied, setCopied] = useState(false)
  const [all, setAll] = useState<SystemInfo[]>([])
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
          {onGuide && <button className="tab" onClick={onGuide}>{t('▶ RIFAI LA GUIDA')}</button>}
          <button className={`tab ${tab === 'systems' ? 'on' : ''}`} onClick={() => setTab('systems')}>{t('SISTEMI IN HOME')}</button>
          <button className={`tab ${tab === 'look' ? 'on' : ''}`} onClick={() => setTab('look')}>{t('ASPETTO')}</button>
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
        </div>
        {tab === 'look' ? (
          <div className="sysopts">
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
          <input type="checkbox" checked={s.downloadArt} onChange={(e) => setS({ ...s, downloadArt: e.target.checked })} />
          {t('Scarica automaticamente copertine e immagini (gratuito, senza account)')}
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
