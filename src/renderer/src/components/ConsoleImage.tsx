import { useConsolePhoto } from '../consoleArt'
import { CONSOLES, SVG_FOR } from './consoleSvgs'
import SystemArt from './SystemArt'

/** Immagine di un sistema: la foto messa dall'utente (in stile fumetto), altrimenti l'illustrazione, altrimenti il simbolo */
export default function ConsoleImage({ id, color, className = '' }: { id: string; color: string; className?: string }): React.JSX.Element {
  const photo = useConsolePhoto(id)
  if (photo) return <img className={`conimg ${className}`} src={photo} alt="" draggable={false} />
  const svg = SVG_FOR[id]
  if (svg) return <div className={`conimg conart ${className}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: CONSOLES[svg](color) }} />
  return <SystemArt id={id} className={className} />
}
