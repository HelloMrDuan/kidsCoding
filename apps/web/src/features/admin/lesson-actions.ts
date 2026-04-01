import type {
  CourseContentValidationIssue,
  EditableLaunchLesson,
  LessonConfigRow,
  LessonPublicationBackupRow,
  LessonPublicationRow,
} from '@/features/domain/types'

import { validateCourseContent } from './validate-course-content'

type DraftRepository = {
  upsertDraftLesson: (row: LessonConfigRow) => Promise<void>
}

type PublishRepository = {
  loadDraftLesson: (lessonId: string) => Promise<LessonConfigRow | null>
  loadPublishedLesson: (lessonId: string) => Promise<LessonPublicationRow | null>
  upsertPublicationBackup: (row: LessonPublicationBackupRow) => Promise<void>
  upsertPublication: (row: LessonPublicationRow) => Promise<void>
}

type RollbackRepository = {
  loadPublicationBackup: (
    lessonId: string,
  ) => Promise<LessonPublicationBackupRow | null>
  upsertPublication: (row: LessonPublicationRow) => Promise<void>
}

function toLessonConfigRow(
  lesson: EditableLaunchLesson,
  actorUserId: string,
): LessonConfigRow {
  return {
    id: lesson.id,
    phase: lesson.phase,
    mode: lesson.mode,
    sort_order: lesson.sortOrder,
    title: lesson.title,
    goal: lesson.goal,
    payload: {
      steps: lesson.steps,
      hintLayers: lesson.hintLayers,
      templateId: lesson.templateId,
      parentAdvice: lesson.parentAdvice,
    },
    updated_at: new Date().toISOString(),
    updated_by: actorUserId,
  }
}

function toValidationInput(
  lessonId: string,
  row: Pick<LessonConfigRow, 'title' | 'goal' | 'payload'>,
) {
  return {
    lessonId,
    title: row.title,
    goal: row.goal,
    steps: row.payload.steps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
    })),
  }
}

export async function saveLaunchLessonDraft(input: {
  actorUserId: string
  lesson: EditableLaunchLesson
  repository: DraftRepository
}) {
  const issues = validateCourseContent({
    mode: 'draft',
    lessonId: input.lesson.id,
    title: input.lesson.title,
    goal: input.lesson.goal,
    steps: input.lesson.steps.map((step) => ({
      title: step.title,
      instruction: step.instruction,
    })),
  })

  if (issues.some((issue) => issue.code === 'encoding_suspect')) {
    return {
      ok: false as const,
      issues,
    }
  }

  await input.repository.upsertDraftLesson(
    toLessonConfigRow(input.lesson, input.actorUserId),
  )

  return {
    ok: true as const,
    issues: [] as CourseContentValidationIssue[],
  }
}

export async function publishLaunchLesson(input: {
  lessonId: string
  actorUserId: string
  repository: PublishRepository
}) {
  const draft = await input.repository.loadDraftLesson(input.lessonId)

  if (!draft) {
    throw new Error('draft-not-found')
  }

  const issues = validateCourseContent({
    mode: 'publish',
    ...toValidationInput(input.lessonId, draft),
  })

  if (issues.length > 0) {
    return {
      ok: false as const,
      issues,
    }
  }

  const currentPublication = await input.repository.loadPublishedLesson(
    input.lessonId,
  )

  if (currentPublication) {
    await input.repository.upsertPublicationBackup({
      lesson_id: currentPublication.lesson_id,
      phase: currentPublication.phase,
      mode: currentPublication.mode,
      sort_order: currentPublication.sort_order,
      title: currentPublication.title,
      goal: currentPublication.goal,
      payload: currentPublication.payload,
      source_published_at: currentPublication.published_at,
      backed_up_at: new Date().toISOString(),
      backed_up_by: input.actorUserId,
    })
  }

  await input.repository.upsertPublication({
    lesson_id: draft.id,
    phase: draft.phase,
    mode: draft.mode,
    sort_order: draft.sort_order,
    title: draft.title,
    goal: draft.goal,
    payload: draft.payload,
    published_at: new Date().toISOString(),
    published_by: input.actorUserId,
  })

  return {
    ok: true as const,
    issues: [] as CourseContentValidationIssue[],
  }
}

export async function rollbackLaunchLessonPublication(input: {
  lessonId: string
  actorUserId: string
  repository: RollbackRepository
}) {
  const backup = await input.repository.loadPublicationBackup(input.lessonId)

  if (!backup) {
    throw new Error('publication-backup-not-found')
  }

  await input.repository.upsertPublication({
    lesson_id: backup.lesson_id,
    phase: backup.phase,
    mode: backup.mode,
    sort_order: backup.sort_order,
    title: backup.title,
    goal: backup.goal,
    payload: backup.payload,
    published_at: new Date().toISOString(),
    published_by: input.actorUserId,
  })
}
