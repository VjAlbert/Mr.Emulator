import { useEffect, useRef } from 'react'
import type { SystemInfo } from '@shared/types'
import { useInput } from '../hooks/useInput'
import { sfx } from '../sound'
import { getLang, t } from '../i18n'
import Orbs from './Orbs'
import SystemArt from './SystemArt'

interface Props {
  systems: SystemInfo[]
  version: string
  onStart: () => void
  onLang: (l: 'it' | 'en') => void
}

/** Prima schermata: titolo a tutto schermo in stile cabinato, con "premi start" lampeggiante e una fila di console che scorre */
export default function TitleScreen({ systems, version, onStart, onLang }: Props): React.JSX.Element {
  const started = useRef(false)
  const go = (): void => {
    if (started.current) return
    started.current = true
    sfx.coin()
    onStart()
  }

  // un tasto qualsiasi (tranne i modificatori) fa partire
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'NumLock'].includes(e.key) || e.code.startsWith('F')) return
      e.preventDefault()
      go()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // pad ed encoder: ogni direzione o pulsante conferma
  useInput({ onConfirm: go, onMove: go, onBack: go, onMenu: go, onAlt: go, onSearch: go }, { keyboard: false })

  const lang = getLang()
  const games = systems.reduce((n, s) => n + (s.gameCount || 0), 0)
  // la fila viene ripetuta due volte per far scorrere senza interruzioni
  const strip = systems.filter((s) => s.phase === 1)
  return (
    <div className="screen title" onClick={go}>
      <Orbs />
      <div className="tt-rays" />
      <div className="tt-top" onClick={(e) => e.stopPropagation()}>
        <div className="seg">
          <button className={lang === 'it' ? 'on' : ''} onClick={() => onLang('it')}>IT</button>
          <button className={lang === 'en' ? 'on' : ''} onClick={() => onLang('en')}>EN</button>
        </div>
      </div>

      <div className="tt-center">
        <div className="tt-pre">{t('IL TUO CABINATO ARCADE PERSONALE')}</div>
        <h1 className="tt-logo">
          <span className="tt-mr">MR.</span>
          <span className="tt-em">EMULATOR</span>
        </h1>
        <div className="tt-by">by Assistente Malpagato software</div>
        <div className="tt-start">{t('PREMI START')}</div>
        <div className="tt-hint">{t('tasto qualsiasi · joystick · pulsante · clic')}</div>
      </div>

      {strip.length > 0 && (
        <div className="tt-strip" aria-hidden="true">
          <div className="tt-track">
            {[...strip, ...strip].map((s, i) => (
              <div key={i} className="tt-sys" style={{ ['--tile' as string]: s.color }}>
                <SystemArt id={s.id} className="tt-art" />
                <span>{s.short}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tt-foot">
        <span>{t('{n} sistemi · {g} giochi', { n: strip.length, g: games.toLocaleString(lang === 'it' ? 'it' : 'en') })}</span>
        <span>v{version}</span>
      </div>
    </div>
  )
}
