/** Controllo delle nuove versioni: una sola richiesta a GitHub (l'ultima release), niente altro viene inviato */
export interface UpdateInfo {
  version: string
  url: string
}

const REPO = 'VjAlbert/Mr.Emulator'

/** Confronto tra versioni "0.1.10" e "0.1.9": numero per numero */
export function isNewer(candidate: string, current: string): boolean {
  const parse = (v: string): number[] => v.replace(/^v/i, '').split('-')[0].split('.').map((x) => Number.parseInt(x, 10) || 0)
  const a = parse(candidate)
  const b = parse(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (d !== 0) return d > 0
  }
  return false
}

/** Dice se c'è una release più recente di quella installata (null se no, o se non si riesce a controllare) */
export async function checkForUpdate(current: string, fetchFn: typeof fetch = fetch): Promise<UpdateInfo | null> {
  try {
    const res = await fetchFn(`https://api.github.com/repos/${REPO}/releases/latest`, {
      signal: AbortSignal.timeout(15000),
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Mr-Emulator' }
    })
    if (!res.ok) return null
    const j = (await res.json()) as { tag_name?: string; html_url?: string; draft?: boolean; prerelease?: boolean }
    if (!j.tag_name || j.draft || j.prerelease) return null
    const url = typeof j.html_url === 'string' && j.html_url.startsWith(`https://github.com/${REPO}/`) ? j.html_url : `https://github.com/${REPO}/releases/latest`
    return isNewer(j.tag_name, current) ? { version: j.tag_name.replace(/^v/i, ''), url } : null
  } catch {
    return null
  }
}
