export function scratchGuiUrl(raw?: string): URL | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const loopback = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return null
    if (url.username || url.password) return null
    if (typeof location !== 'undefined' && location.origin === url.origin) return null
    return url
  } catch {
    return null
  }
}
