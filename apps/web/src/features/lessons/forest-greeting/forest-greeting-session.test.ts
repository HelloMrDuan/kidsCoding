import { describe, expect, it } from 'vitest'

import { createGreetingSessionStore, emptyGreetingSessionState } from './forest-greeting-session'
import { emptyGreetingDraft } from './forest-greeting-draft'

describe('forest-greeting session store', () => {
  it('starts empty, patches state, and notifies subscribers', () => {
    const store = createGreetingSessionStore()
    expect(store.getState()).toEqual(emptyGreetingSessionState())
    let calls = 0
    const unsubscribe = store.subscribe(() => {
      calls += 1
    })
    const draft = emptyGreetingDraft()
    draft.stepIndex = 2
    store.setState({ draft, observed: ['step-4'] })
    expect(calls).toBe(1)
    expect(store.getState().draft.stepIndex).toBe(2)
    expect(store.getState().observed).toEqual(['step-4'])
    unsubscribe()
    store.setState({ mistakeAnswers: { 'step-4': 'stayed' } })
    expect(calls).toBe(1)
    expect(store.getState().mistakeAnswers).toEqual({ 'step-4': 'stayed' })
  })

  it('accepts an initial state (route restores the draft into it)', () => {
    const initial = emptyGreetingSessionState()
    initial.draft.stepIndex = 1
    const store = createGreetingSessionStore(initial)
    expect(store.getState().draft.stepIndex).toBe(1)
  })

  it('getServerSnapshot always returns the creation-time initial state', () => {
    const initial = emptyGreetingSessionState()
    initial.draft.stepIndex = 1
    const store = createGreetingSessionStore(initial)
    // SSR 预渲染必填：useSyncExternalStore 的第三参数。setState 后服务端
    // 快照仍是初始状态，且引用稳定（React 要求服务端快照不变化）。
    expect(store.getServerSnapshot()).toBe(initial)
    const draft = emptyGreetingDraft()
    draft.stepIndex = 3
    store.setState({ draft })
    expect(store.getState().draft.stepIndex).toBe(3)
    expect(store.getServerSnapshot()).toBe(initial)
    expect(store.getServerSnapshot().draft.stepIndex).toBe(1)
  })
})
