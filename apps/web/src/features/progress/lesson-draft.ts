const STORAGE_PREFIX = 'kc-lesson-draft'
const SCHEMA_VERSION = 1

export type LessonDraft = {
  schemaVersion: number
  lessonId: string
  stepIndex: number
  blocks: Array<{ type: string }>
  updatedAt: string
}

export function buildLessonDraftKey(lessonId: string, stepIndex: number): string {
  return `${STORAGE_PREFIX}:${lessonId}:${stepIndex}`
}

function hasStorage(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    return Boolean(window.sessionStorage)
  } catch {
    return false
  }
}

export function loadLessonDraft(
  lessonId: string,
  stepIndex: number,
): LessonDraft | null {
  if (!hasStorage()) {
    return null
  }

  let raw: string | null
  try {
    raw = window.sessionStorage.getItem(buildLessonDraftKey(lessonId, stepIndex))
  } catch {
    return null
  }

  if (!raw) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }

  if (!isLessonDraft(parsed)) {
    return null
  }

  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return null
  }

  if (parsed.lessonId !== lessonId || parsed.stepIndex !== stepIndex) {
    return null
  }

  return parsed
}

function isLessonDraft(value: unknown): value is LessonDraft {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<LessonDraft>

  return (
    typeof candidate.schemaVersion === 'number' &&
    typeof candidate.lessonId === 'string' &&
    typeof candidate.stepIndex === 'number' &&
    Array.isArray(candidate.blocks) &&
    typeof candidate.updatedAt === 'string'
  )
}

export function saveLessonDraft(
  lessonId: string,
  stepIndex: number,
  blocks: Array<{ type: string }>,
): boolean {
  if (!hasStorage()) {
    return false
  }

  const draft: LessonDraft = {
    schemaVersion: SCHEMA_VERSION,
    lessonId,
    stepIndex,
    blocks,
    updatedAt: new Date().toISOString(),
  }

  try {
    window.sessionStorage.setItem(
      buildLessonDraftKey(lessonId, stepIndex),
      JSON.stringify(draft),
    )
    return true
  } catch {
    // Quota or serialization errors: the caller must surface this instead of
    // pretending the draft was saved.
    return false
  }
}

/**
 * Furthest step that still has a valid saved draft for this lesson, or null
 * when no step draft exists. Used to resume the child at their real last
 * step instead of always restarting at step 0. Corrupt or foreign entries
 * are ignored.
 */
export function readLastLessonStep(lessonId: string): number | null {
  if (!hasStorage()) {
    return null
  }

  const prefix = `${STORAGE_PREFIX}:${lessonId}:`
  let lastStep: number | null = null

  try {
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (!key || !key.startsWith(prefix)) {
        continue
      }

      const stepText = key.slice(prefix.length)
      const stepIndex = Number(stepText)
      if (!Number.isInteger(stepIndex) || stepIndex < 0) {
        continue
      }

      if (!loadLessonDraft(lessonId, stepIndex)) {
        continue
      }

      if (lastStep === null || stepIndex > lastStep) {
        lastStep = stepIndex
      }
    }
  } catch {
    return lastStep
  }

  return lastStep
}

export function clearLessonDraft(lessonId: string, stepIndex: number): void {
  if (!hasStorage()) {
    return
  }

  try {
    window.sessionStorage.removeItem(buildLessonDraftKey(lessonId, stepIndex))
  } catch {
    /* ignore */
  }
}

export function clearLessonDraftsForLesson(lessonId: string): void {
  if (!hasStorage()) {
    return
  }

  const prefix = `${STORAGE_PREFIX}:${lessonId}:`

  const keysToRemove: string[] = []
  try {
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
  } catch {
    return
  }

  keysToRemove.forEach((key) => {
    try {
      window.sessionStorage.removeItem(key)
    } catch {
      /* ignore */
    }
  })
}
