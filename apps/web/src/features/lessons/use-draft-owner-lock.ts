'use client'

import { useEffect, useState } from 'react'

export function useDraftOwnerLock(owner?: string | null) {
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!owner) return
    let request = 0
    async function verify() {
      const token = ++request
      let current: unknown = null
      try {
        const response = await fetch('/api/lesson-draft-owner', { cache: 'no-store' })
        if (response.ok) current = (await response.json()).owner
      } catch { /* Account cannot be confirmed. */ }
      if (token === request) setLocked(current !== owner)
    }
    function verifyVisible() {
      if (document.visibilityState === 'visible') void verify()
    }
    function authStorage(event: StorageEvent) {
      if (event.key === null || /^sb-.*-auth-token$/.test(event.key)) void verify()
    }
    window.addEventListener('pageshow', verify)
    window.addEventListener('focus', verify)
    window.addEventListener('storage', authStorage)
    document.addEventListener('visibilitychange', verifyVisible)
    return () => {
      ++request
      window.removeEventListener('pageshow', verify)
      window.removeEventListener('focus', verify)
      window.removeEventListener('storage', authStorage)
      document.removeEventListener('visibilitychange', verifyVisible)
    }
  }, [owner])

  return owner === null || locked
}
