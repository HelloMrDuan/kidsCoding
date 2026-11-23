import type { SnapshotBlock } from './project-snapshot'

export const GUEST_PROGRESS_STORAGE_KEY = 'kc-progress'
/**
 * `kc-progress` is browser-global, so it carries a claimant stamp: the
 * confirmed guest identity that first read it (`guest:<kc_guest_id>`, or the
 * bare `guest` before the id cookie is minted).
 *
 * Owner-scoped writes (PR #573 review, P1-2):
 * - every resolved owner writes its own `kids-progress-owner-v1:<owner>:kc-progress`;
 *   guest:B's completion therefore can never overwrite guest:A's envelope;
 * - the legacy browser-global envelope is only the migration source for its
 *   claimant (the same stamp every reader checks);
 * - a concrete guest that claims the stamp also mirrors its own writes to the
 *   legacy key, so the old read path keeps working for that claimant only.
 * Reads never delete another guest's progress (fail closed, not destroy).
 */
export const GUEST_PROGRESS_OWNER_STORAGE_KEY = 'kc-progress-owner-v1'
const OWNER_SCOPED_PREFIX = 'kids-progress-owner-v1:'
const CHANGE_EVENT = 'kc-progress-change'

export type GuestProgress = {
  completedLessonIds: string[]
  currentLessonId: string
  stars: number
  badgeIds: string[]
  cardIds: string[]
  streakDays: number
  completedProjectIds: string[]
  projectSnapshots: Array<{
    lessonId: string
    updatedAt: string
    /** TQ-012: say blocks may carry the chosen preset `line`; older entries have `type` only. */
    blocks: SnapshotBlock[]
  }>
}

export const defaultGuestProgress: GuestProgress = {
  completedLessonIds: [],
  currentLessonId: 'lesson-01-forest-hello',
  stars: 0,
  badgeIds: [],
  cardIds: [],
  streakDays: 1,
  completedProjectIds: [],
  projectSnapshots: [],
}

/** The owner-scoped envelope key. Never the browser-global legacy key. */
export function progressStorageKeyFor(owner: string): string {
  return `${OWNER_SCOPED_PREFIX}${encodeURIComponent(owner)}:${GUEST_PROGRESS_STORAGE_KEY}`
}

function isGuestProgressOwner(owner: string): boolean {
  return owner === 'guest' || owner.startsWith('guest:')
}

function isKnownProgressOwner(owner: string | null | undefined): owner is string {
  return typeof owner === 'string' && (isGuestProgressOwner(owner) || owner.startsWith('user:'))
}

type EnvelopeCacheEntry = { raw: string | null; snapshot: GuestProgress }

/**
 * One cache per storage key: `useSyncExternalStore` requires a stable
 * snapshot between renders, and A's scoped read must not poison B's read.
 */
const envelopeCache = new Map<string, EnvelopeCacheEntry>()

function readEnvelope(key: string): GuestProgress | null {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(key)
  } catch {
    return null
  }

  const cached = envelopeCache.get(key)
  if (cached && cached.raw === raw) {
    return raw === null ? null : cached.snapshot
  }

  if (raw === null) {
    envelopeCache.set(key, { raw: null, snapshot: defaultGuestProgress })
    return null
  }

  try {
    const snapshot = { ...defaultGuestProgress, ...(JSON.parse(raw) as Partial<GuestProgress>) } as GuestProgress
    envelopeCache.set(key, { raw, snapshot })
    return snapshot
  } catch {
    // OPS-046：损坏的进度键不得让读取抛错。损坏值不可恢复，丢弃它并
    // 回到默认进度（fail-closed，不伪造任何进度），避免同一损坏键在
    // 每次刷新后都再抛一次。损坏的 legacy 键同时释放认领戳，否则它的
    // 认领人会永远读到默认进度、且后续访客也无法认领这份历史数据。
    try {
      window.localStorage.removeItem(key)
      if (key === GUEST_PROGRESS_STORAGE_KEY) {
        window.localStorage.removeItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)
      }
    } catch {
      /* ignore */
    }
    envelopeCache.set(key, { raw: null, snapshot: defaultGuestProgress })
    return null
  }
}

