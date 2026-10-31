import { useCallback, useEffect, useRef, useState } from 'react'
import type { Game, SystemInfo } from '@shared/types'
import SystemSelect from './components/SystemSelect'
import GameList from './components/GameList'
import SettingsScreen from './components/Settings'

type Screen = { name: 'systems' } | { name: 'games'; system: SystemInfo } | { name: 'settings' }

export default function App(): React.JSX.Element {
  const [screen, setScreen] = useState<Screen>({ name: 'systems' })
  const [systems, setSystems] = useState<SystemInfo[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [message, setMessage] = useState('')
  const timer = useRef<number | undefined>(undefined)

  const refresh = useCallback(() => {
    window.mr.getSystems().then(setSystems)
  }, [])

  useEffect(refresh, [refresh])

  const toast = (m: string): void => {
    setMessage(m)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(''), 4500)
  }

  const openSystem = async (system: SystemInfo): Promise<void> => {
    setGames(await window.mr.getGames(system.id))
    setScreen({ name: 'games', system })
  }

  const launch = async (g: Game): Promise<void> => {
    const res = await window.mr.launch(g)
    if (!res.ok && res.error) toast(res.error)
  }

  if (screen.name === 'settings') {
    return (
      <SettingsScreen
        onClose={() => setScreen({ name: 'systems' })}
        onSaved={refresh}
      />
    )
  }
  if (screen.name === 'games') {
    return (
      <GameList
        system={screen.system}
        games={games}
        message={message}
        onLaunch={launch}
        onBack={() => setScreen({ name: 'systems' })}
      />
    )
  }
  return <SystemSelect systems={systems} onOpen={openSystem} onSettings={() => setScreen({ name: 'settings' })} />
}
