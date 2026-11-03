import { describe, expect, it } from 'vitest'

import { isFreshScratchMessage, mapSnapshotToState } from './scratch-adapter'

describe('scratch snapshot mapping (pure)', () => {
  it('maps the first target x and never invents a score', () => {
    const state = mapSnapshotToState({ targets: [{ id: '1', name: '流星', x: 42, y: 10 }] })
    expect(state.x).toBe(42)
    expect(state.score).toBe(0)
  })

  it('passes a snapshot-carried score through, defaults to 0 without one', () => {
    expect(mapSnapshotToState({ targets: [], score: 3 }).score).toBe(3)
    expect(mapSnapshotToState({}).x).toBe(0)
    expect(mapSnapshotToState({ targets: [{ x: Number.NaN }] }).x).toBe(0)
  })
})

describe('scratch message freshness (labs msg.id pattern)', () => {
  it('accepts only the current id', () => {
    expect(isFreshScratchMessage(5, 5)).toBe(true)
    expect(isFreshScratchMessage(4, 5)).toBe(false)
    expect(isFreshScratchMessage(5, null)).toBe(false)
    expect(isFreshScratchMessage('5', 5)).toBe(false)
  })
})
