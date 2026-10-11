import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearGuestProgress, defaultGuestProgress, readGuestProgress, writeGuestProgress } from './local-progress'

describe('graduation persistence failures', () => {
  afterEach(() => { vi.restoreAllMocks(); clearGuestProgress() })
  it('retains the persisted reward and project when storage rejects an update', () => {
    clearGuestProgress()
    const stored = { ...defaultGuestProgress, stars: 3, completedLessonIds: ['lesson-12-graduation-show'] }
    writeGuestProgress(stored)
    const notification = vi.fn()
    window.addEventListener('kc-progress-change', notification)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError') })
    expect(() => writeGuestProgress({ ...stored, stars: 6 })).toThrow()
    expect(readGuestProgress()).toEqual(stored)
    expect(notification).not.toHaveBeenCalled()
    window.removeEventListener('kc-progress-change', notification)
  })
})
