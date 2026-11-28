import { describe, expect, it } from 'vitest'

import { getMistakeStep } from '@/content/curriculum/mistake-steps'
import { getSayLineChoices } from '@/features/lessons/blockly/step-judge-options'

import {
  coerceLaunchDraft,
  emptyLaunchDraft,
  isEmptyLaunchDraft,
  isValidLaunchDraft,
  launchV3DraftKey,
} from './launch-v3-draft'
import { LAUNCH_V3_LESSON_IDS, launchV3StepIds } from './launch-v3-lessons'

describe('OPS-056 launch-v3 draft', () => {
  it.each(LAUNCH_V3_LESSON_IDS)(
    '%s: the empty draft is valid, keyed per step, with the designed mistake pre-placed',
    (id) => {
      const draft = emptyLaunchDraft(id)
      expect(Object.keys(draft.programs)).toEqual(launchV3StepIds(id))
      expect(isValidLaunchDraft(id, draft)).toBe(true)
      expect(isEmptyLaunchDraft(draft)).toBe(true)
      for (const stepId of launchV3StepIds(id)) {
        const mistake = getMistakeStep(id, stepId)
        expect(draft.programs[stepId]).toEqual(
          mistake ? mistake.wrongProgram.map((block) => ({ ...block })) : [],
        )
      }
      expect(launchV3DraftKey(id)).toBe(`kidscoding-draft:${id}`)
    },
  )

  it('rejects another lesson, an unknown block, an out-of-range step and lesson-01', () => {
    const draft = emptyLaunchDraft('lesson-03-forest-story')
    expect(isValidLaunchDraft('lesson-04-meadow-scene', draft)).toBe(false)
    expect(isValidLaunchDraft('lesson-03-forest-story', { ...draft, stepIndex: 9 })).toBe(false)
    expect(
      isValidLaunchDraft('lesson-03-forest-story', {
        ...draft,
        programs: { 'step-1': [{ type: 'switch_character' }] },
      }),
    ).toBe(false)
    expect(isValidLaunchDraft('lesson-01-forest-hello', emptyLaunchDraft('lesson-01-forest-hello'))).toBe(false)
  })

  it('lesson-02: a known line id is valid; an unknown one is invalid and only the line is stripped', () => {
    const id = 'lesson-02-forest-greeting'
    const line = getSayLineChoices(id)![0].id
    const ok = {
      ...emptyLaunchDraft(id),
      programs: { 'step-2': [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line }] },
    }
    expect(isValidLaunchDraft(id, ok)).toBe(true)
    const bad = {
      ...ok,
      programs: { 'step-2': [{ type: 'when_start' }, { type: 'say_line', line: 'not-a-line' }] },
    }
    expect(isValidLaunchDraft(id, bad)).toBe(false)
    expect(coerceLaunchDraft(id, bad).programs['step-2']).toEqual([
      { type: 'when_start' },
      { type: 'say_line' },
    ])
  })

  it('coerce: drops unknown blocks and steps, clamps the step, resets bad failures', () => {
    const id = 'lesson-05-meadow-order'
    const coerced = coerceLaunchDraft(id, {
      version: 1,
      lessonId: id,
      stepIndex: 42,
      programs: {
        'step-1': [{ type: 'when_start' }, { type: 'fly_away' }, { type: 'move_right' }],
        ghost: [],
      },
      passed: ['step-1', 'ghost'],
      failures: -1,
    })
    expect(coerced.stepIndex).toBe(launchV3StepIds(id).length - 1)
    expect(coerced.programs['step-1']).toEqual([{ type: 'when_start' }, { type: 'move_right' }])
    expect(coerced.programs).not.toHaveProperty('ghost')
    expect(coerced.passed).toEqual(['step-1'])
    expect(coerced.failures).toBe(0)
    expect(isValidLaunchDraft(id, coerced)).toBe(true)
  })

  it('coerce: a draft of another lesson falls back to this lesson\'s empty draft', () => {
    const id = 'lesson-05-meadow-order'
    expect(coerceLaunchDraft(id, emptyLaunchDraft('lesson-06-meadow-story'))).toEqual(emptyLaunchDraft(id))
    expect(coerceLaunchDraft(id, null)).toEqual(emptyLaunchDraft(id))
  })
})
