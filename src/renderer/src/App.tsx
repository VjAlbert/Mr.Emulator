import { useCallback, useEffect, useRef, useState } from 'react'
import type { Feedback, Game, GameEnded, LibraryEvent, SystemInfo } from '@shared/types'
import SystemSelect from './components/SystemSelect'
import GameList from './components/GameList'
import SettingsScreen from './components/Settings'
import SystemReport from './components/SystemReport'
import InputTest from './components/InputTest'
import RomCheck from './components/RomCheck'
import FeedbackPrompt from './components/FeedbackPrompt'
import LaunchSequence from './components/LaunchSequence'
import AttractMode from './components/AttractMode'
import { configureSound, sfx } from './sound'
import { music } from './music'
import MiniPlayer from './components/MiniPlayer'
import { clearArtCache } from './hooks/useArt'
import { isModalOpen, setCabinetKeys } from './hooks/useInput'

type Screen = { name: 'systems' } | { name: 'games'; system: SystemInfo } | { name: 'settings' } | { name: 'pc' } | { name: 'input' } | { name: 'romcheck' }

export default function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'systems' })
  const [systems, setSystems] = useState<SystemInfo[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const [wipe, setWipe] = useState(0)
  const [scheme, setScheme] = useState<'laptop' | 'cabinet'>('laptop')
  const [lib, setLib] = useState<LibraryEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const [launching, setLaunching] = useState<Game | null>(null)
  const launchDone = useRef<() => void>(() => undefined)
  const [attract, setAttract] = useState(false)
  const [opts, setOpts] = useState({ attractSeconds: 90, launchAnimation: true })
  const lastActivity = useRef(Date.now())
  const screenRef = useRef<Screen>({ name: 'systems' })
  useEffect(() => setCabinetKeys(scheme === 'cabinet'), [scheme])
  const [ended, setEnded] = useState<GameEnded | null>(null)

  // quando un gioco si chiude, il programma chiede com'è andata
  useEffect(() => window.mr.onGameEnded(setEnded), [])

  // MAME (o altri programmi) non riesce ad avviare un gioco: si mostra il motivo
  useEffect(() => window.mr.onGameFailed((m) => toastRef.current(m)), [])

  // la libreria si aggiorna in background: contatori e, se serve, la lista aperta
  useEffect(() => {
    let timer: number | undefined
    window.mr.getLibraryStatus().then(setLib)
    const off = window.mr.onLibrary((e) => {
      setLib(e)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        window.mr.getSystems().then(setSystems)
        const cur = screenRef.current
        if (e.updated && cur.name === 'games' && cur.system.id === e.updated) {
          window.mr.getGames(e.updated).then(setGames)
        }
      }, 350)
    })
    return () => {
      off()
      window.clearTimeout(timer)
    }
  }, [])

  const applyFx = useCallback(() => {
    window.mr.getSettings().then((st) => {
      document.documentElement.classList.toggle('light-fx', !!st.lightEffects)
      setScheme(st.inputScheme)
      configureSound(st.soundOn, st.soundVolume)
      music.setVolume(st.musicVolume)
      setOpts({ attractSeconds: st.attractSeconds, launchAnimation: st.launchAnimation })
    })
  }, [])

  const refresh = useCallback(() => {
    window.mr.getSystems().then(setSystems)
  }, [])

  useEffect(() => {
    refresh()
    applyFx()
  }, [refresh, applyFx])

  // cambio schermata con tendina diagonale
  const go = (s: Screen): void => {
    if (s.name === 'systems') sfx.back()
    else sfx.confirm()
    setWipe((w) => w + 1)
    screenRef.current = s
    setScreen(s)
  }

  const toastRef = useRef<(m: string) => void>(() => undefined)
  const toast = (m: string): void => {
    sfx.error()
    setMessage(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(''), m.length > 120 ? 11000 : 4500)
  }
  toastRef.current = toast

  const openSystem = async (system: SystemInfo): Promise<void> => {
    // la prima volta l'elenco di un sistema (specie MAME) può richiedere qualche secondo: si avvisa
    const t = window.setTimeout(() => setBusy(true), 400)
    try {
      setGames(await window.mr.getGames(system.id))
    } finally {
      window.clearTimeout(t)
      setBusy(false)
    }
    go({ name: 'games', system })
  }

  const launch = async (g: Game): Promise<void> => {
    // sequenza "INSERT COIN": solo per giochi veri, e si può saltare con un pulsante
    if (opts.launchAnimation && !g.demo) {
      await new Promise<void>((resolve) => {
        launchDone.current = resolve
        setLaunching(g)
      })
    }
    music.stop() // la musica non deve continuare mentre si gioca
    const res = await window.mr.launch(g)
    setLaunching(null)
    lastActivity.current = Date.now()
    if (!res.ok && res.error) toast(res.error)
  }

  // rotazione a riposo: dopo un po' senza input, solo nelle schermate dei sistemi e dei giochi
  useEffect(() => {
    const bump = (): void => {
      lastActivity.current = Date.now()
    }
    const events = ['keydown', 'mousedown', 'mousemove', 'touchstart', 'focus']
    events.forEach((e) => window.addEventListener(e, bump, true))
    let padSig = ''
    const iv = window.setInterval(() => {
      // pad: qualsiasi pulsante o levetta mossa conta come attività
      let sig = ''
      for (const p of navigator.getGamepads()) if (p) sig += p.buttons.map((b) => (b.pressed ? 1 : 0)).join('') + p.axes.map((a) => Math.round(a * 2)).join(',')
      if (sig !== padSig) {
        padSig = sig
        bump()
      }
      const cur = screenRef.current.name
      const idle = Date.now() - lastActivity.current
      if (opts.attractSeconds > 0 && idle > opts.attractSeconds * 1000 && (cur === 'systems' || cur === 'games') && !document.hidden && !isModalOpen()) {
        setAttract(true)
      }
    }, 1000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump, true))
      window.clearInterval(iv)
    }
  }, [opts.attractSeconds])

  let view: React.JSX.Element
  if (screen.name === 'romcheck') {
    view = <RomCheck onBack={() => go({ name: 'systems' })} />
  } else if (screen.name === 'input') {
    view = <InputTest onBack={() => go({ name: 'systems' })} onChanged={(st) => setScheme(st.inputScheme)} />
  } else if (screen.name === 'pc') {
    view = <SystemReport onBack={() => go({ name: 'systems' })} />
  } else if (screen.name === 'settings') {
    view = (
      <SettingsScreen
        onPc={() => go({ name: 'pc' })}
        onRomCheck={() => go({ name: 'romcheck' })}
        onClose={() => go({ name: 'systems' })}
        onSaved={() => {
          clearArtCache()
          refresh()
          applyFx()
        }}
      />
    )
  } else if (screen.name === 'games') {
    view = (
      <GameList system={screen.system} games={games} message={message} onLaunch={launch} onBack={() => go({ name: 'systems' })} letterJump={scheme !== 'cabinet'} onRomCheck={() => go({ name: 'romcheck' })} />
    )
  } else {
    view = <SystemSelect systems={systems} onOpen={openSystem} lib={lib} onSettings={() => go({ name: 'settings' })} onPc={() => go({ name: 'pc' })} onInput={() => go({ name: 'input' })} />
  }

  const wipeColor = screen.name === 'games' ? screen.system.color : '#ffd400'
  return (
    <>
      {view}
      <MiniPlayer />
      {launching && (
        <LaunchSequence
          game={launching}
          systemName={screen.name === 'games' ? screen.system.name : ''}
          color={screen.name === 'games' ? screen.system.color : '#ffd400'}
          onDone={() => launchDone.current()}
        />
      )}
      {attract && (
        <AttractMode
          systems={systems}
          onClose={() => {
            lastActivity.current = Date.now()
            setAttract(false)
          }}
        />
      )}
      {busy && <div className="busy">⟳ Preparazione dell'elenco… (succede solo la prima volta)</div>}
      {wipe > 0 && <div key={wipe} className="wipe" style={{ ['--w' as string]: wipeColor }} />}
      {ended && (
        <FeedbackPrompt
          ended={ended}
          onAnswer={(a: Feedback) => void window.mr.sendFeedback(ended.systemId, a)}
          onSkip={() => setEnded(null)}
        />
      )}
      <div className="fx-scan" />
    </>
  )
}
