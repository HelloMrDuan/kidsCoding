import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { evaluateStep } from './evaluate-step'
import { evaluateObservable, simulateProgram } from './observable-run'

const b = (...types: string[]) => types.map((type) => ({ type }))
const singleActorLessons = launchLessons.filter((lesson) => !lesson.steps.some((step) => step.requiredBlockTypes.includes('switch_character')))

describe('SYS-103 observable Blockly evaluation', () => {
  it('every single-actor launch step has a runnable reference goal that passes itself', () => {
    expect(singleActorLessons.length).toBe(9)
    for (const lesson of singleActorLessons) {
      for (const step of lesson.steps) {
        expect(simulateProgram(b(...step.requiredBlockTypes)).ok, `${lesson.id}/${step.id}`).toBe(true)
        expect(evaluateStep(step.requiredBlockTypes, b(...step.requiredBlockTypes)), `${lesson.id}/${step.id}`).toBe(true)
      }
    }
  })

  it('accepts a reasonable equivalent: two moves == move + repeat', () => {
    const goal = ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line']
    expect(evaluateObservable(goal, b('when_start', 'move_right', 'switch_scene', 'move_right', 'say_line')).passed).toBe(true)
    expect(evaluateObservable(['when_start', 'move_right', 'move_right'], b('when_start', 'move_right', 'repeat_twice')).passed).toBe(true)
  })

  it('rejects counter-examples with a child-facing reason', () => {
    const order = evaluateObservable(['when_start', 'move_right', 'switch_scene'], b('when_start', 'switch_scene', 'move_right'))
    expect(order.passed).toBe(false)
    expect(order.reason).toContain('先在森林走 100 步')

    const early = evaluateObservable(['when_start', 'move_right', 'say_line'], b('when_start', 'say_line', 'move_right'))
    expect(early.passed).toBe(false)
    expect(early.reason).toContain('说话的时机')

    const trigger = evaluateObservable(['when_clicked', 'move_right'], b('when_start', 'move_right'))
    expect(trigger.passed).toBe(false)
    expect(trigger.reason).toContain('被点击时')

    const extra = evaluateObservable(['when_start', 'move_right'], b('when_start', 'move_right', 'move_right'))
    expect(extra.reason).toContain('目标：一共移动 100 步')

    const noTalk = evaluateObservable(['when_start'], b('when_start', 'say_line'))
    expect(noTalk.reason).toContain('还不用说话')
  })

  it('a program that cannot run never earns completion', () => {
    expect(evaluateStep(['when_start', 'move_right'], b('move_right', 'when_start'))).toBe(false)
    expect(evaluateStep(['when_start', 'move_right'], [{ type: 'when_start' }, { type: 'move_right', disconnected: true }])).toBe(false)
    expect(evaluateStep(['when_start', 'move_right', 'repeat_twice'], b('when_start', 'repeat_twice', 'move_right'))).toBe(false)
    expect(evaluateStep(['when_start', 'move_right'], b('when_start', 'unknown_block'))).toBe(false)
    expect(evaluateStep(['when_start'], [])).toBe(false)
    expect(evaluateStep(['when_start', 'move_right'], b('when_start', ...Array(24).fill('move_right')))).toBe(false)
    expect(evaluateStep(['when_start', 'switch_scene'], b('when_start', 'switch_scene', 'switch_scene'))).toBe(false)
  })
})
