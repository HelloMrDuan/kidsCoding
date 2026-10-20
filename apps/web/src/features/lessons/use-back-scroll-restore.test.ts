import { StrictMode, createElement, type ReactNode } from 'react'
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// UX-104: Back to /learn/map is a full document load (lesson cards are
// plain <a> links). The pre-hydration map can be shorter than the
// hydrated one, so the browser clamps the restored scroll. The hook
// re-applies the saved offset once the document is tall enough.

const KEY = 'learn-map'
const STORAGE_KEY = 'kc-scroll-restore:learn-map'

let navigationType: string
let scrollHeight: number
let rafQueue: FrameRequestCallback[]
let now: number

async function loadHook() {
  // consumedKeys is module state (one restore per document load), so
  // every test gets a fresh module, i.e. a fresh "document".
  vi.resetModules()
  return import('./use-back-scroll-restore')
}

function flushFrame() {
  const queue = rafQueue
  rafQueue = []
  for (const callback of queue) callback(now)
}

beforeEach(() => {
  navigationType = 'back_forward'
  scrollHeight = 500
  rafQueue = []
  now = 0
  window.sessionStorage.clear()
  Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 0 })
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 300 })
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  })
  vi.spyOn(performance, 'getEntriesByType').mockImplementation(
    () => [{ type: navigationType }] as unknown as PerformanceEntryList,
  )
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  vi.spyOn(window, 'scrollTo').mockImplementation(((_x: number, y: number) => {
    ;(window as unknown as { scrollY: number }).scrollY = y
  }) as typeof window.scrollTo)
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    rafQueue.push(callback)
    return rafQueue.length
  })
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {
    rafQueue = []
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useBackScrollRestore', () => {
  it('saves the scroll offset when the page is left (pagehide)', async () => {
    const { useBackScrollRestore } = await loadHook()
    navigationType = 'navigate'
    renderHook(() => useBackScrollRestore(KEY))
    ;(window as unknown as { scrollY: number }).scrollY = 214
    window.dispatchEvent(new Event('pagehide'))
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('214')
  })

  it('waits for the hydrated page to grow, then restores the saved offset', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, '214')
    // Pre-hydration document: 22px too short for 214 (max scroll 192).
    scrollHeight = 492
    const { useBackScrollRestore } = await loadHook()
    renderHook(() => useBackScrollRestore(KEY))
    expect(window.scrollTo).not.toHaveBeenCalled()

    now = 16
    flushFrame()
    expect(window.scrollTo).not.toHaveBeenCalled()

    scrollHeight = 514
    now = 32
    flushFrame()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 214)
    expect(window.scrollY).toBe(214)
    expect(rafQueue).toHaveLength(0)
  })

  it('never scrolls on a normal (non back/forward) navigation', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, '214')
    navigationType = 'navigate'
    const { useBackScrollRestore } = await loadHook()
    renderHook(() => useBackScrollRestore(KEY))
    flushFrame()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('stops as soon as the learner interacts', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, '214')
    scrollHeight = 400
    const { useBackScrollRestore } = await loadHook()
    renderHook(() => useBackScrollRestore(KEY))
    window.dispatchEvent(new Event('touchstart'))
    scrollHeight = 600
    flushFrame()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('gives up after the restore window', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, '214')
    scrollHeight = 400
    const { useBackScrollRestore } = await loadHook()
    renderHook(() => useBackScrollRestore(KEY))
    now = 1600
    flushFrame()
    expect(rafQueue).toHaveLength(0)
    scrollHeight = 600
    flushFrame()
    expect(window.scrollTo).not.toHaveBeenCalled()
  })

  it('restores only once per document load', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, '214')
    scrollHeight = 600
    const { useBackScrollRestore } = await loadHook()
    const first = renderHook(() => useBackScrollRestore(KEY))
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
    first.unmount()
    // A later client-side visit in the same document: the navigation
    // entry still says back_forward, but the offset must not be re-applied.
    window.sessionStorage.setItem(STORAGE_KEY, '120')
    renderHook(() => useBackScrollRestore(KEY))
    expect(window.scrollTo).toHaveBeenCalledTimes(1)
  })

  it('still restores under React Strict Mode double mounting', async () => {
    window.sessionStorage.setItem(STORAGE_KEY, '214')
    scrollHeight = 492
    const { useBackScrollRestore } = await loadHook()
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(StrictMode, null, children)
    renderHook(() => useBackScrollRestore(KEY), { wrapper })
    // The Strict Mode unmount must not overwrite the saved offset with
    // the clamped pre-hydration position.
    expect(window.sessionStorage.getItem(STORAGE_KEY)).toBe('214')
    scrollHeight = 514
    flushFrame()
    expect(window.scrollTo).toHaveBeenCalledWith(0, 214)
  })
})
