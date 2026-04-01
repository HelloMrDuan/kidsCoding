import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hasServiceRoleEnv: vi.fn(),
  createAdminClient: vi.fn(),
  createLaunchCurriculumRepository: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  hasServiceRoleEnv: mocks.hasServiceRoleEnv,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/features/admin/launch-curriculum-repository', () => ({
  createLaunchCurriculumRepository: mocks.createLaunchCurriculumRepository,
}))

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { createSeedLaunchCurriculum } from '@/features/curriculum/seed-launch-curriculum'

import { loadLaunchCurriculum } from './load-launch-curriculum'

describe('loadLaunchCurriculum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('falls back to the seed curriculum when service-role env is unavailable', async () => {
    mocks.hasServiceRoleEnv.mockReturnValue(false)

    const curriculum = await loadLaunchCurriculum()

    expect(curriculum).toEqual(createSeedLaunchCurriculum())
    expect(mocks.createLaunchCurriculumRepository).not.toHaveBeenCalled()
  })

  it('overlays published lesson copy onto the seed curriculum', async () => {
    const seed = launchLessons[0]

    mocks.hasServiceRoleEnv.mockReturnValue(true)
    mocks.createAdminClient.mockReturnValue({ admin: true })
    mocks.createLaunchCurriculumRepository.mockReturnValue({
      loadPublishedLessons: vi.fn().mockResolvedValue([
        {
          lesson_id: seed.id,
          phase: seed.phase,
          mode: seed.mode,
          sort_order: seed.sortOrder,
          title: '宸插彂甯冭绋嬫爣棰?',
          goal: '宸插彂甯冭绋嬬洰鏍?',
          payload: {
            steps: [
              {
                ...seed.steps[0],
                title: '宸插彂甯冩楠ゆ爣棰?',
                instruction: '宸插彂甯冩楠よ鏄?',
              },
              ...seed.steps.slice(1),
            ],
            hintLayers: seed.hintLayers.map((layer, index) =>
              index === 0 ? { ...layer, copy: '宸插彂甯冩彁绀?' } : layer,
            ),
            templateId: seed.templateId,
            parentAdvice: '鍏堣瀛╁瓙鑷繁瀹屾垚锛屽啀鐪嬫彁绀恒€?',
          },
          published_at: '2026-03-31T10:00:00.000Z',
          published_by: 'admin-1',
        },
      ]),
    })

    const curriculum = await loadLaunchCurriculum()

    expect(curriculum.lessons[0]).toMatchObject({
      id: seed.id,
      title: '宸插彂甯冭绋嬫爣棰?',
      goal: '宸插彂甯冭绋嬬洰鏍?',
      parentAdvice: '鍏堣瀛╁瓙鑷繁瀹屾垚锛屽啀鐪嬫彁绀恒€?',
    })
    expect(curriculum.lessons[0]?.steps[0]).toMatchObject({
      title: '宸插彂甯冩楠ゆ爣棰?',
      instruction: '宸插彂甯冩楠よ鏄?',
    })
  })

  it('falls back to the seed curriculum when the publication query fails', async () => {
    mocks.hasServiceRoleEnv.mockReturnValue(true)
    mocks.createAdminClient.mockReturnValue({ admin: true })
    mocks.createLaunchCurriculumRepository.mockReturnValue({
      loadPublishedLessons: vi.fn().mockRejectedValue(new Error('db-down')),
    })

    const curriculum = await loadLaunchCurriculum()

    expect(curriculum).toEqual(createSeedLaunchCurriculum())
  })
})
