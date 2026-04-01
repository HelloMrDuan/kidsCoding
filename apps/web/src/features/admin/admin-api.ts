import type {
  CourseContentValidationIssue,
  EditableLaunchLesson,
} from '@/features/domain/types'

type LessonActionResult = {
  ok: boolean
  issues: CourseContentValidationIssue[]
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
