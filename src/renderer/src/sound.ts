/**
 * Suoni dell'interfaccia, sintetizzati con Web Audio: nessun file da distribuire e nessun diritto da rispettare.
 * Sono brevi bip "da sala giochi". Si spengono con un interruttore nelle Impostazioni.
 */

let ctx: AudioContext | null = null
let enabled = true
let volume = 0.4
let lastMove = 0

export function configureSound(on: boolean, vol: number): void {
  enabled = on
  volume = Math.min(1, Math.max(0, vol))
}

function audio(): AudioContext | null {
  if (!enabled || volume <= 0) return null
  if (!ctx) {
    try {
      ctx = new AudioContext()
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Un bip: forma d'onda, frequenza (con glissando facoltativo), durata e intensità */
function tone(freq: number, at: number, dur: number, type: OscillatorType, gain: number, endFreq?: number): void {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain * volume, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t)
  osc.stop(t + dur + 0.02)
  osc.onended = () => {
    osc.disconnect()
    g.disconnect()
  }
}

/** Soffio di rumore filtrato che sale o scende di frequenza (rumore di "whoosh") */
function swoosh(at: number, dur: number, from: number, to: number, gain: number): void {
  const c = audio()
  if (!c) return
  const t = c.currentTime + at
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 1.2
  f.frequency.setValueAtTime(from, t)
  f.frequency.exponentialRampToValueAtTime(to, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(gain * volume, t + dur * 0.3)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(c.destination)
  src.start(t)
  src.onended = () => {
    src.disconnect()
    f.disconnect()
    g.disconnect()
  }
}

export const sfx = {
  /** Cursore che si sposta (limitato: tenendo premuto non diventa una raffica) */
  move(): void {
    const now = performance.now()
    if (now - lastMove < 45) return
    lastMove = now
    tone(1180, 0, 0.035, 'square', 0.1)
  },
  /** Tasto della tastiera sullo schermo */
  key(): void {
    tone(1560, 0, 0.03, 'square', 0.09)
  },
  confirm(): void {
    tone(660, 0, 0.07, 'square', 0.14)
    tone(990, 0.07, 0.1, 'square', 0.14)
  },
  back(): void {
    tone(520, 0, 0.07, 'square', 0.12)
    tone(340, 0.07, 0.1, 'square', 0.12)
  },
  /** Moneta: il classico doppio bip acuto */
  coin(): void {
    tone(988, 0, 0.09, 'square', 0.16)
    tone(1319, 0.09, 0.32, 'square', 0.16)
    tone(2637, 0.09, 0.2, 'triangle', 0.05)
  },
  /** "Player 1 ready": tre note che salgono */
  ready(): void {
    tone(523, 0, 0.1, 'square', 0.15)
    tone(659, 0.1, 0.1, 'square', 0.15)
    tone(784, 0.2, 0.1, 'square', 0.15)
    tone(1047, 0.3, 0.3, 'square', 0.16)
    swoosh(0.05, 0.45, 400, 3000, 0.12)
  },
  error(): void {
    tone(150, 0, 0.18, 'sawtooth', 0.16, 90)
  },
  /** Ingresso di una schermata */
  whoosh(): void {
    swoosh(0, 0.22, 600, 2400, 0.08)
  }
}
