import { beforeEach, describe, expect, it } from 'vitest'
import { COURSE_PICKER_HREF, readLearningRecord, resolveClassroomHref } from './classroom-entry'
import { getLessonMaturity } from '@/features/curriculum/lesson-maturity'
import { GUEST_PROGRESS_OWNER_STORAGE_KEY, GUEST_PROGRESS_STORAGE_KEY } from '@/features/progress/local-progress'

const scoped = (owner: string, legacyKey: string) =>
  `kids-lesson-owner-v1:${encodeURIComponent(owner)}:${legacyKey}`

const draft = (lessonId: string, savedAt: string) =>
  JSON.stringify({ lessonId, savedAt, script: { stepIndex: 0, programs: {} } })

const progress = (lessonId: string) => JSON.stringify({
  currentLessonId: lessonId,
  completedLessonIds: [lessonId],
  completedProjectIds: [],
  projectSnapshots: [],
})

const routeFor = (lessonId: string) =>
  getLessonMaturity(lessonId)?.trialRoute ?? `/learn/catalog/${lessonId}`

beforeEach(() => {
  window.localStorage.clear()
})

describe('classroom entry for 编程课堂', () => {
  it('offers the course picker when there is no learning record', async () => {
    expect(readLearningRecord('guest')).toBeNull()
    await expect(resolveClassroomHref('guest')).resolves.toBe(COURSE_PICKER_HREF)
    expect(COURSE_PICKER_HREF).toBe('/learn/catalog')
  })

  it('continues the launch lesson recorded in guest progress at its original URL', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('lesson-02-forest-greeting'))
    expect(readLearningRecord('guest')).toEqual({ lessonId: 'lesson-02-forest-greeting' })
    await expect(resolveClassroomHref('guest')).resolves.toBe('/learn/lesson/lesson-02-forest-greeting')
  })

  it('opens the same route the catalog card uses for a catalog lesson', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('G1-U1-L01'))
    const catalogRoute = getLessonMaturity('G1-U1-L01')?.trialRoute
    expect(catalogRoute).toBe('/learn/story-lab/G1-U1-L01/golden')
    await expect(resolveClassroomHref('guest')).resolves.toBe(catalogRoute)
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
    expect(readLearningRecord('guest')?.lessonId).toBe('G1-U1-L02')
    await expect(resolveClassroomHref('guest')).resolves.toBe(routeFor('G1-U1-L02'))
  })

  it('ignores an empty progress envelope and still finds the draft', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify({
      currentLessonId: 'lesson-01-forest-hello',
      completedLessonIds: [],
      completedProjectIds: [],
      projectSnapshots: [],
    }))
    window.localStorage.setItem('kidscoding-draft:lesson-01-forest-hello', draft('lesson-01-forest-hello', '2026-11-22T08:00:00.000Z'))
    expect(readLearningRecord('guest')).toEqual({ lessonId: 'lesson-01-forest-hello' })
    await expect(resolveClassroomHref('guest')).resolves.toBe('/learn/lesson/lesson-01-forest-hello')
  })

  it('fails closed to the course picker for an unknown lesson id', async () => {
    window.localStorage.setItem('kidscoding-draft:not-a-lesson', draft('not-a-lesson', '2026-11-22T08:00:00.000Z'))
    expect(readLearningRecord('guest')).toEqual({ lessonId: 'not-a-lesson' })
    await expect(resolveClassroomHref('guest')).resolves.toBe(COURSE_PICKER_HREF)
  })

  it('survives corrupt progress and draft payloads', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, '{not json')
    window.localStorage.setItem('kidscoding-draft:broken', '{not json')
    expect(readLearningRecord('guest')).toEqual({ lessonId: 'broken' })
  })
})

