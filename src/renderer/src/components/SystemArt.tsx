type Kind = 'arcade' | 'handheld' | 'cartridge' | 'disc' | 'computer' | 'dreamcast' | 'psx' | 'naomi' | 'atomiswave'

const KIND: Record<string, Kind> = {
  arcade: 'arcade', mame: 'arcade', neogeo: 'arcade',
  gb: 'handheld', gbc: 'handheld', gba: 'handheld', ngp: 'handheld', gamegear: 'handheld', nds: 'handheld',
  fds: 'disc', dreamcast: 'dreamcast', psx: 'psx', naomi: 'naomi', atomiswave: 'atomiswave',
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
    case 'dreamcast':
      // console squadrata: coperchio con disco tondo, quattro porte frontali
      return (
        <g>
          <path d="M20 70 L45 40 H155 L180 70 V135 H20 Z" className="g-fill" />
          <path d="M20 70 H180" className="g-line" />
          <circle cx="100" cy="62" r="26" className="g-screen" /><circle cx="100" cy="62" r="9" className="g-fill" /><circle cx="100" cy="62" r="3" className="g-dot" />
          {[0, 1, 2, 3].map((i) => <rect key={i} x={38 + i * 33} y="100" width="22" height="20" rx="3" className="g-screen" />)}
          <rect x="150" y="82" width="18" height="8" rx="2" className="g-dot" />
        </g>
      )
    case 'psx':
      // console bassa e larga con calotta a vassoio e due fessure frontali
      return (
        <g>
          <rect x="12" y="62" width="176" height="72" rx="8" className="g-fill" />
          <path d="M40 62 L56 30 H144 L160 62 Z" className="g-fill" />
          <circle cx="100" cy="46" r="11" className="g-screen" />
          <rect x="30" y="92" width="52" height="14" rx="3" className="g-screen" />
          <rect x="94" y="92" width="52" height="14" rx="3" className="g-screen" />
          <circle cx="164" cy="82" r="6" className="g-dot" /><circle cx="164" cy="104" r="6" className="g-dot" />
          <line x1="30" y1="122" x2="170" y2="122" className="g-line" />
        </g>
      )
    case 'naomi':
      // scheda di gioco: circuito con chip e connettore a pettine
      return (
        <g>
          <rect x="14" y="20" width="172" height="112" rx="6" className="g-fill" />
          <rect x="30" y="34" width="46" height="40" className="g-screen" /><rect x="88" y="34" width="30" height="30" className="g-screen" />
          <rect x="130" y="34" width="40" height="22" className="g-screen" />
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={30 + i * 11} y="84" width="7" height="20" className="g-dot" />)}
          <path d="M96 76 H170 V104 H132" className="g-line" fill="none" />
          {Array.from({ length: 15 }, (_, i) => <rect key={i} x={22 + i * 11} y="138" width="6" height="16" className="g-dot" />)}
        </g>
      )
    case 'atomiswave':
      // cartuccia grande con impugnatura a nervature e finestra sulla scheda
      return (
        <g>
          <rect x="18" y="18" width="164" height="124" rx="10" className="g-fill" />
          <rect x="30" y="30" width="140" height="22" className="g-screen" />
          {Array.from({ length: 12 }, (_, i) => <line key={i} x1={36 + i * 11} y1="62" x2={36 + i * 11} y2="86" className="g-line" />)}
          <rect x="40" y="96" width="120" height="34" rx="4" className="g-screen" />
          <circle cx="58" cy="113" r="6" className="g-dot" /><rect x="76" y="108" width="68" height="10" className="g-dot" />
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
