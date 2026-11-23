import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useResolvedDraftOwner } from './use-resolved-draft-owner'

/**
 * PR #573 review: a focus/pageshow/storage/visibility re-check must fail closed
 * immediately. The previous account's owner may not survive until the new
 * `/api/lesson-draft-owner` response arrives.
 */
const state = {
  nextOwner: 'guest:family-a' as string | null,
  failNext: false,
}
const pending: Array<() => void> = []

const fetchMock = vi.fn(
  () =>
    new Promise<Response>((resolve, reject) => {
      // Capture the identity at request time so a stale response carries the
      // owner that was current when that request started.
      const fail = state.failNext
      const owner = state.nextOwner
      pending.push(() => {
        if (fail) {
          reject(new Error('offline'))
          return
        }
        resolve({ ok: true, json: async () => ({ owner }) } as Response)
      })
    }),
)

const settle = async () => {
  await act(async () => {
    pending.shift()?.()
    await Promise.resolve()
  })
}

beforeEach(() => {
  state.nextOwner = 'guest:family-a'
  state.failNext = false
  pending.length = 0
  fetchMock.mockClear()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useResolvedDraftOwner (PR #573 review revalidation)', () => {
  it('adopts the owner only after the API confirms it', async () => {
    const { result } = renderHook(() => useResolvedDraftOwner())
    expect(result.current).toBeNull()
    await settle()
    expect(result.current).toBe('guest:family-a')
  })

  for (const signal of ['focus', 'pageshow', 'storage', 'visibilitychange'] as const) {
    it(`drops the previous owner as soon as ${signal} starts a re-check`, async () => {
      const { result } = renderHook(() => useResolvedDraftOwner())
      await settle()
      expect(result.current).toBe('guest:family-a')

      state.nextOwner = 'guest:family-b'
      await act(async () => {
        if (signal === 'visibilitychange') document.dispatchEvent(new Event(signal))
        else window.dispatchEvent(new Event(signal))
      })

      // Still waiting for the API: no account may be read in this window.
      expect(result.current).toBeNull()
      await settle()
      expect(result.current).toBe('guest:family-b')
    })
  }

  it('stays unresolved when the re-check fails instead of falling back to the previous owner', async () => {
    const { result } = renderHook(() => useResolvedDraftOwner())
    await settle()
    expect(result.current).toBe('guest:family-a')

    state.failNext = true
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(result.current).toBeNull()
    await settle()
    expect(result.current).toBeNull()
  })

  it('ignores a stale response that loses the race to a newer re-check', async () => {
    const { result } = renderHook(() => useResolvedDraftOwner())
    await settle()
    expect(result.current).toBe('guest:family-a')

    // First re-check (A) is still in flight when a second one starts.
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    state.nextOwner = 'guest:family-b'
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    expect(result.current).toBeNull()

    // The newer request answers first, then the stale one; the stale owner
    // must not overwrite the confirmed B.
    pending[1]?.()
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current).toBe('guest:family-b')
    pending[0]?.()
    await act(async () => {
      await Promise.resolve()
    })
    expect(result.current).toBe('guest:family-b')
  })
})
