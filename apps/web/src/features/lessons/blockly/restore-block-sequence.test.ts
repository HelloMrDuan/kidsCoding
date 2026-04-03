import { describe, expect, it } from 'vitest'

import { restoreBlockSequence } from './restore-block-sequence'

describe('restoreBlockSequence', () => {
  it('keeps earlier blocks when the next step expands the allowed set', () => {
    expect(
      restoreBlockSequence([{ type: 'when_start' }], ['when_start', 'move_right']),
    ).toEqual([{ type: 'when_start' }])
  })

  it('drops blocks that are no longer allowed in the next step', () => {
    expect(
      restoreBlockSequence(
        [{ type: 'when_start' }, { type: 'move_right' }],
        ['when_start', 'say_line'],
      ),
    ).toEqual([{ type: 'when_start' }])
  })
})
