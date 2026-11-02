import { useEffect, useRef, useState } from 'react'
import type { PickKind, Settings } from '@shared/types'
import { useInput } from '../hooks/useInput'
import { configureSound, sfx } from '../sound'

type PathKey = 'romsDir' | 'biosDir' | 'retroarchPath' | 'coresDir' | 'mamePath' | 'mameChdDir' | 'mameRomDir' | 'mediaDir'

interface Props {
  onClose: () => void
  onSaved: () => void
  onPc: () => void
  onRomCheck: () => void
}

export default function SettingsScreen({ onClose, onSaved, onPc, onRomCheck }: Props): React.JSX.Element {
  const [s, setS] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [mameInfo, setMameInfo] = useState<string>('')
  const [mediaInfo, setMediaInfo] = useState<string[]>([])
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.mr.getSettings().then(setS)
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
      </div>
    </div>
  )
}
