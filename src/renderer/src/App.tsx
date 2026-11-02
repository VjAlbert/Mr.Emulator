import { useCallback, useEffect, useRef, useState } from 'react'
import type { Feedback, Game, GameEnded, LibraryEvent, SystemInfo } from '@shared/types'
import SystemSelect from './components/SystemSelect'
import GameList from './components/GameList'
import SettingsScreen from './components/Settings'
import SystemReport from './components/SystemReport'
import InputTest from './components/InputTest'
import FeedbackPrompt from './components/FeedbackPrompt'
import { clearArtCache } from './hooks/useArt'

type Screen = { name: 'systems' } | { name: 'games'; system: SystemInfo } | { name: 'settings' } | { name: 'pc' } | { name: 'input' }

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
  const screenRef = useRef<Screen>({ name: 'systems' })
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
    setWipe((w) => w + 1)
    screenRef.current = s
    setScreen(s)
  }

  const toastRef = useRef<(m: string) => void>(() => undefined)
  const toast = (m: string): void => {
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
    const res = await window.mr.launch(g)
    if (!res.ok && res.error) toast(res.error)
  }

  let view: React.JSX.Element
  if (screen.name === 'input') {
    view = <InputTest onBack={() => go({ name: 'systems' })} onChanged={(st) => setScheme(st.inputScheme)} />
  } else if (screen.name === 'pc') {
    view = <SystemReport onBack={() => go({ name: 'systems' })} />
  } else if (screen.name === 'settings') {
    view = (
      <SettingsScreen
        onPc={() => go({ name: 'pc' })}
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
      <GameList system={screen.system} games={games} message={message} onLaunch={launch} onBack={() => go({ name: 'systems' })} letterJump={scheme !== 'cabinet'} />
    )
  } else {
    view = <SystemSelect systems={systems} onOpen={openSystem} lib={lib} onSettings={() => go({ name: 'settings' })} onPc={() => go({ name: 'pc' })} onInput={() => go({ name: 'input' })} />
  }

  const wipeColor = screen.name === 'games' ? screen.system.color : '#ffd400'
  return (
    <>
      {view}
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
