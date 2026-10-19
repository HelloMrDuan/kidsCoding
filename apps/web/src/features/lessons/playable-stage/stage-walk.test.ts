import { describe, expect, it } from 'vitest'

import { STAGE_ARRIVAL_STEPS, stageWalkProgress } from './playable-stage'

describe('TQ-009 stage walk scaling', () => {
  it('maps story steps onto the track that ends beside the friend', () => {
    expect(STAGE_ARRIVAL_STEPS).toBe(200)
    expect(stageWalkProgress(0)).toBe(0)
    expect(stageWalkProgress(100)).toBe(0.5)
    expect(stageWalkProgress(200)).toBe(1)
  })

  it('never walks past the friend or backwards, even for wrong programs', () => {
    expect(stageWalkProgress(300)).toBe(1)
    expect(stageWalkProgress(2300)).toBe(1)
    expect(stageWalkProgress(-100)).toBe(0)
    expect(stageWalkProgress(Number.NaN)).toBe(0)
  })
})
