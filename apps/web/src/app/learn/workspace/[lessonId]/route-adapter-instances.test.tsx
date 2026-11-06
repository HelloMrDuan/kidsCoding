import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import WorkspaceDemoPage from './page'
import { BlocklyAdapter } from '@/features/lessons/workspace/blockly-adapter'
import { draftKeyFor } from '@/features/lessons/workspace/lesson-contract'

/**
 * Demo route adapter instances (compat defects 2b/4a): adapter instances
 * carry per-lesson state (the Blockly stageTarget, the Scratch
 * lastState), so the route must build one instance per lesson — never
 * share one across lessons even when engine + target match. A shared
 * instance judges the new lesson by the old lesson's target (4a) and
 * lets the Scratch poller write the old lesson's state into the new
 * one (2b).
 *
 * The second lesson below ('demo-a2') is synthetic: same engine and
 * target as demo-a (200/80), different lessonId. Only the memo key
 * (lessonId) can separate them.
 *
 * jsdom has no server for /blockly-media, so a real Blockly.inject
 * leaves 6 unhandled mp3 rejections and makes Vitest exit 1. The
 * mount() stub below skips only the DOM injection; the constructor,
 * script loading, state and judgment stay real, and the mount-call
 * count still proves the route builds a separate instance per lesson.
 */
vi.mock('@/features/lessons/workspace/blockly-adapter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/lessons/workspace/blockly-adapter')>()
  class MountStubAdapter extends actual.BlocklyAdapter {
    mount() {
      // No Blockly.inject in jsdom (see header).
    }
  }
  return { ...actual, BlocklyAdapter: MountStubAdapter }
})

vi.mock('@/features/lessons/workspace/demo-contracts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/lessons/workspace/demo-contracts')>()
  return {
    ...actual,
    getDemoContract: (lessonId: string) => {
      if (lessonId === 'demo-a2') {
        return {
          ...actual.DEMO_A,
          contract: {
            ...actual.DEMO_A.contract,
            lessonId: 'demo-a2',
            title: '演示 A2：同目标第二课',
            draftKey: draftKeyFor('demo-a2'),
          },
        }
      }
      return actual.getDemoContract(lessonId)
    },
  }
})

/** React 19 `use(params)`: a bare Promise.resolve never retries in this
 * jsdom env, so pass a status-primed fulfilled thenable instead. It must
 * still carry a `then` (React rejects a plain object without one). */
function paramsFor(lessonId: string) {
  const value = { lessonId }
  return {
    status: 'fulfilled',
    value,
    then(onFulfilled?: (v: { lessonId: string }) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(value).then(onFulfilled, onRejected)
    },
  } as unknown as Promise<{ lessonId: string }>
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('demo route adapter instances (compat 2b/4a)', () => {
  it('two lessons with the same engine + target get separate adapter instances', () => {
    const mountSpy = vi.spyOn(BlocklyAdapter.prototype, 'mount')
    try {
      const { rerender } = render(<WorkspaceDemoPage params={paramsFor('demo-a')} />)
      expect(mountSpy).toHaveBeenCalledTimes(1)
      // Same engine + target, different lesson: a new instance must mount.
      rerender(<WorkspaceDemoPage params={paramsFor('demo-a2')} />)
      expect(mountSpy).toHaveBeenCalledTimes(2)
      // Same lesson re-rendered: no remount.
      rerender(<WorkspaceDemoPage params={paramsFor('demo-a2')} />)
      expect(mountSpy).toHaveBeenCalledTimes(2)
    } finally {
      mountSpy.mockRestore()
    }
  })
})
