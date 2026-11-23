'use client'

import { useContext, useEffect, useState } from 'react'

import { LessonDraftOwnerContext } from './lesson-draft-boundary'

/**
 * Resolve the draft/progress owner for client-only routes.
 *
 * Pages already wrapped by `LessonDraftBoundary` get the server-resolved
 * owner synchronously from context, so the first render is deterministic and
 * no request is made. Client-only routes (the legacy classroom, the studio
 * G0 route, the completion page) fetch the same source the global nav uses
 * (`/api/lesson-draft-owner`, which reads the httpOnly guest cookie / Supabase
 * session). Until it resolves the owner is `null`, and every storage read or
 * write fails closed instead of touching another owner's data.
 *
 * Identity is re-checked on focus/pageshow/visibility/storage so an account
 * switch in another tab cannot keep writing under the previous owner.
 */
export function useResolvedDraftOwner(): string | null {
  const contextOwner = useContext(LessonDraftOwnerContext)
  const [fetchedOwner, setFetchedOwner] = useState<string | null>(null)

  useEffect(() => {
    if (contextOwner !== undefined) return
    let active = true
    let request = 0
    const sync = async () => {
      const token = ++request
      let owner: string | null = null
      try {
        const response = await fetch('/api/lesson-draft-owner', { cache: 'no-store' })
        if (response.ok) {
          const body = (await response.json()) as { owner?: unknown }
          owner = typeof body.owner === 'string' ? body.owner : null
        }
      } catch {
        // The owner cannot be confirmed: keep failing closed.
      }
      if (active && token === request) setFetchedOwner(owner)
    }
    void sync()
    const resync = () => {
      void sync()
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void sync()
    }
    window.addEventListener('focus', resync)
    window.addEventListener('pageshow', resync)
    window.addEventListener('storage', resync)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      request += 1
      window.removeEventListener('focus', resync)
      window.removeEventListener('pageshow', resync)
      window.removeEventListener('storage', resync)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [contextOwner])

  return contextOwner !== undefined ? contextOwner : fetchedOwner
}
