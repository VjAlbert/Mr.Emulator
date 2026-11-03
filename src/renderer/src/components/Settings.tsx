import { useEffect, useRef, useState } from 'react'
import type { DiagnosticReport, PickKind, Settings, SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import { configureSound, sfx } from '../sound'

type PathKey = 'romsDir' | 'biosDir' | 'retroarchPath' | 'coresDir' | 'mamePath' | 'mameChdDir' | 'mameRomDir' | 'mediaDir' | 'datDir'

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

  if (!s) return <div className="loading">Caricamento…</div>

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
      <label>{label}</label>
      <div className="field-row">
        <input value={s[key]} placeholder={hint} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
        <button className="chip" onClick={() => pick(key, kind)}>
          SFOGLIA
        </button>
      </div>
    </div>
  )

  return (
    <div className="screen settings" style={{ ['--accent' as string]: '#ffd400' }}>
      <header className="topbar">
        <button className="chip" onClick={onClose}>
          ◀ INDIETRO
        </button>
        <h2 className="sys-title">Impostazioni</h2>
        <button className="chip save" onClick={save}>
          {saved ? '✔ SALVATO' : '💾 SALVA'}
        </button>
      </header>
      <div className="settings-body" ref={bodyRef}>
        <div className="tabs">
          <button className={`tab ${tab === 'general' ? 'on' : ''}`} onClick={() => setTab('general')}>GENERALE</button>
          {onGuide && <button className="tab" onClick={onGuide}>▶ RIFAI LA GUIDA</button>}
          <button className={`tab ${tab === 'systems' ? 'on' : ''}`} onClick={() => setTab('systems')}>SISTEMI IN HOME</button>
          <button className={`tab ${tab === 'look' ? 'on' : ''}`} onClick={() => setTab('look')}>ASPETTO</button>
          <button className={`tab ${tab === 'cabinet' ? 'on' : ''}`} onClick={() => setTab('cabinet')}>MODALITÀ CABINATO</button>
          <button
            className={`tab ${tab === 'diag' ? 'on' : ''}`}
            onClick={async () => {
              setTab('diag')
              await window.mr.saveSettings(s)
              setDiag(await window.mr.getDiagnostics())
            }}
          >
            DIAGNOSTICA
          </button>
        </div>
        {tab === 'look' ? (
          <div className="sysopts">
            <h3 className="sub-h">Tema del launcher</h3>
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
            <h3 className="sub-h">Effetto schermo a tubo (CRT) nei giochi</h3>
            <div className="field">
              <select value={s.crtShader} onChange={(e) => setS({ ...s, crtShader: e.target.value as Settings['crtShader'] })}>
                <option value="auto">Automatico (lo sceglie il programma in base al tuo PC)</option>
                <option value="off">Nessuno (immagine pulita)</option>
                <option value="crt-easymode">CRT leggero (Easymode)</option>
                <option value="crt-geom">CRT classico con curvatura (Geom)</option>
                <option value="crt-lottes">CRT morbido (Lottes)</option>
                <option value="crt-royale">CRT realistico (Royale, richiede una scheda video potente)</option>
              </select>
            </div>
            <p className="hint">
              Vale per i giochi lanciati con RetroArch. Se lo shader scelto non è installato, il programma torna al modo automatico. Per installarli: in RetroArch, Aggiornamenti online → Aggiorna shader Slang. Ricorda di premere SALVA.
            </p>
          </div>
        ) : tab === 'cabinet' ? (
          <div className="sysopts">
            <p className="hint">Per usare il computer come un vero cabinato: il programma parte da solo, a tutto schermo, senza bordi né cursore. Ricorda di premere SALVA.</p>
            <label className="check">
              <input type="checkbox" checked={s.cabinetFullscreen} onChange={(e) => setS({ ...s, cabinetFullscreen: e.target.checked })} />
              Schermo intero senza bordi
            </label>
            <label className="check">
              <input type="checkbox" checked={s.cabinetAutostart} onChange={(e) => setS({ ...s, cabinetAutostart: e.target.checked })} />
              Avvia Mr. Emulator quando si accende Windows (funziona nella versione installata)
            </label>
            <label className="check">
              <input type="checkbox" checked={s.cabinetHideCursor} onChange={(e) => setS({ ...s, cabinetHideCursor: e.target.checked })} />
              Nascondi il cursore del mouse dopo qualche secondo
            </label>
            <label className="check">
              <input type="checkbox" checked={s.cabinetLockClose} onChange={(e) => setS({ ...s, cabinetLockClose: e.target.checked })} />
              Blocca la chiusura accidentale (Alt+F4 non spegne il programma)
            </label>
            <p className="hint">
              Con la chiusura bloccata si esce con <b>Ctrl + Maiusc + Q</b> oppure con il pulsante qui sotto. Al prossimo avvio di Windows il programma si apre da solo sulla home.
            </p>
            <div className="field-row">
              <button className="chip" onClick={() => window.mr.quitApp()}>⏻ CHIUDI IL PROGRAMMA</button>
            </div>
          </div>
        ) : tab === 'diag' ? (
          <div className="diag">
            {!diag ? (
              <p className="hint">Controllo in corso…</p>
            ) : (
              <>
                <p className="hint">
                  {diag.problems === 0 && diag.warnings === 0 ? '✔ Tutto a posto.' : `${diag.problems} problemi · ${diag.warnings} avvisi.`} Se qualcosa non funziona, premi COPIA e incolla il testo nella chat.
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
                    {copied ? '✔ COPIATO' : '📋 COPIA IL TESTO'}
                  </button>
                  <button className="chip" onClick={() => window.mr.getDiagnostics().then(setDiag)}>⟳ RICONTROLLA</button>
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
            <p className="hint">Scegli quali sistemi mostrare nella griglia della home. Le ROM restano dove sono: nascondere un sistema non cancella nulla. Ricorda di premere SALVA.</p>
            <div className="field-row">
              <button className="chip" onClick={() => setS({ ...s, hiddenSystems: [] })}>MOSTRA TUTTI</button>
              <button className="chip" onClick={() => setS({ ...s, hiddenSystems: all.filter((x) => x.gameCount === 0 && x.phase === 1).map((x) => x.id) })}>NASCONDI QUELLI SENZA GIOCHI</button>
            </div>
            <div className="sysopt-grid">
              {all.map((x) => {
                const hidden = s.hiddenSystems.includes(x.id)
                return (
                  <label key={x.id} className={`sysopt ${hidden ? 'off' : ''}`} style={{ ['--tile' as string]: x.color }}>
                    <input type="checkbox" checked={!hidden} onChange={() => setS({ ...s, hiddenSystems: hidden ? s.hiddenSystems.filter((i) => i !== x.id) : [...s.hiddenSystems, x.id] })} />
                    <span className="sysopt-short">{x.short}</span>
                    <span className="sysopt-name">{x.name}</span>
                    <span className="sysopt-count">{x.phase !== 1 ? 'in arrivo' : `${x.gameCount.toLocaleString('it')} giochi`}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <>
        {field('Cartella ROM', 'Es. D:\\Giochi\\roms (con sottocartelle: snes, megadrive, arcade…)', 'romsDir', 'dir')}
        {field('Cartella BIOS', 'I tuoi file BIOS vanno qui (viene passata a RetroArch)', 'biosDir', 'dir')}
        <div className="field-row">
          <button className="chip" onClick={() => window.mr.openFolder('roms')}>APRI CARTELLA ROM</button>
          <button className="chip" onClick={() => window.mr.openFolder('bios')}>APRI CARTELLA BIOS</button>
          <button className="chip" onClick={() => window.mr.setupFolders().then(setS)}>CREA CARTELLE MANCANTI</button>
        </div>
        {field('RetroArch (retroarch.exe)', 'Es. C:\\RetroArch-Win64\\retroarch.exe', 'retroarchPath', 'file')}
        {field('MAME (mame.exe)', 'Es. D:\\MAME\\mame.exe — serve per il sistema Arcade (MAME); usa la stessa versione del tuo set ROM', 'mamePath', 'file')}
        <div className="field-row">
          <button
            className="chip"
            onClick={async () => {
              setMameInfo('Controllo in corso… (la prima volta può richiedere qualche secondo)')
              await window.mr.saveSettings(s)
              const r = await window.mr.checkMame()
              setMameInfo(r.ok ? `✔ MAME ${r.version} · ${r.machines.toLocaleString('it')} macchine riconosciute${r.warning ? ` — ⚠ ${r.warning}` : ''}` : `⚠ ${r.error ?? 'MAME non risponde'}`)
            }}
          >
            VERIFICA MAME
          </button>
          <span className="hint" style={{ margin: 0, alignSelf: 'center' }}>{mameInfo}</span>
        </div>
        {field('Cartella ROM di MAME (facoltativa)', 'Vuota = la sottocartella "mame" della cartella ROM. Consigliato: una cartella per versione, es. mame0229', 'mameRomDir', 'dir')}
        <div className="field-row">
          <button
            className="chip"
            onClick={async () => {
              const r = await window.mr.makeMameFolder()
              setMameInfo(r.ok ? `✔ Creata e impostata: ${r.path}` : `⚠ ${r.error ?? 'Non riuscito'}`)
              setS(await window.mr.getSettings())
              onSaved()
            }}
          >
            CREA LA CARTELLA DI QUESTA VERSIONE DI MAME
          </button>
          <button
            className="chip"
            onClick={async () => {
              const dir = await window.mr.pickPath('dir')
              if (!dir) return
              try {
                setS(await window.mr.setupRoot(dir))
                setMameInfo(`✔ Tutto impostato dentro ${dir} (roms, bios e la cartella di MAME)`)
                onSaved()
              } catch {
                setMameInfo('⚠ Non riesco a creare le cartelle lì: controlla che il disco sia collegato e scrivibile.')
              }
            }}
          >
            USA UN ALTRO DISCO PER TUTTO…
          </button>
        </div>
        {field('Cartella DAT (FinalBurn Neo, Kawaks, MAME…)', 'File .dat o .xml con nome breve e titolo dei giochi: servono a dare il nome giusto e a trovare le copertine delle console. Hanno la precedenza sulle Software List di MAME', 'datDir', 'dir')}
        {field('Cartella immagini locali (Multimedia / EXTRAs)', 'Cartella con snap, titles, flyers… (file col nome breve del gioco). Ha la precedenza sul download', 'mediaDir', 'dir')}
        <div className="field-row">
          <button
            className="chip"
            onClick={async () => {
              setMediaInfo(['Analisi in corso…'])
              await window.mr.saveSettings(s)
              const r = await window.mr.analyzeMedia()
              if (r.error) return setMediaInfo([`⚠ ${r.error}`])
              const kindName = { boxart: 'Copertine', snap: 'Schermate', title: 'Titoli', video: 'Video delle partite', sound: 'Colonna sonora' } as const
              const lines = r.found.map((f) => `✔ ${kindName[f.kind]}: ${f.name}${f.type === 'zip' ? ' (archivio ZIP)' : ''} · ${f.count.toLocaleString('it')} ${f.kind === 'sound' ? 'cartelle di giochi' : f.kind === 'video' ? 'file' : 'immagini'}`)
              if (!r.found.length) lines.push('⚠ Non riconosco nessuna cartella di immagini, video o musica.')
              if (r.unsupported.length) lines.push(`⚠ Archivi che non so leggere (serve estrarli): ${r.unsupported.join(', ')}`)
              if (r.other.length) lines.push(`Altre cartelle trovate (non usate): ${r.other.slice(0, 14).join(', ')}${r.other.length > 14 ? '…' : ''}`)
              setMediaInfo(lines)
              onSaved()
            }}
          >
            ANALIZZA LA CARTELLA IMMAGINI
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
          Arcade (MAME): mostra anche le varianti dei giochi (nei set "merged" stanno dentro lo ZIP del gioco principale)
        </label>
        {field('Cartella dei core (facoltativa)', 'Se vuota si usa la cartella "cores" accanto a RetroArch', 'coresDir', 'dir')}
        <label className="check">
          <input type="checkbox" checked={s.fullscreen} onChange={(e) => setS({ ...s, fullscreen: e.target.checked })} />
          Avvia i giochi a schermo intero
        </label>
        <label className="check">
          <input type="checkbox" checked={s.downloadArt} onChange={(e) => setS({ ...s, downloadArt: e.target.checked })} />
          Scarica automaticamente copertine e immagini (gratuito, senza account)
        </label>
        <label className="check">
          <input type="checkbox" checked={s.showUnsupported} onChange={(e) => setS({ ...s, showUnsupported: e.target.checked })} />
          Arcade e Neo Geo: mostra anche i giochi che il motore (FBNeo) non supporta, come i set MAME completi
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
          Suoni dell'interfaccia (bip da sala giochi)
        </label>
        {s.soundOn && (
          <div className="field-row" style={{ alignItems: 'center' }}>
            <span className="hint" style={{ margin: 0 }}>Volume</span>
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
          Filmato della partita sul gioco selezionato (serve la cartella videosnaps del pacchetto Multimedia)
        </label>
        <div className="field-row" style={{ alignItems: 'center' }}>
          <span className="hint" style={{ margin: 0 }}>Volume della colonna sonora</span>
          <input type="range" min={0.05} max={1} step={0.05} value={s.musicVolume} style={{ flex: 1, maxWidth: 320 }} onChange={(e) => setS({ ...s, musicVolume: Number(e.target.value) })} />
        </div>
        <label className="check">
          <input type="checkbox" checked={s.launchAnimation} onChange={(e) => setS({ ...s, launchAnimation: e.target.checked })} />
          Sequenza "INSERT COIN" prima di avviare un gioco (si salta con un pulsante)
        </label>
        <div className="field-row" style={{ alignItems: 'center' }}>
          <span className="hint" style={{ margin: 0 }}>Rotazione di copertine a riposo, dopo</span>
          <select value={s.attractSeconds} onChange={(e) => setS({ ...s, attractSeconds: Number(e.target.value) })}>
            <option value={0}>mai</option>
            <option value={60}>1 minuto</option>
            <option value={90}>1 minuto e mezzo</option>
            <option value={180}>3 minuti</option>
            <option value={300}>5 minuti</option>
          </select>
        </div>
        <label className="check">
          <input type="checkbox" checked={s.lightEffects} onChange={(e) => setS({ ...s, lightEffects: e.target.checked })} />
          Effetti ridotti (consigliato per PC lenti: meno animazioni e luci)
        </label>
        <button className="chip" onClick={onRomCheck}>
          🧪 CONTROLLO ROM DI MAME (trova gli ZIP difettosi)
        </button>
        <button className="chip" onClick={onPc}>
          ⚡ OTTIMIZZAZIONE AUTOMATICA DEL PC
        </button>
        <button className="big" onClick={save}>
          {saved ? '✔ SALVATO' : 'SALVA'}
        </button>
        <p className="note">
          Mr. Emulator non include né scarica ROM o BIOS. Usa solo i file che indichi tu.
        </p>
          </>
        )}
      </div>
    </div>
  )
}
