import type {
  GeneratedLessonCopy,
  LaunchLessonDefinition,
  LessonConfigRow,
  LessonPublicationRow,
} from '@/features/domain/types'

function mergeRowIntoSeed(
  seed: LaunchLessonDefinition,
  row: Pick<LessonConfigRow, 'title' | 'goal' | 'payload'>,
) {
  return {
    ...seed,
    title: row.title,
    goal: row.goal,
    steps: seed.steps.map((step) => {
      const nextStep = row.payload.steps.find((item) => item.id === step.id)

      return nextStep
        ? {
            ...step,
            title: nextStep.title,
            instruction: nextStep.instruction,
          }
        : step
    }),
    hintLayers: seed.hintLayers.map((layer) => {
      const nextLayer = row.payload.hintLayers.find((item) => item.id === layer.id)

      return nextLayer
        ? {
            ...layer,
            copy: nextLayer.copy,
          }
        : layer
    }),
    templateId: row.payload.templateId ?? seed.templateId,
    parentAdvice: row.payload.parentAdvice,
  }
}

export function resolveAdminLessonRecord(input: {
  lessonId: string
  seedLessons: LaunchLessonDefinition[]
  draftRows: LessonConfigRow[]
  publicationRows: LessonPublicationRow[]
}) {
  const seed = input.seedLessons.find((lesson) => lesson.id === input.lessonId)

  if (!seed) {
    throw new Error(`Unknown lesson: ${input.lessonId}`)
  }

  const draft = input.draftRows.find((row) => row.id === input.lessonId)

  if (draft) {
    return mergeRowIntoSeed(seed, draft)
  }

  const publication = input.publicationRows.find(
    (row) => row.lesson_id === input.lessonId,
  )

  if (publication) {
    return mergeRowIntoSeed(seed, publication)
  }

  return seed
}

export function mergePublishedLessons(
  seedLessons: LaunchLessonDefinition[],
  publicationRows: LessonPublicationRow[],
) {
  return seedLessons.map((seed) => {
    const publication = publicationRows.find((row) => row.lesson_id === seed.id)

    return publication ? mergeRowIntoSeed(seed, publication) : seed
  })
}

export function applyGeneratedLessonCopy(
  current: LaunchLessonDefinition,
  generated: GeneratedLessonCopy,
) {
  return {
    ...current,
    title: generated.title,
    goal: generated.goal,
    steps: current.steps.map((step) => {
      const nextStep = generated.steps.find((item) => item.id === step.id)

      return nextStep
        ? {
            ...step,
            title: nextStep.title,
            instruction: nextStep.instruction,
          }
        : step
    }),
    hintLayers: current.hintLayers.map((layer) => {
      const nextLayer = generated.hintLayers.find((item) => item.id === layer.id)

      return nextLayer
        ? {
            ...layer,
            copy: nextLayer.copy,
          }
        : layer
    }),
    parentAdvice: generated.parentAdvice,
  }
}
