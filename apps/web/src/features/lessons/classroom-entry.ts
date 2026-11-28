import {
  readGuestProgress,
} from '@/features/progress/local-progress'

import { launchLessonHref } from './launch-lesson-routes'
import {
  claimLegacyDrafts,
  isGuestOwner,
  isKnownOwner,
  legacyDraftClaimable,
  readLegacyDraftClaim,
} from './legacy-draft-claim'
import { scopedLessonDraftKey } from './scoped-draft-key'

/**
 * Learning-record → classroom route resolution (owner-isolated).
 *
 * OPS-052: the global 「编程课堂」 menu that used to consume this was removed;
 * the app shell no longer imports it. The resolver and its owner-isolation
 * tests are kept unchanged (no other behaviour depends on removing them) so a
 * later task can reuse or retire them explicitly.
 *
 * The classroom entry must never be a second, parallel classroom: it reuses the
 * exact route the course system uses for the same lesson.
 * - launch lessons keep their id and draft archive and resolve through
 *   `launchLessonHref`: lesson-01 → its V3 studio workspace, lesson-02…12 →
 *   the shared V3 launch studio `/studio/blockly/launch/<id>` (OPS-056);
 * - catalog lessons use the same `trialRoute` the catalog card links to;
 * - no learning record → the course picker (课程体系), never the demo lesson.
 *
 * Route resolution is lazy (`import()`): the maturity registry pulls the whole
 * catalog content graph, and the global app shell must not ship it to every
 * page. It is only loaded once a learning record exists.
 */

export const COURSE_PICKER_HREF = '/learn/catalog'

/** Envelope keys written by LessonWorkspace (scoped) and legacy classrooms. */
const DRAFT_MARKER = 'kidscoding-draft:'

export type LearningRecord = {
  lessonId: string
}

/**
 * Owner strings come from the one existing identity source,
 * `currentLessonDraftOwner()`: `user:<supabase id>` for a signed-in account,
 * `guest:<kc_guest_id>` or `guest` for the browser guest. Anything else is
 * an unknown identity and reads nothing (the nav falls back to the course
 * picker). The owner helpers and the legacy claim policy live in
 * `legacy-draft-claim.ts` so every legacy-draft reader shares them.
 */
export { isGuestOwner }

function hasProgressActivity(value: unknown): value is { currentLessonId: string } {
  if (!value || typeof value !== 'object') return false
  const progress = value as Record<string, unknown>
  if (typeof progress.currentLessonId !== 'string' || !progress.currentLessonId) return false
  const lists = ['completedLessonIds', 'completedProjectIds', 'projectSnapshots']
  return lists.some((key) => {
    const list = progress[key]
    return Array.isArray(list) && list.length > 0
  })
}

/*
 * Legacy unscoped drafts (`kidscoding-draft:<lessonId>`) predate owner
 * isolation. They stay readable for compatibility, but only for their
 * claimant — the shared policy in `legacy-draft-claim.ts` (same as
 * `kc-progress`).
 */

function lessonIdFromDraftKey(key: string, owner: string, legacyReadable: boolean): string | null {
  if (key.startsWith('kids-lesson-owner-v1:')) {
    // Another account's (or another guest's) drafts are never this child's
    // record, even when they live in the same browser localStorage.
    if (!key.startsWith(scopedLessonDraftKey(owner, ''))) return null
  } else if (!legacyReadable) {
    return null
  }
  const markerIndex = key.lastIndexOf(DRAFT_MARKER)
  if (markerIndex < 0) return null
  const lessonId = key.slice(markerIndex + DRAFT_MARKER.length)
  // Lesson ids never contain a colon; a trailing segment keeps the key valid.
  return lessonId && !lessonId.includes(':') ? lessonId : null
}

