import { beforeEach, describe, expect, it } from 'vitest'

import {
  GUEST_PROGRESS_OWNER_STORAGE_KEY,
  GUEST_PROGRESS_STORAGE_KEY,
  defaultGuestProgress,
  progressStorageKeyFor,
  readGuestProgress,
  writeGuestProgress,
  type GuestProgress,
} from './local-progress'

const progressAt = (lessonId: string): GuestProgress => ({
  ...defaultGuestProgress,
  currentLessonId: lessonId,
  completedLessonIds: [lessonId],
})

beforeEach(() => {
  window.localStorage.clear()
})

describe('kc-progress owner attribution (PR #573 review P1-2)', () => {
  it('claims legacy unclaimed progress for guest:A and keeps it readable', () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify(progressAt('G1-U1-L01')))

    expect(readGuestProgress('guest:family-a').completedLessonIds).toEqual(['G1-U1-L01'])
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest:family-a')
    // Claiming never deletes or rewrites the historical envelope.
    expect(JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? '{}').completedLessonIds)
      .toEqual(['G1-U1-L01'])
  })

  it('guest:B\'s write never lands on guest:A\'s envelope or claim', () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify(progressAt('G1-U1-L01')))
    expect(readGuestProgress('guest:family-a').completedLessonIds).toEqual(['G1-U1-L01'])

    // B sees nothing of A's legacy progress.
    expect(readGuestProgress('guest:family-b')).toEqual(defaultGuestProgress)

    // B completes its own lesson: the write is attributed to B, not A.
    writeGuestProgress(progressAt('G1-U1-L02'), 'guest:family-b')

    // A's legacy envelope and claim stamp are untouched.
    expect(JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? '{}').completedLessonIds)
      .toEqual(['G1-U1-L01'])
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest:family-a')

    // Each owner reads its own record.
    expect(readGuestProgress('guest:family-b').completedLessonIds).toEqual(['G1-U1-L02'])
    expect(readGuestProgress('guest:family-a').completedLessonIds).toEqual(['G1-U1-L01'])
  })

  it('survives the real A → B → A switch without crossed writes', () => {
    // A learns on the shared browser first and claims the legacy envelope.
    const aFirst = progressAt('G1-U1-L01')
    writeGuestProgress(aFirst, 'guest:family-a')
    expect(readGuestProgress('guest:family-a')).toEqual(aFirst)

    // B takes over: sees no inherited progress, then completes its own lesson.
    expect(readGuestProgress('guest:family-b')).toEqual(defaultGuestProgress)
    const bFirst = progressAt('G1-U1-L02')
    writeGuestProgress(bFirst, 'guest:family-b')

    // Back to A: A's own work is exactly what A left, with no B entries.
    expect(readGuestProgress('guest:family-a')).toEqual(aFirst)
    expect(readGuestProgress('guest:family-a').completedLessonIds).not.toContain('G1-U1-L02')

    // A keeps working; B's record still stands on its own.
    const aSecond = { ...aFirst, stars: 3, completedLessonIds: ['G1-U1-L01', 'G1-U1-L03'] }
    writeGuestProgress(aSecond, 'guest:family-a')
    expect(readGuestProgress('guest:family-b')).toEqual(bFirst)
    expect(readGuestProgress('guest:family-a')).toEqual(aSecond)

    // The claimant's compatibility mirror carries A's latest state only.
    expect(JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? '{}').completedLessonIds)
      .toEqual(['G1-U1-L01', 'G1-U1-L03'])
  })

  it('keeps both owners\' scoped envelopes side by side', () => {
    writeGuestProgress(progressAt('G1-U1-L01'), 'guest:family-a')
    writeGuestProgress(progressAt('G1-U1-L02'), 'guest:family-b')
    expect(window.localStorage.getItem(progressStorageKeyFor('guest:family-a'))).not.toBeNull()
    expect(window.localStorage.getItem(progressStorageKeyFor('guest:family-b'))).not.toBeNull()
  })

  it('fails closed for an unresolved owner instead of writing the shared envelope', () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify(progressAt('G1-U1-L01')))
    expect(readGuestProgress(null)).toEqual(defaultGuestProgress)
    expect(() => writeGuestProgress(progressAt('G1-U1-L02'), null)).toThrow()
    expect(() => writeGuestProgress(progressAt('G1-U1-L02'), 'someone-else')).toThrow()
    // The refusal left the shared envelope exactly as it was.
    expect(JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? '{}').completedLessonIds)
      .toEqual(['G1-U1-L01'])
  })

  it('never lets a signed-in account inherit or overwrite browser guest progress', () => {
    writeGuestProgress(progressAt('G1-U1-L01'), 'guest')
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest')

    expect(readGuestProgress('user:a')).toEqual(defaultGuestProgress)
    writeGuestProgress(progressAt('G1-U1-L02'), 'user:a')

    // Guest data and the guest claim are untouched by the account write.
    expect(JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? '{}').completedLessonIds)
      .toEqual(['G1-U1-L01'])
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest')
    expect(readGuestProgress('guest').completedLessonIds).toEqual(['G1-U1-L01'])
    expect(readGuestProgress('user:a').completedLessonIds).toEqual(['G1-U1-L02'])
  })

  it('adopts bare-guest progress once the id cookie exists', () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify(progressAt('lesson-02-forest-greeting')))
    expect(readGuestProgress('guest').completedLessonIds).toEqual(['lesson-02-forest-greeting'])
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest')

    expect(readGuestProgress('guest:family-a').completedLessonIds).toEqual(['lesson-02-forest-greeting'])
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBe('guest:family-a')
    // Once adopted by the concrete id, a bare guest read is not that record.
    window.localStorage.removeItem(progressStorageKeyFor('guest'))
    expect(readGuestProgress('guest')).toEqual(defaultGuestProgress)
  })

  it('discards only the corrupt scoped envelope it read', () => {
    window.localStorage.setItem(progressStorageKeyFor('guest:family-a'), '{not json')
    window.localStorage.setItem(progressStorageKeyFor('guest:family-b'), JSON.stringify(progressAt('G1-U1-L02')))

    expect(readGuestProgress('guest:family-a')).toEqual(defaultGuestProgress)
    expect(window.localStorage.getItem(progressStorageKeyFor('guest:family-a'))).toBeNull()
    // Only A's corrupt key is dropped: B's record and the shared claim stay.
    expect(readGuestProgress('guest:family-b').completedLessonIds).toEqual(['G1-U1-L02'])
    expect(window.localStorage.getItem(GUEST_PROGRESS_OWNER_STORAGE_KEY)).toBeNull()
  })

  it('keeps the legacy no-argument path for callers without identity', () => {
    window.localStorage.setItem(GUEST_PROGRESS_STORAGE_KEY, JSON.stringify(progressAt('G1-U1-L01')))
    expect(readGuestProgress().completedLessonIds).toEqual(['G1-U1-L01'])
    writeGuestProgress(progressAt('G1-U1-L02'))
    expect(JSON.parse(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY) ?? '{}').completedLessonIds)
      .toEqual(['G1-U1-L02'])
  })
})
