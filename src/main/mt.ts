import { app } from 'electron'
import { EN_MAIN } from './en-main'

type Lang = 'it' | 'en'
let lang: Lang = 'it'

/** Lingua dei messaggi del programma interno ('auto' = quella del sistema, come nell'interfaccia) */
export function setMainLang(setting: string | undefined): void {
  if (setting === 'it' || setting === 'en') lang = setting
  else {
    let loc = ''
    try {
      loc = app.getLocale()
    } catch {
      // fuori da Electron (test)
    }
    lang = loc.toLowerCase().startsWith('it') ? 'it' : 'en'
  }
}

export const numLocale = (): string => (lang === 'it' ? 'it' : 'en')

/** Messaggio per l'utente: il testo è in italiano, in inglese si cerca nel dizionario; {nome} si sostituisce con i valori */
export function mt(it: string, vars?: Record<string, string | number>): string {
  const text = lang === 'en' ? (EN_MAIN[it] ?? it) : it
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text
}
