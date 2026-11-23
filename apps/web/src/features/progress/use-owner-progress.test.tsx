import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { ownerRef } = vi.hoisted(() => ({
  ownerRef: { current: null as string | null },
}))
vi.mock('@/features/lessons/use-resolved-draft-owner', () => ({
  useResolvedDraftOwner: () => ownerRef.current,
}))

import {
  GUEST_PROGRESS_STORAGE_KEY,
  defaultGuestProgress,
  type GuestProgress,
} from './local-progress'
import { useOwnerProgress } from './use-owner-progress'

const progressAt = (lessonId: string): GuestProgress => ({
  ...defaultGuestProgress,
  currentLessonId: lessonId,
  completedLessonIds: [lessonId],
})

beforeEach(() => {
  window.localStorage.clear()
  ownerRef.current = null
})

describe('useOwnerProgress (PR #573 review P1-2)', () => {
  it('fails closed while the owner is unresolved instead of reading the browser-wide record', () => {
    window.localStorage.setItem(
      GUEST_PROGRESS_STORAGE_KEY,
      JSON.stringify(progressAt('lesson-02-forest-greeting')),
    )
    const { result } = renderHook(() => useOwnerProgress())
    expect(result.current.owner).toBeNull()
    expect(result.current.progress).toEqual(defaultGuestProgress)
  })

  it('reads guest A\'s legacy progress, lets B see nothing, then restores A on the way back', () => {
    window.localStorage.setItem(
      GUEST_PROGRESS_STORAGE_KEY,
      JSON.stringify(progressAt('lesson-02-forest-greeting')),
    )

    ownerRef.current = 'guest:family-a'
    const { result, rerender } = renderHook(() => useOwnerProgress())
    expect(result.current.owner).toBe('guest:family-a')
    expect(result.current.progress.completedLessonIds).toEqual(['lesson-02-forest-greeting'])

    // A → B: B has no record of its own and must not inherit A's.
    ownerRef.current = 'guest:family-b'
    rerender()
    expect(result.current.owner).toBe('guest:family-b')
    expect(result.current.progress).toEqual(defaultGuestProgress)

    // A → B → A: A's record is exactly what A left.
    ownerRef.current = 'guest:family-a'
    rerender()
    expect(result.current.progress.completedLessonIds).toEqual(['lesson-02-forest-greeting'])
    // The compatibility read never deletes the historical envelope.
    expect(window.localStorage.getItem(GUEST_PROGRESS_STORAGE_KEY)).not.toBeNull()
  })

  it('treats an unknown identity string as unresolved and reads nothing', () => {
    window.localStorage.setItem(
      GUEST_PROGRESS_STORAGE_KEY,
      JSON.stringify(progressAt('lesson-02-forest-greeting')),
    )
    ownerRef.current = 'someone-else'
    const { result } = renderHook(() => useOwnerProgress())
    expect(result.current.progress).toEqual(defaultGuestProgress)
  })
})