function savedAtOf(raw: string | null): number {
  if (!raw) return 0
  try {
    const parsed = JSON.parse(raw) as { savedAt?: unknown }
    if (typeof parsed.savedAt === 'string') {
      const time = Date.parse(parsed.savedAt)
      return Number.isFinite(time) ? time : 0
    }
  } catch {
    // A corrupt draft is still evidence the lesson was opened; savedAt 0
    // lets a valid draft win, but an only-draft record still counts.
  }
  return 0
}

/**
 * The child's own learning record, scoped to the resolved owner.
 *
 * Isolation rules (PR #573 review):
 * - an unknown owner reads nothing, so 编程课堂 falls back to the picker;
 * - progress comes from the owner-scoped store (`readGuestProgress(owner)`):
 *   `kc-progress` belongs to the browser guest that claimed it, never to a
 *   signed-in account and never to a different guest id in the same browser;
 * - only this owner's scoped drafts count; legacy unscoped drafts are
 *   readable only by the guest that claimed them, so guest:A → guest:B in
 *   one browser never exposes A's old drafts to B. Claims never delete the
 *   historical draft keys.
 */
export function readLearningRecord(owner?: string | null): LearningRecord | null {
  if (typeof window === 'undefined') return null
  if (!isKnownOwner(owner)) return null

  // The scoped store also handles the legacy claim for its claimant, so a
  // guest:B's own completion (scoped key only) is still found here.
  const progress = readGuestProgress(owner)
  if (hasProgressActivity(progress)) {
    return { lessonId: progress.currentLessonId }
  }

  const legacyReadable =
    isGuestOwner(owner) && legacyDraftClaimable(owner, readLegacyDraftClaim())
  const latest = new Map<string, number>()
  let sawLegacyDraft = false
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      const lessonId = lessonIdFromDraftKey(key, owner, legacyReadable)
      if (!lessonId) continue
      if (!key.startsWith('kids-lesson-owner-v1:')) sawLegacyDraft = true
      const savedAt = savedAtOf(window.localStorage.getItem(key))
      latest.set(lessonId, Math.max(latest.get(lessonId) ?? 0, savedAt))
    }
  } catch {
    return null
  }

  // Claim before returning: a readable legacy draft becomes this guest's,
  // and the next guest in this browser no longer sees it.
  if (sawLegacyDraft) claimLegacyDrafts(owner)

  let best: LearningRecord | null = null
  let bestTime = -1
  for (const [lessonId, savedAt] of latest) {
    if (savedAt > bestTime) {
      best = { lessonId }
      bestTime = savedAt
    }
  }
  return best
}

/**
 * One resolver for every classroom entry. Launch lessons resolve through
 * `launchLessonHref` (lesson-01 → its V3 workspace; lesson-02…12 → the shared
 * V3 launch studio `/studio/blockly/launch/<id>`); catalog lessons return the catalog's `trialRoute`
 * (the same page and engine the 课程体系 card opens), or the course detail
 * page when no trial runner exists. Unknown ids fail closed to the picker.
 */
export async function resolveLessonHref(lessonId: string): Promise<string> {
  const { launchLessons } = await import('@/content/curriculum/launch-lessons')
  if (launchLessons.some((lesson) => lesson.id === lessonId)) {
    return launchLessonHref(lessonId)
  }

  const { getLessonMaturity } = await import('@/features/curriculum/lesson-maturity')
  const maturity = getLessonMaturity(lessonId)
  if (!maturity) return COURSE_PICKER_HREF
  return maturity.trialRoute ?? `/learn/catalog/${lessonId}`
}

/**
 * One resolver for every classroom entry, for the current owner only.
 * Unknown identity fails closed to the picker before any storage read.
 */
export async function resolveClassroomHref(owner?: string | null): Promise<string> {
  if (!isKnownOwner(owner)) return COURSE_PICKER_HREF
  const record = readLearningRecord(owner)
  if (!record) return COURSE_PICKER_HREF
  return resolveLessonHref(record.lessonId)
}
