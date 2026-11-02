type Kind = 'arcade' | 'handheld' | 'cartridge' | 'disc' | 'computer'

const KIND: Record<string, Kind> = {
  arcade: 'arcade', mame: 'arcade', neogeo: 'arcade',
  gb: 'handheld', gbc: 'handheld', gba: 'handheld', ngp: 'handheld', gamegear: 'handheld', nds: 'handheld',
  fds: 'disc',
  msx: 'computer', spectrum: 'computer'
}
export const kindOf = (id: string): Kind => KIND[id] ?? 'cartridge'

/** Disegni semplici e originali (nessun logo o marchio): una forma per categoria di macchina */
function Glyph({ kind }: { kind: Kind }): React.JSX.Element {
  switch (kind) {
    case 'arcade':
      return (
        <g>
          <path d="M30 150 L50 70 H150 L170 150 Z" className="g-fill" />
          <rect x="40" y="20" width="120" height="52" rx="4" className="g-fill" />
          <rect x="52" y="30" width="96" height="32" className="g-screen" />
          <circle cx="70" cy="108" r="9" className="g-line" /><line x1="70" y1="108" x2="70" y2="88" className="g-line" />
          <circle cx="108" cy="112" r="6" className="g-dot" /><circle cx="126" cy="106" r="6" className="g-dot" /><circle cx="144" cy="100" r="6" className="g-dot" />
        </g>
      )
    case 'handheld':
      return (
        <g>
          <rect x="45" y="10" width="110" height="145" rx="12" className="g-fill" />
          <rect x="58" y="24" width="84" height="64" rx="3" className="g-screen" />
          <line x1="68" y1="118" x2="92" y2="118" className="g-line" /><line x1="80" y1="106" x2="80" y2="130" className="g-line" />
          <circle cx="122" cy="122" r="7" className="g-dot" /><circle cx="140" cy="110" r="7" className="g-dot" />
        </g>
      )
    case 'disc':
      return (
        <g>
          <rect x="40" y="25" width="120" height="120" rx="8" className="g-fill" />
          <rect x="62" y="25" width="76" height="46" className="g-screen" />
          <circle cx="100" cy="104" r="22" className="g-line" /><circle cx="100" cy="104" r="6" className="g-dot" />
        </g>
      )
    case 'computer':
      return (
        <g>
          <path d="M20 150 L38 80 H162 L180 150 Z" className="g-fill" />
          {[0, 1, 2].map((r) => Array.from({ length: 8 }, (_, c) => <rect key={`${r}${c}`} x={50 + c * 12 + r * 4} y={92 + r * 16} width="9" height="9" className="g-dot" />))}
          <rect x="55" y="14" width="90" height="56" rx="4" className="g-fill" />
          <rect x="63" y="22" width="74" height="40" className="g-screen" />
        </g>
      )
    default:
      return (
        <g>
          <path d="M45 10 H155 V120 L140 150 H60 L45 120 Z" className="g-fill" />
          <rect x="60" y="24" width="80" height="52" rx="3" className="g-screen" />
          <rect x="62" y="92" width="76" height="12" className="g-line" />
          {Array.from({ length: 10 }, (_, i) => <rect key={i} x={68 + i * 7} y="132" width="4" height="16" className="g-dot" />)}
        </g>
      )
  }
}

/** Disegno della categoria del sistema, colorato col colore del sistema */
export default function SystemArt({ id, className = '' }: { id: string; className?: string }): React.JSX.Element {
  return (
    <svg className={`sysart ${className}`} viewBox="0 0 200 160" aria-hidden="true">
      <Glyph kind={kindOf(id)} />
    </svg>
  )
}
