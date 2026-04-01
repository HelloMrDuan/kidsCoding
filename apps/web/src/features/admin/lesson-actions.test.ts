import { describe, expect, it, vi } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'

import {
  publishLaunchLesson,
  rollbackLaunchLessonPublication,
  saveLaunchLessonDraft,
} from './lesson-actions'

const seed = launchLessons[0]

describe('saveLaunchLessonDraft', () => {
  it('writes the draft row with editor metadata', async () => {
    const repository = {
      upsertDraftLesson: vi.fn(),
    }

    await saveLaunchLessonDraft({
      actorUserId: 'user-1',
      lesson: {
        id: seed.id,
        phase: seed.phase,
        mode: seed.mode,
        sortOrder: seed.sortOrder,
        title: seed.title,
        goal: seed.goal,
        steps: seed.steps,
        hintLayers: seed.hintLayers,
        templateId: seed.templateId,
      },
      repository,
    })

    expect(repository.upsertDraftLesson).toHaveBeenCalledWith(
      expect.objectContaining({
        id: seed.id,
        updated_by: 'user-1',
      }),
    )
  })
})

describe('publishLaunchLesson', () => {
  it('copies the current publication into backup before replacing it', async () => {
    const repository = {
      loadDraftLesson: vi.fn().mockResolvedValue({
        id: seed.id,
        phase: seed.phase,
        mode: seed.mode,
        sort_order: seed.sortOrder,
        title: '草稿标题',
        goal: seed.goal,
        payload: {
          steps: seed.steps,
          hintLayers: seed.hintLayers,
          templateId: seed.templateId,
        },
      }),
      loadPublishedLesson: vi.fn().mockResolvedValue({
        lesson_id: seed.id,
        phase: seed.phase,
        mode: seed.mode,
        sort_order: seed.sortOrder,
        title: '线上标题',
        goal: seed.goal,
        payload: {
          steps: seed.steps,
          hintLayers: seed.hintLayers,
          templateId: seed.templateId,
        },
        published_at: '2026-03-31T09:00:00.000Z',
        published_by: 'user-0',
      }),
      upsertPublicationBackup: vi.fn(),
      upsertPublication: vi.fn(),
    }

    await publishLaunchLesson({
      lessonId: seed.id,
      repository,
      actorUserId: 'user-1',
    })

    expect(repository.upsertPublicationBackup).toHaveBeenCalledOnce()
    expect(repository.upsertPublication).toHaveBeenCalledWith(
      expect.objectContaining({
        lesson_id: seed.id,
        title: '草稿标题',
        published_by: 'user-1',
      }),
    )
  })
})

describe('rollbackLaunchLessonPublication', () => {
  it('restores the last backup version', async () => {
    const repository = {
      loadPublicationBackup: vi.fn().mockResolvedValue({
        lesson_id: seed.id,
        phase: seed.phase,
        mode: seed.mode,
        sort_order: seed.sortOrder,
        title: '上一版标题',
        goal: seed.goal,
        payload: {
          steps: seed.steps,
          hintLayers: seed.hintLayers,
          templateId: seed.templateId,
        },
        source_published_at: '2026-03-30T09:00:00.000Z',
      }),
      upsertPublication: vi.fn(),
    }

    await rollbackLaunchLessonPublication({
      lessonId: seed.id,
      repository,
      actorUserId: 'user-1',
    })

    expect(repository.upsertPublication).toHaveBeenCalledWith(
      expect.objectContaining({
        lesson_id: seed.id,
        title: '上一版标题',
        published_by: 'user-1',
      }),
    )
  })
})
