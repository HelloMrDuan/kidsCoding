import { LESSON_DRAFT_OWNER_STORAGE_KEY } from './scoped-draft-key'

/**
 * Shared claim policy for ownerless lesson drafts written before owner
 * isolation existed (`kidscoding-draft:<lessonId>` from the launch classrooms
 * and `kids-grid-lesson-v1:<lessonId>` from the old G0-U1 grid classroom).
 *
 * This is the policy already reviewed for the classroom entry (PR #573),
 * extracted unchanged so every reader applies the same rules:
 * - unstamped drafts are claimed by the first confirmed guest that reads them;
 * - a bare `guest` claim (pre-cookie) is adopted by the concrete `guest:<id>`;
 * - a concrete claim belongs to that guest only;
 * - a signed-in account (`user:<id>`) never inherits browser-guest drafts;
 * - an unknown / missing owner reads nothing.
 * Claiming only writes the stamp; historical draft keys are never deleted,
 * rewritten or copied.
 *
 * Owner strings come from the one existing identity source,
 * `currentLessonDraftOwner()`.
 */

export function isGuestOwner(owner: string): boolean {
  return owner === 'guest' || owner.startsWith('guest:')
}

export function isUserOwner(owner: string): boolean {
  return owner.startsWith('user:')
}

export function isKnownOwner(owner: string | null | undefined): owner is string {
  return typeof owner === 'string' && (isGuestOwner(owner) || isUserOwner(owner))
}

export function legacyDraftClaimable(owner: string, stamped: string | null): boolean {
  if (!isGuestOwner(owner)) return false
  if (!stamped) return true
  if (stamped === owner) return true
  return stamped === 'guest' && owner.startsWith('guest:')
}

export function readLegacyDraftClaim(): string | null {
  try {
    return window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)
  } catch {
    return null
  }
}

/** True when `owner` may read the ownerless legacy drafts in this browser. */
export function canReadLegacyDrafts(owner: string | null | undefined): owner is string {
  if (typeof window === 'undefined') return false
  if (!isKnownOwner(owner)) return false
  return legacyDraftClaimable(owner, readLegacyDraftClaim())
}

export function claimLegacyDrafts(owner: string) {
  if (!isGuestOwner(owner)) return
  try {
    const stamped = window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)
    if (!stamped || stamped === 'guest' || stamped === owner) {
      window.localStorage.setItem(LESSON_DRAFT_OWNER_STORAGE_KEY, owner)
    }
  } catch {
    // Storage unavailable: the read stays a read-only best effort.
  }
}
