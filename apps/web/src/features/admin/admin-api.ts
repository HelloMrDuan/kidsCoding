import type {
  CourseContentValidationIssue,
  EditableLaunchLesson,
} from '@/features/domain/types'

type LessonActionResult = {
  ok: boolean
  issues: CourseContentValidationIssue[]
}

type GenerateLessonDraftResult = {
  ok: boolean
  lesson?: EditableLaunchLesson
  issues: CourseContentValidationIssue[]
  error?: string
}

type SaveAiSettingsResult = {
  ok: boolean
  error?: string
}

async function readJson<T>(response: Response) {
  return (await response.json()) as T
}

export async function saveLessonDraft(
  lessonId: string,
  lesson: EditableLaunchLesson,
) {
  const response = await fetch(`/api/admin/lessons/${lessonId}/draft`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ lesson }),
  })

  return readJson<LessonActionResult>(response)
}

export async function publishLesson(lessonId: string) {
  const response = await fetch(`/api/admin/lessons/${lessonId}/publish`, {
    method: 'POST',
  })

  return readJson<LessonActionResult>(response)
}

export async function rollbackLesson(lessonId: string) {
  const response = await fetch(`/api/admin/lessons/${lessonId}/rollback`, {
    method: 'POST',
  })

  return readJson<{ ok: boolean }>(response)
}

export async function generateCurriculumSkeleton() {
  const response = await fetch('/api/admin/ai/curriculum-skeleton', {
    method: 'POST',
  })

  return readJson<{ ok: boolean; skeletonCount?: number; error?: string }>(
    response,
  )
}

export async function generateLessonDraft(lessonId: string) {
  const response = await fetch(`/api/admin/ai/lessons/${lessonId}/generate-draft`, {
    method: 'POST',
  })

  return readJson<GenerateLessonDraftResult>(response)
}

export async function saveAiSettings(input: {
  defaultProviderSlot: 'primary' | 'secondary'
  defaultModel: string
}) {
  const response = await fetch('/api/admin/ai/settings', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  return readJson<SaveAiSettingsResult>(response)
}
