'use client'

import { useEffect } from 'react'

/**
 * Restores a page's scroll position when the learner comes BACK to it
 * through a full document load (browser Back / Forward).
 *
 * Why the browser alone is not enough: lesson cards are real <a>
 * links (UX-003), so leaving the map is a full document navigation
 * and Back re-loads the map document. The map's pre-hydration markup
 * is rendered from the default (empty) guest progress; the real
 * progress only arrives from localStorage after hydration. The two
 * layouts can differ in height (e.g. the "next lesson" goal wraps to
 * a different number of lines), and the browser restores the saved
 * scroll offset against the shorter pre-hydration document, clamping
 * it. The learner then lands a few rows above where they left.
 *
 * This hook remembers the offset when the page is left and, on a
 * back/forward document load, re-applies it once the hydrated
 * document is tall enough. It never scrolls on a normal navigation,
 * stops as soon as the learner scrolls/touches/types, and gives up
 * after a short window so it can never fight the learner.
 */

const STORAGE_PREFIX = 'kc-scroll-restore:'
const RESTORE_WINDOW_MS = 1500

// One restore per document load: a later client-side visit to the same
// page within this document must not re-apply an old offset, even
// though the document's navigation entry still says back_forward.
const consumedKeys = new Set<string>()

export function backScrollStorageKey(key: string) {
  return `${STORAGE_PREFIX}${key}`
}

function isBackForwardDocumentLoad() {
  if (typeof performance === 'undefined' || !performance.getEntriesByType) {
    return false
  }
  const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
  return entry?.type === 'back_forward'
}

function readSavedOffset(storageKey: string): number | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

function saveOffset(storageKey: string) {
  try {
    window.sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)))
  } catch {
    // sessionStorage unavailable (private mode quota etc.): the browser's
    // own restoration still applies; nothing else to do.
  }
}

export function useBackScrollRestore(key: string) {
  useEffect(() => {
    const storageKey = backScrollStorageKey(key)
    const save = () => saveOffset(storageKey)
    window.addEventListener('pagehide', save)

    let frame = 0
    let restoring = false
    const interactionEvents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const
    const detach = () => {
      cancelAnimationFrame(frame)
      for (const type of interactionEvents) {
        window.removeEventListener(type, finishRestore)
      }
    }
    // Ends the restore for this document load (reached, timed out, or the
    // learner took over). Only a finished restore is consumed, so React
    // Strict Mode's mount/unmount/mount still restores on the second mount.
    function finishRestore() {
      restoring = false
      consumedKeys.add(storageKey)
      detach()
    }

    const target =
      !consumedKeys.has(storageKey) && isBackForwardDocumentLoad()
        ? readSavedOffset(storageKey)
        : null

    if (target === null) {
      consumedKeys.add(storageKey)
    } else {
      restoring = true
      const startedAt = performance.now()
      for (const type of interactionEvents) {
        window.addEventListener(type, finishRestore, { passive: true })
      }
      const step = () => {
        const maxScroll =
          document.documentElement.scrollHeight - window.innerHeight
        if (maxScroll >= target) {
          if (Math.round(window.scrollY) !== target) window.scrollTo(0, target)
          finishRestore()
          return
        }
        if (performance.now() - startedAt > RESTORE_WINDOW_MS) {
          finishRestore()
          return
        }
        frame = requestAnimationFrame(step)
      }
      step()
    }

    return () => {
      window.removeEventListener('pagehide', save)
      if (restoring) {
        // Unmounted mid-restore (Strict Mode re-mount): keep the saved
        // offset untouched and let the next mount finish the restore.
        detach()
        return
      }
      // Client-side navigation away (Next <Link>) fires no pagehide.
      save()
    }
  }, [key])
}
