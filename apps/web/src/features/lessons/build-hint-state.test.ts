import { describe, expect, it } from 'vitest'

import { buildHintState } from './build-hint-state'

describe('buildHintState', () => {
  it('escalates to remedial after two failed attempts', () => {
    const state = buildHintState({
      failedAttempts: 2,
      hintLayers: [
        { id: 'h1', mode: 'repeat_goal', copy: '再看一下目标。' },
        { id: 'h2', mode: 'show_block', copy: '先拖开始积木。' },
        {
          id: 'h3',
          mode: 'offer_remedial',
          copy: '先去学一个小课。',
          remedialLessonId: 'remedial-click-trigger',
        },
      ],
    })

    expect(state.activeHint?.mode).toBe('offer_remedial')
    expect(state.showRemedialJump).toBe(true)
  })
})
