import { describe, expect, it } from 'vitest'

import { evaluateStep } from './evaluate-step'

describe('evaluateStep', () => {
  it('accepts the required blocks in order', () => {
    expect(
      evaluateStep(['when_start', 'move_right'], [
        { type: 'when_start' },
        { type: 'move_right' },
      ]),
    ).toBe(true)
  })

  it('rejects blocks when the order is wrong', () => {
    expect(
      evaluateStep(['when_start', 'move_right'], [
        { type: 'move_right' },
        { type: 'when_start' },
      ]),
    ).toBe(false)
  })
})
