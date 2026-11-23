'use client'

import { useSyncExternalStore } from 'react'

import { useResolvedDraftOwner } from '@/features/lessons/use-resolved-draft-owner'

import {
  defaultGuestProgress,
  readGuestProgress,
  subscribeGuestProgress,
  type GuestProgress,
} from './local-progress'

/**
 * Owner-scoped progress for product surfaces (home / learning map).
 *
 * PR #573 review P1-2: these pages used to call `readGuestProgress()` with no
 * owner, which returns the shared legacy `kc-progress` envelope to whoever
 * opens the browser — after an A → B switch, B could see and click into A's
 * recorded lesson. This hook reads through the one identity source
 * (`/api/lesson-draft-owner` or the server-resolved boundary), and until the
 * owner is confirmed it fails closed to the empty default rather than reading
 * the browser-wide envelope.
 *
 * Reads stay reactive: completion writes dispatch the same change event and
 * cross-tab `storage` events, so home/map keep up when a lesson completes.
 */
export function useOwnerProgress(): {
  owner: string | null
  progress: GuestProgress
} {
  const owner = useResolvedDraftOwner()
  const progress = useSyncExternalStore(
    subscribeGuestProgress,
    () => (owner === null ? defaultGuestProgress : readGuestProgress(owner)),
    () => defaultGuestProgress,
  )
  return { owner, progress }
}
