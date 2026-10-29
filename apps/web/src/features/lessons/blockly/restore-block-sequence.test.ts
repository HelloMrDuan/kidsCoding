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

describe('restoreBlockSequence with repeat bodies (SYS-107)', () => {
  it('keeps a repeat and filters the blocks inside its body', () => {
    expect(
      restoreBlockSequence(
        [{ type: 'when_start' }, { type: 'repeat_times', times: 4, body: [{ type: 'move_forward' }, { type: 'say_line' }] }] as Array<{ type: string; times?: number; body?: Array<{ type: string }> }>,
        ['when_start', 'repeat_times', 'move_forward'],
      ),
    ).toEqual([{ type: 'when_start' }, { type: 'repeat_times', times: 4, body: [{ type: 'move_forward' }] }])
  })

  it('drops a repeat (with its body) when the step does not offer it', () => {
    expect(
      restoreBlockSequence([{ type: 'when_start' }, { type: 'repeat_times', body: [{ type: 'move_forward' }] }], ['when_start', 'move_forward']),
    ).toEqual([{ type: 'when_start' }])
  })
})