describe('编程课堂 account isolation', () => {
  it('reads only the signed-in account\'s own scoped drafts', async () => {
    window.localStorage.setItem(
      scoped('user:a', 'kidscoding-draft:G1-U1-L01'),
      draft('G1-U1-L01', '2026-11-20T10:00:00.000Z'),
    )
    window.localStorage.setItem(
      scoped('user:b', 'kidscoding-draft:G1-U1-L02'),
      draft('G1-U1-L02', '2026-11-21T10:00:00.000Z'),
    )
    expect(readLearningRecord('user:a')).toEqual({ lessonId: 'G1-U1-L01' })
    expect(readLearningRecord('user:b')).toEqual({ lessonId: 'G1-U1-L02' })
    await expect(resolveClassroomHref('user:a')).resolves.toBe(routeFor('G1-U1-L01'))
    await expect(resolveClassroomHref('user:b')).resolves.toBe(routeFor('G1-U1-L02'))
  })

  it('never gives account B account A\'s lesson when both share one browser', async () => {
    window.localStorage.setItem(
      scoped('user:a', 'kidscoding-draft:G1-U1-L01'),
      draft('G1-U1-L01', '2026-11-21T10:00:00.000Z'),
    )
    // B has no record of its own: A's draft is not evidence of B's learning.
    expect(readLearningRecord('user:b')).toBeNull()
    await expect(resolveClassroomHref('user:b')).resolves.toBe(COURSE_PICKER_HREF)
  })

  it('does not attribute browser guest progress or legacy drafts to a signed-in account', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('G1-U1-L01'))
    window.localStorage.setItem('kidscoding-draft:lesson-02-forest-greeting', draft('lesson-02-forest-greeting', '2026-11-22T08:00:00.000Z'))
    expect(readLearningRecord('user:a')).toBeNull()
    await expect(resolveClassroomHref('user:a')).resolves.toBe(COURSE_PICKER_HREF)
  })

  it('does not read a different guest\'s scoped drafts', async () => {
    window.localStorage.setItem(
      scoped('guest:account-a', 'kidscoding-draft:G1-U1-L01'),
      draft('G1-U1-L01', '2026-11-21T10:00:00.000Z'),
    )
    expect(readLearningRecord('guest:account-b')).toBeNull()
    expect(readLearningRecord('guest:account-a')).toEqual({ lessonId: 'G1-U1-L01' })
  })

  it('fails closed when the owner is unknown or ambiguous', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('G1-U1-L01'))
    expect(readLearningRecord(undefined)).toBeNull()
    expect(readLearningRecord(null)).toBeNull()
    expect(readLearningRecord('')).toBeNull()
    expect(readLearningRecord('someone-else')).toBeNull()
    await expect(resolveClassroomHref()).resolves.toBe(COURSE_PICKER_HREF)
    await expect(resolveClassroomHref(null)).resolves.toBe(COURSE_PICKER_HREF)
  })
})

describe('编程课堂 guest progress isolation (kc-progress claim)', () => {
  it('claims legacy unmarked progress for the first confirmed guest and keeps it readable', async () => {
    // Existing guest data written before the claim existed must stay usable.
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('lesson-02-forest-greeting'))
    expect(readLearningRecord('guest:family-a')).toEqual({ lessonId: 'lesson-02-forest-greeting' })
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest:family-a')
    await expect(resolveClassroomHref('guest:family-a')).resolves.toBe('/learn/lesson/lesson-02-forest-greeting')
  })

  it('never lets guest:B continue guest:A\'s progress in the same browser', async () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('G1-U1-L01'))
    expect(readLearningRecord('guest:family-a')?.lessonId).toBe('G1-U1-L01')

    // B has no scoped draft of its own: A's progress is not B's learning.
    expect(readLearningRecord('guest:family-b')).toBeNull()
    await expect(resolveClassroomHref('guest:family-b')).resolves.toBe(COURSE_PICKER_HREF)
    // The failed read must not delete A's real data.
    expect(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY)).not.toBeNull()

    // Switching back restores A.
    expect(readLearningRecord('guest:family-a')?.lessonId).toBe('G1-U1-L01')
  })

  it('adopts progress written before the guest id cookie existed', async () => {
    // The id cookie is minted on the first cloud sync, after the first lesson.
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('lesson-02-forest-greeting'))
    expect(readLearningRecord('guest')).toEqual({ lessonId: 'lesson-02-forest-greeting' })
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest')

    expect(readLearningRecord('guest:family-a')?.lessonId).toBe('lesson-02-forest-greeting')
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest:family-a')
    // Once adopted by the concrete id, the bare guest no longer reads it.
    expect(readLearningRecord('guest')).toBeNull()
  })

  it('never gives guest progress or a guest claim to a signed-in account', () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, progress('G1-U1-L01'))
    expect(readLearningRecord('user:a')).toBeNull()
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBeNull()
  })
})
