import { useEffect, useState } from 'react'
import type { PickKind, Settings } from '@shared/types'
import { useInput } from '../hooks/useInput'

type PathKey = 'romsDir' | 'biosDir' | 'retroarchPath' | 'coresDir' | 'mamePath' | 'mameChdDir'

interface Props {
  onClose: () => void
  onSaved: () => void
  onPc: () => void
}

export default function SettingsScreen({ onClose, onSaved, onPc }: Props): React.JSX.Element {
  const [s, setS] = useState<Settings | null>(null)
  const [saved, setSaved] = useState(false)
  const [mameInfo, setMameInfo] = useState<string>('')

  useEffect(() => {
    window.mr.getSettings().then(setS)
  }, [])

  useInput({ onBack: onClose })

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
      </header>
      <div className="settings-body">
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
              setMameInfo(r.ok ? `✔ MAME ${r.version} · ${r.machines.toLocaleString('it')} macchine riconosciute` : `⚠ ${r.error ?? 'MAME non risponde'}`)
            }}
          >
            VERIFICA MAME
          </button>
          <span className="hint" style={{ margin: 0, alignSelf: 'center' }}>{mameInfo}</span>
        </div>
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
          <input type="checkbox" checked={s.lightEffects} onChange={(e) => setS({ ...s, lightEffects: e.target.checked })} />
          Effetti ridotti (consigliato per PC lenti: meno animazioni e luci)
        </label>
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
