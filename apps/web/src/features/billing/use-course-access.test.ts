import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useCourseAccess } from './use-course-access'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('useCourseAccess', () => {
  it('returns true when /api/course-access reports an active launch pack', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ hasLaunchPack: true }) })),
    )

    const { result } = renderHook(() => useCourseAccess())

    await waitFor(() => {
      expect(result.current.hasLaunchPack).toBe(true)
    })
  })

  it('fails closed to false on non-OK, malformed, and network failures', async () => {
    // Start entitled, then prove every failure mode locks again.
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ hasLaunchPack: true }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCourseAccess())

    await waitFor(() => {
      expect(result.current.hasLaunchPack).toBe(true)
    })

    fetchMock.mockImplementationOnce(async () => ({ ok: false, json: async () => ({}) }))
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => {
      expect(result.current.hasLaunchPack).toBe(false)
    })

    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ hasLaunchPack: 'yes' }),
    }))
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled()
    })
    // Malformed payload ('yes' is not boolean true) must not grant access.
    expect(result.current.hasLaunchPack).toBe(false)

    fetchMock.mockImplementationOnce(async () => {
      throw new Error('network down')
    })
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
    })
    await waitFor(() => {
      expect(result.current.hasLaunchPack).toBe(false)
    })
  })

  it('refetches when the tab becomes visible again (permission change)', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ hasLaunchPack: false }),
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useCourseAccess())

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })
    expect(result.current.hasLaunchPack).toBe(false)

    fetchMock.mockImplementationOnce(async () => ({
      ok: true,
      json: async () => ({ hasLaunchPack: true }),
    }))
    await act(async () => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => {
      expect(result.current.hasLaunchPack).toBe(true)
    })
  })
})
