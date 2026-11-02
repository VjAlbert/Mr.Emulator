import type { MediaTrack } from '@shared/types'

/**
 * Lettore della colonna sonora: un solo elemento audio per tutto il programma.
 * La musica continua mentre si sfoglia la lista; si ferma da sola quando si avvia un gioco.
 */

export interface MusicState {
  active: boolean
  playing: boolean
  gameId: string
  game: string
  track: string
  index: number
  count: number
}

const audio = new Audio()
audio.preload = 'auto'
audio.volume = 0.5

let tracks: MediaTrack[] = []
let state: MusicState = { active: false, playing: false, gameId: '', game: '', track: '', index: 0, count: 0 }
const listeners = new Set<() => void>()

function set(patch: Partial<MusicState>): void {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

function load(i: number): void {
  if (!tracks.length) return
  const idx = ((i % tracks.length) + tracks.length) % tracks.length
  audio.src = tracks[idx].url
  set({ index: idx, track: tracks[idx].title, count: tracks.length })
  void audio.play().catch(() => set({ playing: false }))
}

audio.addEventListener('play', () => set({ playing: true }))
audio.addEventListener('pause', () => set({ playing: false }))
audio.addEventListener('ended', () => load(state.index + 1))
// un brano illeggibile: si passa al successivo (ma non all'infinito)
let errors = 0
audio.addEventListener('error', () => {
  if (++errors < 4) load(state.index + 1)
  else {
    errors = 0
    music.stop()
  }
})
audio.addEventListener('playing', () => (errors = 0))

export const music = {
  subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
  getState: (): MusicState => state,
  /** Avvia la colonna sonora di un gioco dal primo brano */
  play(gameId: string, game: string, list: MediaTrack[], start = 0): void {
    if (!list.length) return
    tracks = list
    set({ active: true, gameId, game })
    load(start)
  },
  /** Pausa / riprendi; se sta suonando un altro gioco, parte quello indicato */
  toggleFor(gameId: string, game: string, list: MediaTrack[]): void {
    if (state.active && state.gameId === gameId) {
      if (audio.paused) void audio.play().catch(() => undefined)
      else audio.pause()
    } else music.play(gameId, game, list)
  },
  toggle(): void {
    if (!state.active) return
    if (audio.paused) void audio.play().catch(() => undefined)
    else audio.pause()
  },
  next: (): void => load(state.index + 1),
  prev: (): void => load(state.index - 1),
  stop(): void {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
    tracks = []
    set({ active: false, playing: false, gameId: '', game: '', track: '', index: 0, count: 0 })
  },
  setVolume(v: number): void {
    audio.volume = Math.min(1, Math.max(0, v))
  }
}
