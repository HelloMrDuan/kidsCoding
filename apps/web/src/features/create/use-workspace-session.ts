'use client'

import { useEffect, useRef, useState } from 'react'

/** Editor entry and exit use document links. The native dialog covers browser
 * history, reload and close, including navigation initiated outside React. */
export function useWorkspaceSession(owner: string, dirty: boolean) {
  const [locked, setLocked] = useState(false)
  const changed = useRef(dirty)
  changed.current = dirty

  useEffect(() => {
    if (!dirty) return
    function confirmLeave(event: BeforeUnloadEvent) {
      if (!changed.current) return
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', confirmLeave)
    return () => window.removeEventListener('beforeunload', confirmLeave)
  }, [dirty])

  useEffect(() => {
    let sequence = 0
    async function validate() {
      const token = ++sequence
      try {
        const response = await fetch('/create/session', { cache: 'no-store' })
        if (!response.ok) throw new Error('session')
        const result: { owner: string | null } = await response.json()
        if (token === sequence) setLocked(result.owner !== owner)
      } catch {
        if (token === sequence) setLocked(true)
      }
    }
    function restored(event: PageTransitionEvent) { if (event.persisted) void validate() }
    function focused() { void validate() }
    window.addEventListener('pageshow', restored)
    window.addEventListener('focus', focused)
    return () => {
      ++sequence
      window.removeEventListener('pageshow', restored)
      window.removeEventListener('focus', focused)
    }
  }, [owner])

  return locked
}
