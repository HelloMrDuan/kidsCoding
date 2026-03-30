import { describe, expect, it } from 'vitest'

import type { AssessmentAnswer } from '@/features/domain/types'

import { recommendStartLevel } from './recommend-start-level'

const lowAnswers: AssessmentAnswer[] = [
  { questionId: 'sequence', optionId: 'one_by_one', score: 1 },
  { questionId: 'loop', optionId: 'not_sure', score: 0 },
  { questionId: 'event', optionId: 'click_once', score: 1 },
]

describe('recommendStartLevel', () => {
  it('returns starter for younger zero-based learners', () => {
    expect(recommendStartLevel('age_6_8', lowAnswers)).toBe('starter')
  })
})
