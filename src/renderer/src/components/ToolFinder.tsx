import { useEffect, useState } from 'react'
import { t } from '../i18n'

interface Props {
  kind: 'retroarch' | 'mame'
  /** Percorso già indicato (se c'è, non si cerca da soli) */
  current: string
  onUse: (path: string) => void
}

/** Cerca RetroArch o MAME già presenti sul PC e rimanda al sito ufficiale: il programma non scarica né installa nulla */
export function ToolFinder({ kind, current, onUse }: Props): React.JSX.Element {
  const [found, setFound] = useState<string[] | null>(null)
  const search = (): void => {
    setFound(null)
    window.mr.detectTool(kind).then(setFound, () => setFound([]))
  }
  useEffect(() => {
    if (!current) search()
  }, [kind]) // eslint-disable-line react-hooks/exhaustive-deps
  const list = (found ?? []).filter((p) => p !== current)
  return (
    <div className="toolfinder">
      <div className="field-row">
        <button className="chip" onClick={() => window.mr.openToolSite(kind)}>{kind === 'mame' ? t('🌐 SITO UFFICIALE DI MAME') : t('🌐 SITO UFFICIALE DI RETROARCH')}</button>
        <button className="chip" onClick={search}>{t('🔎 CERCA SUL PC')}</button>
      </div>
      {found !== null && list.length === 0 && !current && <p className="hint">{t('Non l\'ho trovato nei posti comuni: scaricalo dal sito ufficiale, oppure usa SFOGLIA se è in un\'altra cartella.')}</p>}
      {list.map((p) => (
        <div key={p} className="field-row">
          <span className="persys-st">{t('Trovato: {p}', { p })}</span>
          <button className="chip on" onClick={() => onUse(p)}>{t('USA QUESTO')}</button>
        </div>
      ))}
      {kind === 'mame' && <p className="hint">{t('Importante: la versione di MAME deve essere compatibile con le tue ROM. I set di ROM valgono solo per la versione di MAME con cui sono stati creati (per esempio un set 0.229 richiede MAME 0.229). Se hai già i giochi, scarica la versione giusta dalla pagina delle release.')}</p>}
    </div>
  )
}
