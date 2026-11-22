import { GUEST_PROGRESS_STORAGE_KEY } from '@/features/progress/local-progress'

import { scopedLessonDraftKey } from './scoped-draft-key'

/**
 * Where the main-nav 「编程课堂」 entry points.
 *
 * The classroom entry must never be a second, parallel classroom: it reuses the
 * exact route the course system uses for the same lesson.
 * - launch lessons (lesson-01…lesson-12) keep their original classroom URL,
 *   id and draft archive;
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
 * picker).
 */
export function isGuestOwner(owner: string): boolean {
  return owner === 'guest' || owner.startsWith('guest:')
}

function isUserOwner(owner: string): boolean {
  return owner.startsWith('user:')
}

function isKnownOwner(owner: string | null | undefined): owner is string {
  return typeof owner === 'string' && (isGuestOwner(owner) || isUserOwner(owner))
}

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

function lessonIdFromDraftKey(key: string, owner: string): string | null {
  if (key.startsWith('kids-lesson-owner-v1:')) {
    // Another account's (or another guest's) drafts are never this child's
    // record, even when they live in the same browser localStorage.
    if (!key.startsWith(scopedLessonDraftKey(owner, ''))) return null
  } else if (!isGuestOwner(owner)) {
    // Legacy unscoped drafts predate owner isolation. They can only belong
    // to the browser guest; a signed-in account must not inherit them.
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
 * - `kc-progress` belongs to the browser guest, never to a signed-in
 *   account that happens to use the same browser;
 * - only this owner's scoped drafts count; legacy unscoped drafts are
 *   guest-only. Account A and account B can therefore share a browser
 *   without ever seeing each other's lesson or draft.
 */
export function readLearningRecord(owner?: string | null): LearningRecord | null {
  if (typeof window === 'undefined') return null
  if (!isKnownOwner(owner)) return null

  if (isGuestOwner(owner)) {
    try {
      const raw = window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY)
      if (raw) {
        const parsed: unknown = JSON.parse(raw)
        if (hasProgressActivity(parsed)) return { lessonId: parsed.currentLessonId }
      }
    } catch {
      // Corrupt progress: fall through to drafts instead of inventing a lesson.
    }
  }

  const latest = new Map<string, number>()
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue
      const lessonId = lessonIdFromDraftKey(key, owner)
      if (!lessonId) continue
      const savedAt = savedAtOf(window.localStorage.getItem(key))
      latest.set(lessonId, Math.max(latest.get(lessonId) ?? 0, savedAt))
    }
  } catch {
    return null
  }

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
 * One resolver for every classroom entry. Launch lessons keep their original
 * classroom URL; catalog lessons return the catalog's `trialRoute` (the same
 * page and engine the 课程体系 card opens), or the course detail page when no
 * trial runner exists. Unknown ids fail closed to the course picker.
 */
export async function resolveLessonHref(lessonId: string): Promise<string> {
  const { launchLessons } = await import('@/content/curriculum/launch-lessons')
  if (launchLessons.some((lesson) => lesson.id === lessonId)) {
    return `/learn/lesson/${lessonId}`
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
