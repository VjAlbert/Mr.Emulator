import { useSyncExternalStore } from 'react'
import { EN } from './en'

export type Lang = 'it' | 'en'
export type LangSetting = 'auto' | Lang

/** Lingua del sistema: italiano se il sistema è in italiano, altrimenti inglese */
export const detectLang = (): Lang => {
  try {
    return navigator.language?.toLowerCase().startsWith('it') ? 'it' : 'en'
  } catch {
    return 'en'
  }
}

let lang: Lang = detectLang()
let version = 0
const listeners = new Set<() => void>()

export function setLang(setting: LangSetting): void {
  const next = setting === 'auto' ? detectLang() : setting
  if (next === lang) return
  lang = next
  version++
  document.documentElement.lang = next
  listeners.forEach((l) => l())
}

export const getLang = (): Lang => lang

/**
 * Traduce una frase. La chiave è il testo in italiano (la lingua originale del programma):
 * in italiano si mostra così com'è, in inglese si cerca nel dizionario (e se manca resta in italiano).
 * Si possono usare segnaposto: t('{n} giochi', { n: 5 }).
 */
export function t(it: string, vars?: Record<string, string | number>): string {
  let s = lang === 'en' ? (EN[it] ?? it) : it
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v))
  return s
}

/** Fa ridisegnare l'interfaccia quando cambia la lingua */
export function useLangVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => version
  )
}

/** Data e ora brevi nella lingua scelta (per le date dei salvataggi) */
export function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ')
  }
}
