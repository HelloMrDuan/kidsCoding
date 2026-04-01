import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createServerSupabaseClient: vi.fn(),
  createAdminClient: vi.fn(),
  createLaunchCurriculumRepository: vi.fn(),
  saveLaunchLessonDraft: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  hasServiceRoleEnv: () => true,
  hasSupabaseEnv: () => true,
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/features/admin/launch-curriculum-repository', () => ({
  createLaunchCurriculumRepository: mocks.createLaunchCurriculumRepository,
}))

vi.mock('@/features/admin/lesson-actions', () => ({
  saveLaunchLessonDraft: mocks.saveLaunchLessonDraft,
}))

import { POST } from './route'

describe('POST /api/admin/lessons/[lessonId]/draft', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'admin-1',
              app_metadata: { role: 'admin' },
            },
          },
        }),
      },
    })

    mocks.createAdminClient.mockReturnValue({ admin: true })
    mocks.createLaunchCurriculumRepository.mockReturnValue({ repository: true })
    mocks.saveLaunchLessonDraft.mockResolvedValue({ ok: true, issues: [] })
  })

  it('rejects requests whose path lesson id does not match the payload', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/lessons/lesson-a/draft', {
        method: 'POST',
        body: JSON.stringify({
          lesson: {
            id: 'lesson-b',
            phase: 'trial',
            mode: 'guided',
            sortOrder: 1,
            title: '标题',
            goal: '目标',
            steps: [],
            hintLayers: [],
            templateId: 'template-1',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      { params: Promise.resolve({ lessonId: 'lesson-a' }) },
    )

    expect(response.status).toBe(409)
    await expect(response.json()).resolves.toEqual({
      error: 'lesson-id-mismatch',
    })
    expect(mocks.saveLaunchLessonDraft).not.toHaveBeenCalled()
  })

  it('saves the draft when the path lesson id matches the payload', async () => {
    const response = await POST(
      new Request('http://localhost/api/admin/lessons/lesson-a/draft', {
        method: 'POST',
        body: JSON.stringify({
          lesson: {
            id: 'lesson-a',
            phase: 'trial',
            mode: 'guided',
            sortOrder: 1,
            title: '标题',
            goal: '目标',
            steps: [],
            hintLayers: [],
            templateId: 'template-1',
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      { params: Promise.resolve({ lessonId: 'lesson-a' }) },
    )

    expect(response.status).toBe(200)
    expect(mocks.saveLaunchLessonDraft).toHaveBeenCalledWith({
      actorUserId: 'admin-1',
      lesson: expect.objectContaining({
        id: 'lesson-a',
      }),
      repository: { repository: true },
    })
  })
})
