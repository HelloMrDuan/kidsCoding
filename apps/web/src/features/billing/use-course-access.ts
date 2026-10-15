'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * UX-102 course-access hook. Single source of truth for the launch-pack
 * entitlement on the map page: GET /api/course-access (Supabase
 * entitlements, product launch-story-pack, status active). Same source
 * and same fail-closed default (false) as the lesson page, so the map
 * and the lesson page can never disagree about a lesson's access.
 *
 * - Fetches on mount and again on window focus / tab visible, so a
 *   purchase completed in another tab updates the map without a reload.
 * - Any failure (non-OK response, malformed payload, network error)
 *   resolves to false: course-phase lessons lock, trial lessons stay
 *   playable. No invented state, no crash, no silent open.
 */
async function fetchHasLaunchPack(): Promise<boolean> {
  try {
    const response = await fetch('/api/course-access')

    if (!response.ok) {
      return false
    }

    const payload = (await response.json()) as { hasLaunchPack?: unknown }
    return payload?.hasLaunchPack === true
  } catch {
    return false
  }
}

export function useCourseAccess() {
  const [hasLaunchPack, setHasLaunchPack] = useState(false)
  const mountedRef = useRef(true)

  const refresh = useCallback(() => {
    void fetchHasLaunchPack().then((value) => {
      if (mountedRef.current) {
        setHasLaunchPack(value)
      }
    })
  }, [])

  useEffect(() => {
    mountedRef.current = true
    // Same shape as the lesson page: state is set only inside the
    // async callback, never synchronously in the effect body.
    void fetchHasLaunchPack().then((value) => {
      if (mountedRef.current) {
        setHasLaunchPack(value)
      }
    })

    const handleVisible = () => {
      if (document.visibilityState === 'visible') {
        refresh()
      }
    }

    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      mountedRef.current = false
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', handleVisible)
    }
  }, [refresh])

  return { hasLaunchPack }
}
