import { launchLessons } from '@/content/curriculum/launch-lessons'
import type {
  AdminLessonSummary,
  AiProviderConfig,
  EditableLaunchLesson,
} from '@/features/domain/types'
import {
  hasServiceRoleEnv,
  parseAiProviderSlots,
  resolveAiProviderSelection,
} from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

import {
  hasUnpublishedLessonChanges,
  resolveAdminLessonRecord,
} from './launch-curriculum-records'
import { ensureAiRuntimeSelection } from './ai/ai-runtime-settings'
import { createLaunchCurriculumRepository } from './launch-curriculum-repository'

export async function loadAdminLessonSummaries(): Promise<AdminLessonSummary[]> {
  if (!hasServiceRoleEnv()) {
    return [...launchLessons]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        phase: lesson.phase,
        sortOrder: lesson.sortOrder,
        draftUpdatedAt: null,
        publishedAt: null,
        hasUnpublishedChanges: false,
      }))
  }

  const repository = createLaunchCurriculumRepository(createAdminClient())
  const [draftRows, publicationRows] = await Promise.all([
    repository.loadDraftLessons(),
    repository.loadPublishedLessons(),
  ])

  return [...launchLessons]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((seed) => {
      const draft = draftRows.find((row) => row.id === seed.id)
      const publication = publicationRows.find((row) => row.lesson_id === seed.id)
      const lesson = resolveAdminLessonRecord({
        lessonId: seed.id,
        seedLessons: [seed],
        draftRows: draft ? [draft] : [],
        publicationRows: publication ? [publication] : [],
      })

      return {
        id: lesson.id,
        title: lesson.title,
        phase: lesson.phase,
        sortOrder: lesson.sortOrder,
        draftUpdatedAt: draft?.updated_at ?? null,
        publishedAt: publication?.published_at ?? null,
        hasUnpublishedChanges: hasUnpublishedLessonChanges(draft, publication),
      }
    })
}

export async function loadAdminLessonPageData(lessonId: string): Promise<{
  lesson: EditableLaunchLesson
  draftUpdatedAt: string | null
  publishedAt: string | null
  hasUnpublishedChanges: boolean
}> {
  const seed = launchLessons.find((item) => item.id === lessonId)

  if (!seed) {
    throw new Error(`Unknown lesson: ${lessonId}`)
  }

  if (!hasServiceRoleEnv()) {
    return {
      lesson: seed,
      draftUpdatedAt: null,
      publishedAt: null,
      hasUnpublishedChanges: false,
    }
  }

  const repository = createLaunchCurriculumRepository(createAdminClient())
  const [draftRows, publicationRows] = await Promise.all([
    repository.loadDraftLessons(),
    repository.loadPublishedLessons(),
  ])
  const draft = draftRows.find((row) => row.id === lessonId)
  const publication = publicationRows.find((row) => row.lesson_id === lessonId)

  return {
    lesson: resolveAdminLessonRecord({
      lessonId,
      seedLessons: [seed],
      draftRows: draft ? [draft] : [],
      publicationRows: publication ? [publication] : [],
    }),
    draftUpdatedAt: draft?.updated_at ?? null,
    publishedAt: publication?.published_at ?? null,
    hasUnpublishedChanges: hasUnpublishedLessonChanges(draft, publication),
  }
}

export async function loadAdminDashboardData(): Promise<{
  lessons: AdminLessonSummary[]
  ai: {
    providers: Array<
      Pick<AiProviderConfig, 'slot' | 'name' | 'baseUrl' | 'models'>
    >
    currentSelection: {
      defaultProviderSlot: 'primary' | 'secondary'
      defaultModel: string
    }
  }
}> {
  const lessons = await loadAdminLessonSummaries()
  const providers = parseAiProviderSlots(process.env).map((provider) => ({
    slot: provider.slot,
    name: provider.name,
    baseUrl: provider.baseUrl,
    models: provider.models,
  }))

  if (!hasServiceRoleEnv()) {
    return {
      lessons,
      ai: {
        providers,
        currentSelection: {
          defaultProviderSlot: providers[0]?.slot ?? 'primary',
          defaultModel: providers[0]?.models[0] ?? '',
        },
      },
    }
  }

  const repository = createLaunchCurriculumRepository(createAdminClient())
  const stored = await ensureAiRuntimeSelection({
    env: process.env,
    mode: 'development',
    repository,
  })
  const resolved = resolveAiProviderSelection({
    env: process.env,
    mode: 'development',
    stored,
  })

  return {
    lessons,
    ai: {
      providers,
      currentSelection: {
        defaultProviderSlot: resolved.provider.slot,
        defaultModel: resolved.model,
      },
    },
  }
}
