import { splitTitle } from '../search'

/**
 * Copertina standard generata quando un gioco non ne ha una vera: stile fumetto da picchiaduro,
 * nel colore del sistema. Se c'è una schermata del gioco, viene incorniciata al centro come uno schermo.
 * Ogni gioco ha una variante di sfondo diversa (ma sempre la stessa per lo stesso gioco).
 */

const hash = (s: string): number => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mix(hex: string, to: [number, number, number], t: number): string {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16)
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v + (to[i] - v) * t))
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

/** Titolo su al massimo 3 righe, con la dimensione del carattere adattata alla riga più lunga */
function layoutTitle(title: string): { lines: string[]; size: number } {
  const words = title.toUpperCase().split(/\s+/).filter(Boolean)
  for (const limit of [11, 14, 18]) {
    const lines: string[] = []
    let cur = ''
    for (const w of words) {
      if (cur && (cur + ' ' + w).length > limit) {
        lines.push(cur)
        cur = w
      } else cur = cur ? `${cur} ${w}` : w
    }
    if (cur) lines.push(cur)
    if (lines.length <= 3 || limit === 18) {
      const kept = lines.slice(0, 3)
      if (lines.length > 3) kept[2] = kept[2].slice(0, Math.max(3, limit - 1)) + '…'
      const longest = Math.max(...kept.map((l) => l.length), 1)
      return { lines: kept, size: Math.max(22, Math.min(54, Math.floor(262 / (longest * 0.5)))) }
    }
  }
  return { lines: [title.toUpperCase()], size: 30 }
}

interface Props {
  id: string
  name: string
  /** Nome del sistema mostrato sulla striscia in alto */
  system: string
  color: string
  year?: string
  /** Schermata del gioco da incorniciare (facoltativa) */
  shot?: string | null
}

export default function GeneratedCover({ id, name, system, color, year, shot }: Props): React.JSX.Element {
  const h = hash(id + name)
  const motif = h % 3
  const base = mix(color, [0, 0, 0], 0.45)
  const dark = mix(color, [0, 0, 0], 0.82)
  const light = mix(color, [255, 255, 255], 0.35)
  const angle = 140 + (h % 5) * 8
  const title = splitTitle(name).main
  const { lines, size } = layoutTitle(title)
  const uid = `gc${h}`
  const initial = (title.match(/[A-Za-z0-9]/) ?? ['?'])[0].toUpperCase()
  const titleTop = shot ? 300 : 262
  const yr = (year ?? '').replace(/\?/g, '').slice(0, 4)

  const rays: string[] = []
  for (let i = 0; i < 28; i += 2) {
    const a1 = (i / 28) * Math.PI * 2
    const a2 = ((i + 1) / 28) * Math.PI * 2
    rays.push(`M150 170 L${(150 + Math.cos(a1) * 420).toFixed(1)} ${(170 + Math.sin(a1) * 420).toFixed(1)} L${(150 + Math.cos(a2) * 420).toFixed(1)} ${(170 + Math.sin(a2) * 420).toFixed(1)} Z`)
  }

  return (
    <svg viewBox="0 0 300 420" width="100%" height="100%" role="img" aria-label={name} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${uid}bg`} gradientTransform={`rotate(${angle} .5 .5)`}>
          <stop offset="0" stopColor={light} />
          <stop offset=".45" stopColor={base} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <pattern id={`${uid}dots`} width="11" height="11" patternUnits="userSpaceOnUse" patternTransform="rotate(25)">
          <circle cx="5.5" cy="5.5" r="2.1" fill="#000" />
        </pattern>
        <pattern id={`${uid}scan`} width="4" height="3" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" opacity=".28" />
        </pattern>
        <clipPath id={`${uid}clip`}>
          <rect x="26" y="74" width="248" height="186" rx="6" />
        </clipPath>
      </defs>

      <rect width="300" height="420" fill={`url(#${uid}bg)`} />
      {motif === 0 && <path d={rays.join(' ')} fill="#fff" opacity=".13" />}
      {motif === 1 && (
        <g fill="#000" opacity=".2">
          <polygon points="-20,420 70,0 140,0 50,420" />
          <polygon points="130,420 220,0 250,0 160,420" />
          <polygon points="250,420 340,0 360,0 270,420" />
        </g>
      )}
      {motif === 2 && (
        <g fill="none" stroke="#fff" opacity=".14" strokeWidth="14">
          <circle cx="150" cy="170" r="70" />
          <circle cx="150" cy="170" r="130" />
          <circle cx="150" cy="170" r="190" />
        </g>
      )}
      <rect width="300" height="420" fill={`url(#${uid}dots)`} opacity=".14" />

      {/* striscia del sistema */}
      <polygon points="0,0 300,0 300,44 0,34" fill="#000" opacity=".82" />
      <text x="16" y="29" fontFamily="Anton, Impact, sans-serif" fontSize="22" letterSpacing="4" fill={light}>
        {system.toUpperCase()}
      </text>
      {yr && (
        <text x="284" y="29" textAnchor="end" fontFamily="Anton, Impact, sans-serif" fontSize="20" letterSpacing="3" fill="#fff" opacity=".85">
          {yr}
        </text>
      )}

      {shot ? (
        <g>
          <rect x="18" y="66" width="264" height="202" rx="12" fill="#14141c" stroke="#000" strokeWidth="5" />
          <image href={shot} x="26" y="74" width="248" height="186" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}clip)`} />
          <rect x="26" y="74" width="248" height="186" rx="6" fill={`url(#${uid}scan)`} />
          <rect x="18" y="66" width="264" height="202" rx="12" fill="none" stroke={light} strokeWidth="2.5" />
        </g>
      ) : (
        <g transform="rotate(-7 150 170)">
          <text x="158" y="262" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="230" fill="#000" opacity=".55">
            {initial}
          </text>
          <text x="150" y="254" textAnchor="middle" fontFamily="Anton, Impact, sans-serif" fontSize="230" fill={light} stroke="#000" strokeWidth="7" paintOrder="stroke">
            {initial}
          </text>
        </g>
      )}

      {/* titolo con contorno e ombra spigolosa */}
      <g fontFamily="Anton, Impact, sans-serif" textAnchor="middle" letterSpacing="1.5">
        {lines.map((l, i) => {
          const y = titleTop + size * 0.9 + i * size * 1.02
          return (
            <g key={i}>
              <text x="154" y={y + 4} fontSize={size} fill="#000" opacity=".8">
                {l}
              </text>
              <text x="150" y={y} fontSize={size} fill="#fff" stroke="#000" strokeWidth="5" paintOrder="stroke">
                {l}
              </text>
            </g>
          )
        })}
      </g>

      <rect x="3" y="3" width="294" height="414" fill="none" stroke="#000" strokeWidth="6" />
      <rect x="8" y="8" width="284" height="404" fill="none" stroke={light} strokeWidth="1.5" opacity=".7" />
    </svg>
  )
}
