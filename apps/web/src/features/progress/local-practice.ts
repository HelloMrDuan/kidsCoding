import { isMultiPythonLessonId, pythonPracticeLessons } from '@/features/python-lab/python-multi-grade'

export const PRACTICE_STORAGE_PREFIX = 'kids-python-local-practice-v1:'
const MAX_SOURCE_LENGTH = 5000

export type LocalPractice = {
  lessonId: keyof typeof pythonPracticeLessons
  title: string
  source: string
  passed: boolean
  savedAt: string
}

export function parseLocalPractice(lessonId: string, raw: string | null): LocalPractice | null {
  if (!isMultiPythonLessonId(lessonId) || !raw || raw.length > 18000) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const draft = value as Record<string, unknown>
    if (typeof draft.source !== 'string' || draft.source.length > MAX_SOURCE_LENGTH) return null
    if (typeof draft.savedAt !== 'string' || !Number.isFinite(Date.parse(draft.savedAt))) return null
    return {
      lessonId,
      title: pythonPracticeLessons[lessonId].title,
      source: draft.source,
      // This can be edited in browser storage. It is not an authenticated grade.
      passed: draft.passed === true,
      savedAt: draft.savedAt,
    }
  } catch {
    return null
  }
}

export function collectLocalPractices(storage: Pick<Storage, 'getItem'>): LocalPractice[] {
  return Object.keys(pythonPracticeLessons)
    .flatMap(id => {
      try {
        const item = parseLocalPractice(id, storage.getItem(PRACTICE_STORAGE_PREFIX + id))
        return item ? [item] : []
      } catch {
        return []
      }
    })
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
}
