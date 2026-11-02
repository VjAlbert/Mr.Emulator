import { useEffect, useMemo, useState } from 'react'
import type { Game, Settings, VerifyBad, VerifyState } from '@shared/types'
import { useInput } from '../hooks/useInput'
import Orbs from './Orbs'

const reasonIt = (r: string): string =>
  /NOT FOUND/.test(r) ? 'mancante' : /INCORRECT CHECKSUM/.test(r) ? 'contenuto errato' : /INCORRECT LENGTH/.test(r) ? 'dimensione errata' : r

/** Per ogni gioco difettoso: quali ZIP vanno sostituiti e quali file hanno problemi */
function zipsToFix(b: VerifyBad): Array<{ zip: string; files: string[] }> {
  const map = new Map<string, string[]>()
  for (const i of b.issues) {
    // nei set "merged" i file di una variante stanno nello ZIP del gioco principale
    const zip = `${i.set === b.name ? b.parent : i.set}.zip`
    const list = map.get(zip) ?? []
    list.push(`${i.file} (${reasonIt(i.reason)})`)
    map.set(zip, list)
  }
  return [...map.entries()].map(([zip, files]) => ({ zip, files }))
}

const MAX_SHOWN = 300

export default function RomCheck({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [st, setSt] = useState<VerifyState | null>(null)
  const [names, setNames] = useState<Map<string, string>>(new Map())
  const [settings, setSettings] = useState<Settings | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.mr.getVerify().then(setSt)
    window.mr.getSettings().then(setSettings)
    window.mr.getGames('mame').then((g: Game[]) => setNames(new Map(g.filter((x) => x.machine).map((x) => [x.machine!, x.name]))))
    return window.mr.onVerify(setSt)
  }, [])

  useInput({
    onBack,
    onMove: (d) => {
      if (d === 'up' || d === 'down') document.querySelector('.rc-body')?.scrollBy({ top: d === 'up' ? -160 : 160, behavior: 'smooth' })
    }
  })

  const fixList = useMemo(() => {
    const zips = new Map<string, Set<string>>()
    for (const b of st?.badList ?? []) for (const z of zipsToFix(b)) for (const f of z.files) (zips.get(z.zip) ?? zips.set(z.zip, new Set()).get(z.zip)!).add(f)
    return [...zips.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [st?.badList])

  if (!st || !settings) return <div className="loading">Caricamento…</div>
  const sum = st.summary

  const start = async (): Promise<void> => {
    const r = await window.mr.startVerify()
    setMsg(r.ok ? '' : (r.error ?? 'Non riesco ad avviare il controllo.'))
  }
  const copy = async (): Promise<void> => {
    const text = fixList.map(([zip, files]) => `${zip}\n   ${[...files].join('\n   ')}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setMsg(`Copiato: ${fixList.length.toLocaleString('it')} ZIP da sostituire.`)
    } catch {
      setMsg('Non riesco a copiare negli appunti.')
    }
  }

  return (
    <div className="screen report" style={{ ['--accent' as string]: '#ff7a00' }}>
      <Orbs />
      <header className="topbar">
        <button className="chip" onClick={onBack}>
          ◀ INDIETRO
        </button>
        <h2 className="sys-title">Controllo ROM</h2>
        {st.running ? (
          <button className="chip save" onClick={() => window.mr.cancelVerify()}>
            ■ ANNULLA
          </button>
        ) : (
          <button className="chip save" onClick={start}>
            ▶ {sum ? 'RIPETI IL CONTROLLO' : 'AVVIA IL CONTROLLO'}
          </button>
        )}
      </header>

      <div className="report-body rc-body">
        <section className="card wide">
          <h3>Come funziona</h3>
          <p className="hint" style={{ marginTop: 0 }}>
            Usa il verificatore di MAME stesso: controlla ogni ZIP della cartella dei giochi rispetto alla versione di MAME che usi e ti dice quali sono
            incompleti o diversi, con i file precisi da sostituire. Legge solo gli indici degli ZIP, quindi su decine di GB richiede qualche minuto.
          </p>
          {msg && <p className="hint" style={{ color: '#ffd400' }}>{msg}</p>}
        </section>

        {st.running && (
          <section className="card wide">
            <h3>Controllo in corso…</h3>
            <div className="rc-bar">
              <i />
            </div>
            <div className="kv">
              <span>Set controllati</span>
              <b>{st.checked.toLocaleString('it')}</b>
            </div>
            <div className="kv">
              <span>Difettosi finora</span>
              <b>{st.bad.toLocaleString('it')}</b>
            </div>
          </section>
        )}

        {!st.running && sum && (
          <section className="card wide">
            <h3>Risultato{sum.cancelled ? ' (interrotto)' : ''}</h3>
            <div className="kv">
              <span>MAME</span>
              <b>{sum.version || '—'}</b>
            </div>
            <div className="kv">
              <span>Set controllati</span>
              <b>{sum.checked.toLocaleString('it')}</b>
            </div>
            <div className="kv">
              <span>✔ A posto</span>
              <b>{sum.good.toLocaleString('it')}</b>
            </div>
            <div className="kv">
              <span>⚠ Difettosi</span>
              <b style={{ color: sum.badCount ? '#ffd400' : undefined }}>{sum.badCount.toLocaleString('it')}</b>
            </div>
            <div className="kv">
              <span>Eseguito il</span>
              <b>{new Date(sum.at).toLocaleString('it')}</b>
            </div>
            {sum.checked === 0 && (
              <>
                <p className="hint">Non ho letto nessun risultato dall'output di MAME. Controlla di aver indicato il mame.exe giusto e che la cartella dei giochi non sia vuota. Ultime righe ricevute:</p>
                <pre className="rc-tail">{st.tail.join('\n') || '(nessun output)'}</pre>
              </>
            )}
            <label className="check">
              <input
                type="checkbox"
                checked={settings.hideBadRoms}
                onChange={async (e) => {
                  const next = await window.mr.saveSettings({ ...settings, hideBadRoms: e.target.checked })
                  setSettings(next)
                }}
              />
              Nascondi dalla lista i giochi con ROM difettose (così nella lista restano solo quelli che partono)
            </label>
            {sum.badCount > 0 && (
              <div className="field-row">
                <button className="chip" onClick={copy}>
                  COPIA L'ELENCO DEGLI ZIP DA SOSTITUIRE
                </button>
                <button className="chip" onClick={() => window.mr.openFolder('mame')}>
                  APRI LA CARTELLA DEI GIOCHI
                </button>
              </div>
            )}
          </section>
        )}

        {!st.running && sum && sum.badCount === 0 && sum.checked > 0 && (
          <section className="card wide">
            <h3>Tutto a posto</h3>
            <p className="hint" style={{ marginTop: 0 }}>Non ho trovato ROM difettose tra i set controllati.</p>
          </section>
        )}

        {!st.running && st.badList.length > 0 && (
          <section className="card wide">
            <h3>Giochi da sistemare ({st.badList.length.toLocaleString('it')})</h3>
            <div className="rc-list">
              {st.badList.slice(0, MAX_SHOWN).map((b) => (
                <div className="rc-item" key={b.name}>
                  <div className="rc-name">
                    {names.get(b.name) ?? b.name} <small>{b.name}</small>
                  </div>
                  {zipsToFix(b).map((z) => (
                    <div className="rc-fix" key={z.zip}>
                      <b>{z.zip}</b>: {z.files.join(' · ')}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {st.badList.length > MAX_SHOWN && (
              <p className="hint">… e altri {(st.badList.length - MAX_SHOWN).toLocaleString('it')}: usa "Copia l'elenco" per vederli tutti.</p>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
