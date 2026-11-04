import { useCallback, useEffect, useState } from 'react'
import type { DiagnosticReport, Settings } from '@shared/types'
import { useInput } from '../hooks/useInput'
import Orbs from './Orbs'
import { t } from '../i18n'

type Bios = Awaited<ReturnType<typeof window.mr.getBiosStatus>>

const STEPS = ['BENVENUTO', 'I TUOI GIOCHI', 'RETROARCH', 'BIOS', 'MAME', 'FINE']

/** Procedura guidata del primo avvio: pochi passi, parole semplici, niente da cercare nelle impostazioni */
export default function FirstRun({ onDone }: { onDone: () => void }): React.JSX.Element {
  const [step, setStep] = useState(0)
  const [s, setS] = useState<Settings | null>(null)
  const [bios, setBios] = useState<Bios>([])
  const [diag, setDiag] = useState<DiagnosticReport | null>(null)
  const [msg, setMsg] = useState('')
  const [cores, setCores] = useState<Array<{ core: string; systems: string[]; installed: boolean; games: number }>>([])
  const [pickedCores, setPickedCores] = useState<Set<string>>(new Set())
  const [coreBusy, setCoreBusy] = useState('')
  const [coreLog, setCoreLog] = useState<string[]>([])

  const reload = useCallback(async () => {
    setS(await window.mr.getSettings())
    setBios(await window.mr.getBiosStatus())
  }, [])
  useEffect(() => {
    reload()
  }, [reload])

  const finish = async (): Promise<void> => {
    const cur = await window.mr.getSettings()
    await window.mr.saveSettings({ ...cur, firstRunDone: true })
    onDone()
  }
  const next = (): void => setStep((n) => Math.min(STEPS.length - 1, n + 1))
  const back = (): void => setStep((n) => Math.max(0, n - 1))

  useEffect(() => {
    if (step === STEPS.length - 1) window.mr.getDiagnostics().then(setDiag)
    if (step === 3) window.mr.getBiosStatus().then(setBios)
    if (step === 2) window.mr.getCoreList().then(setCores)
  }, [step])

  useInput({ onConfirm: () => (step === STEPS.length - 1 ? finish() : next()), onBack: back })

  if (!s) return <div className="loading">{t('Caricamento…')}</div>

  const pick = async (key: 'retroarchPath' | 'mamePath', kind: 'file'): Promise<void> => {
    const p = await window.mr.pickPath(kind)
    if (!p) return
    await window.mr.saveSettings({ ...s, [key]: p })
    await reload()
    if (key === 'retroarchPath') setCores(await window.mr.getCoreList())
  }

  return (
    <div className="screen firstrun" style={{ ['--accent' as string]: '#ffd400' }}>
      <Orbs />
      <header className="topbar">
        <div className="brand">
          <h1 className="logo">
            {t('MR.')} <span>{t('EMULATOR')}</span>
          </h1>
          <small className="by">by Assistente Malpagato software</small>
        </div>
        <button className="chip" onClick={finish}>{t('SALTA LA GUIDA')}</button>
      </header>
      <div className="fr-steps">
        {STEPS.map((t, i) => (
          <span key={t} className={`fr-step ${i === step ? 'on' : ''} ${i < step ? 'done' : ''}`}>{i + 1}. {t}</span>
        ))}
      </div>

      <div className="fr-body">
        {step === 0 && (
          <>
            <h2>{t('Benvenuto!')}</h2>
            <p>{t('In cinque passi il programma è pronto. Non serve conoscere nulla di emulazione: ti diciamo noi cosa fare, e puoi ripetere questa guida quando vuoi da Impostazioni.')}</p>
            <ul className="fr-list">
              <li><b>{t('I tuoi giochi')}</b>{t(': scegli dove tenerli.')}</li>
              <li><b>{t('RetroArch')}</b>{t(': il programma che fa partire le console.')}</li>
              <li><b>{t('BIOS')}</b>{t(': alcuni sistemi hanno bisogno di file speciali. Ti mostriamo quali.')}</li>
              <li><b>{t('MAME')}</b>{t(': facoltativo, per i giochi arcade.')}</li>
            </ul>
            <p className="hint">{t('Mr. Emulator non include né scarica ROM o BIOS: usa i file che possiedi già.')}</p>
          </>
        )}

        {step === 1 && (
          <>
            <h2>{t('Dove tieni i tuoi giochi?')}</h2>
            <p>{t('Il programma crea una cartella per ogni sistema (nes, snes, megadrive, psx…) e una per i BIOS. Se hai un disco esterno o un secondo disco, usa quello.')}</p>
            <div className="fr-actions">
              <button className="chip big" onClick={async () => { setS(await window.mr.setupFolders()); setMsg(t('✔ Cartelle create in Documenti\\MrEmulator')) ; await reload() }}>{t('📁 USA LA CARTELLA STANDARD (Documenti)')}</button>
              <button
                className="chip big"
                onClick={async () => {
                  const dir = await window.mr.pickPath('dir')
                  if (!dir) return
                  try {
                    setS(await window.mr.setupRoot(dir))
                    setMsg(t('✔ Tutto impostato dentro {dir}', { dir }))
                    await reload()
                  } catch {
                    setMsg(t('⚠ Non riesco a creare le cartelle lì: controlla che il disco sia collegato e scrivibile.'))
                  }
                }}
              >
                {t('💾 SCEGLI UN ALTRO DISCO…')}
              </button>
            </div>
            <p className="fr-ok">{msg || (s.romsDir ? `Cartella attuale: ${s.romsDir}` : t('Nessuna cartella scelta ancora.'))}</p>
            <div className="fr-actions">
              <button className="chip" onClick={() => window.mr.openFolder('roms')}>{t('APRI LA CARTELLA DEI GIOCHI')}</button>
            </div>
            <p className="hint">{t('Copia lì le tue ROM, ognuna nella cartella del suo sistema.')}</p>
          </>
        )}

        {step === 2 && (
          <>
            <h2>{t('RetroArch')}</h2>
            <p>{t('È il programma gratuito che fa partire NES, SNES, Mega Drive, PlayStation, Dreamcast e le altre console. Si scarica dal sito ufficiale')} <b>{t('retroarch.com')}</b> {t('(versione Windows), si estrae in una cartella e basta: non si installa.')}</p>
            <div className="fr-actions">
              <button className="chip big" onClick={() => pick('retroarchPath', 'file')}>{t('🔎 INDICA retroarch.exe')}</button>
            </div>
            <p className={s.retroarchPath ? 'fr-ok' : 'fr-warn'}>{s.retroarchPath ? `✔ ${s.retroarchPath}` : t('Non ancora indicato (puoi farlo anche dopo)')}</p>
            {s.retroarchPath && (
              <>
                <p>{t('Ogni console ha bisogno del suo')} <b>{t('core')}</b>{t('. Scegli quelli che ti servono: il programma li scarica dall\'archivio ufficiale di RetroArch.')}</p>
                <div className="fr-cores">
                  {cores.map((c) => (
                    <label key={c.core} className={`fr-core ${c.installed ? 'ok' : ''}`}>
                      <input
                        type="checkbox"
                        disabled={c.installed || !!coreBusy}
                        checked={c.installed || pickedCores.has(c.core)}
                        onChange={() =>
                          setPickedCores((p) => {
                            const n = new Set(p)
                            if (n.has(c.core)) n.delete(c.core)
                            else n.add(c.core)
                            return n
                          })
                        }
                      />
                      <span className="fr-core-n">{c.systems.join(', ')}</span>
                      <span className="fr-core-s">{c.installed ? t('✔ già installato') : c.games ? `${c.games} giochi` : c.core}</span>
                    </label>
                  ))}
                </div>
                <div className="fr-actions">
                  <button
                    className="chip"
                    disabled={!!coreBusy}
                    onClick={() => setPickedCores(new Set(cores.filter((c) => !c.installed).map((c) => c.core)))}
                  >
                    {t('SELEZIONA TUTTI')}
                  </button>
                  <button
                    className="chip big"
                    disabled={!!coreBusy || pickedCores.size === 0}
                    onClick={async () => {
                      const todo = [...pickedCores]
                      const log: string[] = []
                      for (let i = 0; i < todo.length; i++) {
                        setCoreBusy(t('Scarico {c} ({i} di {n})… può richiedere un minuto', { c: todo[i], i: i + 1, n: todo.length }))
                        const r = await window.mr.installCore(todo[i])
                        log.push(r.ok ? `✔ ${todo[i]}` : `⚠ ${todo[i]}: ${r.error}`)
                        setCoreLog([...log])
                      }
                      setCoreBusy('')
                      setPickedCores(new Set())
                      setCores(await window.mr.getCoreList())
                    }}
                  >
                    {t('⬇ INSTALLA I CORE SCELTI')}
                  </button>
                </div>
                {coreBusy && <p className="fr-warn">{coreBusy}</p>}
                {coreLog.map((l, i) => (
                  <p key={i} className={l.startsWith('✔') ? 'fr-ok' : 'fr-warn'}>{l}</p>
                ))}
              </>
            )}
            <p className="hint">{t('Se vuoi giocare solo ad arcade con MAME, puoi saltare questo passo.')}</p>
          </>
        )}

        {step === 3 && (
          <>
            <h2>{t('BIOS: i file speciali')}</h2>
            <p>{t('Alcuni sistemi non partono senza un file BIOS. Servono solo se hai giochi per quel sistema. Mr. Emulator non li fornisce: se li possiedi, copiali nella cartella indicata.')}</p>
            <div className="fr-bios">
              {bios.map((b) => (
                <div key={b.systemId} className={`fr-b ${b.found ? 'ok' : ''}`}>
                  <span className="fr-b-ic">{b.found ? (b.verified === 'unknown' ? '⚠' : '✔') : '✖'}</span>
                  <span className="fr-b-n">{b.name}</span>
                  <span className="fr-b-f">{b.found ? (b.verified === 'ok' ? t('trovato e riconosciuto: {f}', { f: b.found }) : b.verified === 'unknown' ? t('trovato ma non riconosciuto: {f} (può funzionare lo stesso, ma non è una versione nota)', { f: b.found }) : t('trovato: {f}', { f: b.found })) : t('serve {f}{o} in {w}', { f: b.files[0], o: b.files.length > 1 ? t(' (o simile)') : '', w: b.where })}</span>
                  <span className="fr-b-note">{t(b.note)}</span>
                </div>
              ))}
            </div>
            <div className="fr-actions">
              <button className="chip" onClick={() => window.mr.openFolder('bios')}>{t('📂 APRI LA CARTELLA BIOS')}</button>
              <button className="chip" onClick={() => window.mr.getBiosStatus().then(setBios)}>{t('⟳ RICONTROLLA')}</button>
            </div>
            <p className="hint">{t('Un ✖ non è un errore: significa solo che quel sistema non partirà finché il file non c\'è.')}</p>
          </>
        )}

        {step === 4 && (
          <>
            <h2>{t('MAME (facoltativo)')}</h2>
            <p>{t('Serve solo per il sistema')} <b>{t('Arcade (MAME)')}</b> {t('e per dare i nomi giusti ai giochi delle console. Si scarica da')} <b>{t('mamedev.org')}</b>{t('. Usa la stessa versione dei tuoi set di ROM.')}</p>
            <div className="fr-actions">
              <button className="chip big" onClick={() => pick('mamePath', 'file')}>{t('🔎 INDICA mame.exe')}</button>
            </div>
            <p className={s.mamePath ? 'fr-ok' : 'fr-warn'}>{s.mamePath ? `✔ ${s.mamePath}` : t('Non indicato: va bene se non ti serve.')}</p>
          </>
        )}

        {step === 5 && (
          <>
            <h2>{t('Tutto pronto?')}</h2>
            {!diag ? (
              <p>{t('Controllo in corso…')}</p>
            ) : (
              <>
                <p>{diag.problems === 0 ? t('✔ Nessun problema trovato.') : `${diag.problems} cose da sistemare (puoi farlo anche dopo da Impostazioni → Diagnostica).`}</p>
                <ul className="diag-list">
                  {diag.checks.filter((k) => k.level !== 'ok').slice(0, 6).map((k, i) => (
                    <li key={i} className={`diag-${k.level}`}>
                      <span className="diag-ic">{k.level === 'warn' ? '⚠' : '✖'}</span>
                      <span className="diag-t">{k.title}</span>
                      {k.fix && <span className="diag-f">→ {k.fix}</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="hint">{t('Se non hai ancora messo i giochi nelle cartelle, nessun problema: la home mostrerà i sistemi vuoti finché non lo fai.')}</p>
          </>
        )}
      </div>

      <footer className="fr-nav">
        <button className="chip" onClick={back} disabled={step === 0}>{t('◀ INDIETRO')}</button>
        {step < STEPS.length - 1 ? (
          <button className="chip save" onClick={next}>{t('AVANTI ▶')}</button>
        ) : (
          <button className="chip save" onClick={finish}>{t('🚀 INIZIA')}</button>
        )}
      </footer>
    </div>
  )
}