function readClaimStamp(): string | null {
  try {
    return window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Policy (PR #573 review):
 * - unstamped legacy progress is claimed by the first confirmed guest that
 *   reads it; existing guest data therefore stays available;
 * - a stamp of the bare `guest` (written before the id cookie is minted on
 *   first sync) is adopted and rewritten by the concrete `guest:<id>`;
 * - a concrete `guest:<id>` stamp is readable only by that same id, so
 *   guest:A → guest:B in one browser reads nothing of A's;
 * - the bare `guest` never reads a concrete guest's claimed envelope, and a
 *   user-stamped envelope is never guest data. Unknown ≠ adoptable.
 */
function legacyEnvelopeClaimable(owner: string, stamped: string | null = readClaimStamp()): boolean {
  if (!isGuestProgressOwner(owner)) return false
  if (!stamped) return true
  if (stamped === owner) return true
  return stamped === 'guest' && owner.startsWith('guest:')
}

function claimLegacyEnvelope(owner: string) {
  try {
    const stamped = readClaimStamp()
    if (!stamped || stamped === 'guest' || stamped === owner) {
      window.localStorage.setItem(GUEST_PROGRESS_OWNER_STORAGE_KEY, owner)
    }
  } catch {
    // Storage unavailable: the read stays a read-only best effort.
  }
}

function writeEnvelope(key: string, next: GuestProgress) {
  const raw = JSON.stringify(next)
  // The write itself may throw (quota): callers must see that before any
  // cache/event claims success.
  window.localStorage.setItem(key, raw)
  envelopeCache.set(key, { raw, snapshot: next })
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

function removeEnvelope(key: string) {
  try {
    window.localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
  envelopeCache.delete(key)
}

/**
 * The child's progress for the resolved owner.
 *
 * - `owner === undefined` keeps the historical browser-global read for
 *   callers that have not resolved identity yet (tests and compatibility).
 * - `owner === null` / unknown fails closed to the default progress.
 * - a resolved owner reads its own scoped envelope first; only its claimant
 *   may fall back to the legacy browser-global envelope.
 * - signed-in accounts never inherit the browser guest's progress.
 */
export function readGuestProgress(owner?: string | null): GuestProgress {
  if (typeof window === 'undefined') {
    return defaultGuestProgress
  }

  if (owner === undefined) {
    return readEnvelope(GUEST_PROGRESS_STORAGE_KEY) ?? defaultGuestProgress
  }
  if (!isKnownProgressOwner(owner)) {
    return defaultGuestProgress
  }

  const scoped = readEnvelope(progressStorageKeyFor(owner))
  if (scoped) {
    return scoped
  }

  if (!isGuestProgressOwner(owner)) {
    return defaultGuestProgress
  }

  if (!legacyEnvelopeClaimable(owner)) {
    return defaultGuestProgress
  }

  const legacy = readEnvelope(GUEST_PROGRESS_STORAGE_KEY)
  if (!legacy) {
    return defaultGuestProgress
  }
  // Claim before returning: a readable envelope becomes this guest's.
  claimLegacyEnvelope(owner)
  return legacy
}

/**
 * Persist progress for the resolved owner.
 *
 * - `owner === undefined` writes the legacy browser-global envelope only.
 * - a resolved owner writes its own scoped key; two guests switching in one
 *   browser can never overwrite each other.
 * - an owner that is the legacy envelope's claimant also mirrors the write
 *   to `kc-progress` (old readers and compatibility fixtures keep working);
 *   mirror failures do not undo the real scoped save.
 * - an unresolved owner (`null`/unknown) refuses to write: silently writing
 *   the browser-global envelope would attribute this child's work to whoever
 *   claimed it before.
 */
export function writeGuestProgress(next: GuestProgress, owner?: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (owner === undefined) {
    writeEnvelope(GUEST_PROGRESS_STORAGE_KEY, next)
    return
  }
  if (!isKnownProgressOwner(owner)) {
    throw new Error('progress owner unavailable')
  }

  writeEnvelope(progressStorageKeyFor(owner), next)

  if (!isGuestProgressOwner(owner)) {
    return
  }
  // A guest's scoped write is already the authoritative save. Mirroring is
  // only allowed for the legacy envelope's claimant (never for guest:B).
  if (!legacyEnvelopeClaimable(owner)) {
    return
  }
  claimLegacyEnvelope(owner)
  try {
    writeEnvelope(GUEST_PROGRESS_STORAGE_KEY, next)
  } catch {
    // The scoped save above succeeded; the compatibility copy is best effort.
  }
}

export function clearGuestProgress(owner?: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (owner === undefined) {
    removeEnvelope(GUEST_PROGRESS_STORAGE_KEY)
    try {
      window.localStorage.removeItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
    return
  }

  if (!isKnownProgressOwner(owner)) {
    return
  }

  removeEnvelope(progressStorageKeyFor(owner))
  // Clearing the claimant's progress also clears the legacy copy it owned;
  // another guest's envelope is never touched.
  if (isGuestProgressOwner(owner) && readClaimStamp() === owner) {
    removeEnvelope(GUEST_PROGRESS_STORAGE_KEY)
    try {
      window.localStorage.removeItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function subscribeGuestProgress(onChange: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleChange = () => {
    onChange()
  }

  window.addEventListener('storage', handleChange)
  window.addEventListener(CHANGE_EVENT, handleChange)

  return () => {
    window.removeEventListener('storage', handleChange)
    window.removeEventListener(CHANGE_EVENT, handleChange)
  }
}
