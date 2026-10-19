import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import type { HintLayer } from '@/features/domain/types'

import { buildHintState } from './build-hint-state'

const layers: HintLayer[] = [
  { id: 'h1', mode: 'repeat_goal', copy: '再看一下目标。' },
  { id: 'h2', mode: 'show_block', copy: '先拖开始积木。' },
  {
    id: 'h3',
    mode: 'offer_remedial',
    copy: '先去学一个小课。',
    remedialLessonId: 'remedial-start-sequence',
  },
]

describe('buildHintState (TQ-008 escalation 1 → 2 → 3)', () => {
  it('shows no hint before any failure', () => {
    const state = buildHintState({ failedAttempts: 0, hintLayers: layers })
    expect(state.tier).toBe(0)
    expect(state.activeHint).toBeNull()
    expect(state.showRemedialJump).toBe(false)
  })

  it('escalates exactly one tier per failure, in order', () => {
    const seen = [1, 2, 3].map((failedAttempts) => buildHintState({ failedAttempts, hintLayers: layers }))
    expect(seen.map((state) => state.tier)).toEqual([1, 2, 3])
    expect(seen.map((state) => state.activeHint?.id)).toEqual(['h1', 'h2', 'h3'])
    expect(seen.map((state) => state.showRemedialJump)).toEqual([false, false, true])
  })

  it('the first failure shows tier 1 (regression: it used to jump to tier 2)', () => {
    expect(buildHintState({ failedAttempts: 1, hintLayers: layers }).activeHint?.mode).toBe('repeat_goal')
  })

  it('stays on the remedial tier after more failures', () => {
    const state = buildHintState({ failedAttempts: 7, hintLayers: layers })
    expect(state.tier).toBe(3)
    expect(state.activeHint?.mode).toBe('offer_remedial')
    expect(state.showRemedialJump).toBe(true)
  })

  it('handles lessons without hint layers', () => {
    expect(buildHintState({ failedAttempts: 2, hintLayers: [] }).activeHint).toBeNull()
  })

  it('every launch lesson orders its tiers repeat_goal → show_block → offer_remedial', () => {
    for (const lesson of launchLessons) {
      expect(lesson.hintLayers.map((layer) => layer.mode), lesson.id).toEqual(['repeat_goal', 'show_block', 'offer_remedial'])
    }
  })
})
