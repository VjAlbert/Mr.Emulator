import { useCallback, useEffect, useRef, useState } from 'react'
import type { ImageStyle, OptimizationReport, PerfLevel, PerfMode, Settings, Tier } from '@shared/types'
import { useInput } from '../hooks/useInput'
import Orbs from './Orbs'

const LEVEL_LABEL: Record<PerfLevel, string> = { light: 'Leggero', balanced: 'Bilanciato', max: 'Massimo' }
const TIER_LABEL: Record<Tier, string> = { low: 'Base', mid: 'Media', high: 'Alta' }
const LEVEL_EXPLAIN: Record<PerfLevel, string> = {
  light: 'Meno effetti e più margine: ideale per PC datati.',
  balanced: 'Buon equilibrio tra qualità e fluidità.',
  max: 'Shader CRT di qualità e minor ritardo dei comandi.'
}

function Seg<T extends string>(props: { value: T; options: Array<[T, string]>; onChange: (v: T) => void }): React.JSX.Element {
  return (
    <div className="seg">
      {props.options.map(([v, label]) => (
        <button key={v} className={props.value === v ? 'on' : ''} onClick={() => props.onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export default function SystemReport({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [report, setReport] = useState<OptimizationReport | null>(null)
  const [s, setS] = useState<Settings | null>(null)

  const load = useCallback(async () => {
    const [r, st] = await Promise.all([window.mr.getReport(), window.mr.getSettings()])
    setReport(r)
    setS(st)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const bodyRef = useRef<HTMLDivElement>(null)
  // con tastiera e gamepad la pagina scorre con su/giù
  useInput({
    onBack,
    onMove: (d) => {
      if (d === 'up' || d === 'down') bodyRef.current?.scrollBy({ top: d === 'up' ? -160 : 160, behavior: 'smooth' })
    }
  })

  const patch = async (p: Partial<Settings>): Promise<void> => {
    if (!s) return
    const next = await window.mr.saveSettings({ ...s, ...p })
    setS(next)
    setReport(await window.mr.getReport())
  }

  if (!report || !s) return <div className="loading">Analisi del PC…</div>
  const hw = report.hardware
  const learned = Object.values(s.tuning).some((v) => v !== 0)

  return (
    <div className="screen report" style={{ ['--accent' as string]: '#00d4ff' }}>
      <Orbs />
      <header className="topbar">
        <button className="chip" onClick={onBack}>
          ◀ INDIETRO
        </button>
        <h2 className="sys-title">Il tuo PC</h2>
      </header>

      <div className="report-body" ref={bodyRef}>
        <section className="card">
          <h3>Macchina</h3>
          <div className="kv"><span>Processore</span><b>{hw.cpu.model}</b></div>
          <div className="kv"><span>Thread</span><b>{hw.cpu.threads} · classe {TIER_LABEL[hw.cpu.tier]}</b></div>
          <div className="kv"><span>Memoria</span><b>{hw.ramGb} GB</b></div>
          {hw.gpus.map((g) => (
            <div className="kv" key={g.name}>
              <span>Scheda video{g.active ? ' (attiva)' : ''}</span>
              <b>{g.name} · classe {TIER_LABEL[g.tier]}</b>
            </div>
          ))}
        </section>

        <section className="card">
          <h3>Schermi</h3>
          {hw.screens.map((sc) => (
            <div className={`kv ${sc.id === report.currentScreenId ? 'cur' : ''}`} key={sc.id}>
              <span>
                {sc.label}
                {sc.primary ? ' · principale' : ''}
                {sc.id === report.currentScreenId ? ' · qui' : ''}
              </span>
              <b>
                {sc.width}×{sc.height} · {sc.hz} Hz{sc.scale !== 1 ? ` · scala ${Math.round(sc.scale * 100)}%` : ''}
              </b>
            </div>
          ))}
        </section>

        <section className="card wide">
          <h3>Livello di qualità</h3>
          <div className="level-row">
            <div className={`badge lv-${report.effective}`}>{LEVEL_LABEL[report.effective]}</div>
            <div className="level-text">
              {s.perfMode === 'auto' ? <>Scelto in automatico dal programma (consigliato: <b>{LEVEL_LABEL[hw.level]}</b>). </> : <>Scelta manuale. </>}
              {LEVEL_EXPLAIN[report.effective]}
            </div>
          </div>
          <Seg<PerfMode>
            value={s.perfMode}
            options={[['auto', 'AUTO'], ['light', 'LEGGERO'], ['balanced', 'BILANCIATO'], ['max', 'MASSIMO']]}
            onChange={(v) => patch({ perfMode: v })}
          />
          <div className="opt-row">
            <span>Stile immagine</span>
            <Seg<ImageStyle>
              value={s.imageStyle}
              options={[['fit', 'ADATTATO ALLO SCHERMO'], ['pixel', 'PIXEL PERFETTI']]}
              onChange={(v) => patch({ imageStyle: v })}
            />
          </div>
          <div className="opt-row">
            <span>Schermo dei giochi</span>
            <select value={s.gameMonitor} onChange={(e) => patch({ gameMonitor: Number(e.target.value) })}>
              <option value={0}>Automatico (dove si trova Mr. Emulator)</option>
              {hw.screens.map((sc) => (
                <option key={sc.id} value={sc.index + 1}>
                  Schermo {sc.index + 1} · {sc.width}×{sc.height}
                </option>
              ))}
            </select>
          </div>
          <label className="check">
            <input type="checkbox" checked={s.autoTune} onChange={(e) => patch({ autoTune: e.target.checked })} />
            Chiedimi com'è andata dopo ogni partita e impara (consigliato)
          </label>
          {hw.hybridGpu && (
            <label className="check">
              <input type="checkbox" checked={s.dedicatedGpu} onChange={(e) => patch({ dedicatedGpu: e.target.checked })} />
              Usa la scheda video potente per i giochi{' '}
              <em className="state">
                {report.gpuPreference === 'applied' ? '✔ attivo' : report.gpuPreference === 'failed' ? '⚠ non riuscito' : report.gpuPreference === 'off' ? 'serve il percorso di RetroArch' : ''}
              </em>
            </label>
          )}
          {learned && (
            <button className="chip" onClick={() => patch({ tuning: {} })}>
              AZZERA CIÒ CHE HO IMPARATO
            </button>
          )}
        </section>

        <section className="card wide">
          <h3>Impostazioni scelte per ogni sistema</h3>
          <div className="profiles">
            {report.profiles.map((p) => (
              <div className="prow" key={p.systemId}>
                <span className="pname">{p.name}</span>
                <span className="psum">
                  {p.summary}
                  {p.delta !== 0 && <em className={p.delta > 0 ? 'up' : 'down'}> {p.delta > 0 ? '▲ alzato' : '▼ abbassato'} dalle tue risposte</em>}
                </span>
              </div>
            ))}
          </div>
        </section>

        {report.notes.length > 0 && (
          <section className="card wide notes">
            <h3>Da sapere</h3>
            <ul>
              {report.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}
