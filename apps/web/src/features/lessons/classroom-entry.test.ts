import { beforeEach, describe, expect, it } from 'vitest'
import { COURSE_PICKER_HREF, readLearningRecord, resolveClassroomHref } from './classroom-entry'
import { getLessonMaturity } from '@/features/curriculum/lesson-maturity'
import { GUEST_PROGRESS_STORAGE_KEY } from '@/features/progress/local-progress'

const scoped = (owner: string, legacyKey: string) =>
  `kids-lesson-owner-v1:${encodeURIComponent(owner)}:${legacyKey}`

const draft = (lessonId: string, savedAt: string) =>
  JSON.stringify({ lessonId, savedAt, script: { stepIndex: 0, programs: {} } })

beforeEach(() => {
  window.localStorage.clear()
})

describe('classroom entry for 编程课堂', () => {
  it('offers the course picker when there is no learning record', async () => {
    expect(readLearningRecord()).toBeNull()
    await expect(resolveClassroomHref()).resolves.toBe(COURSE_PICKER_HREF)
    expect(COURSE_PICKER_HREF).toBe('/learn/catalog')
  })

  it('continues the launch lesson recorded in guest progress at its original URL', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify({
      currentLessonId: 'lesson-02-forest-greeting',
      completedLessonIds: ['lesson-01-forest-hello'],
      completedProjectIds: [],
      projectSnapshots: [],
    }))
    expect(readLearningRecord()).toEqual({ lessonId: 'lesson-02-forest-greeting' })
    await expect(resolveClassroomHref()).resolves.toBe('/learn/lesson/lesson-02-forest-greeting')
  })

  it('opens the same route the catalog card uses for a catalog lesson', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify({
      currentLessonId: 'G1-U1-L01',
      completedLessonIds: ['G1-U1-L01'],
      completedProjectIds: [],
      projectSnapshots: [],
    }))
    const catalogRoute = getLessonMaturity('G1-U1-L01')?.trialRoute
    expect(catalogRoute).toBe('/learn/story-lab/G1-U1-L01/golden')
    await expect(resolveClassroomHref()).resolves.toBe(catalogRoute)
  })

  it('falls back to the newest saved classroom draft, not the demo lesson', async () => {
    window.localStorage.setItem(
      scoped('guest', 'kidscoding-draft:G1-U1-L01'),
      draft('G1-U1-L01', '2026-11-20T10:00:00.000Z'),
    )
    window.localStorage.setItem(
      scoped('guest', 'kidscoding-draft:G1-U1-L02'),
      draft('G1-U1-L02', '2026-11-21T10:00:00.000Z'),
    )
    expect(readLearningRecord()?.lessonId).toBe('G1-U1-L02')
    const expected = getLessonMaturity('G1-U1-L02')?.trialRoute ?? '/learn/catalog/G1-U1-L02'
    await expect(resolveClassroomHref()).resolves.toBe(expected)
  })

  it('ignores an empty progress envelope and still finds the draft', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify({
      currentLessonId: 'lesson-01-forest-hello',
      completedLessonIds: [],
      completedProjectIds: [],
      projectSnapshots: [],
    }))
    window.localStorage.setItem('kidscoding-draft:lesson-01-forest-hello', draft('lesson-01-forest-hello', '2026-11-22T08:00:00.000Z'))
    expect(readLearningRecord()).toEqual({ lessonId: 'lesson-01-forest-hello' })
    await expect(resolveClassroomHref()).resolves.toBe('/learn/lesson/lesson-01-forest-hello')
  })

  it('fails closed to the course picker for an unknown lesson id', async () => {
    window.localStorage.setItem('kidscoding-draft:not-a-lesson', draft('not-a-lesson', '2026-11-22T08:00:00.000Z'))
    expect(readLearningRecord()).toEqual({ lessonId: 'not-a-lesson' })
    await expect(resolveClassroomHref()).resolves.toBe(COURSE_PICKER_HREF)
  })

  it('survives corrupt progress and draft payloads', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, '{not json')
    window.localStorage.setItem('kidscoding-draft:broken', '{not json')
    const record = readLearningRecord()
    expect(record).toEqual({ lessonId: 'broken' })
  })
})
