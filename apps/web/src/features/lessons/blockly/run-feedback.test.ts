import { describe, expect, it } from 'vitest'

import { evaluateObservable, type ProgramBlock } from './observable-run'
import { explainRunFailure } from './run-feedback'

const b = (...types: string[]): ProgramBlock[] => types.map((type) => ({ type }))
const explain = (goal: string[], program: ProgramBlock[], actor?: string) => {
  const verdict = evaluateObservable(goal, program)
  return { code: verdict.code, text: explainRunFailure(verdict, actor) }
}

const GREETING = ['when_start', 'move_right', 'say_line']
const MEADOW = ['when_start', 'move_right', 'switch_scene']
const CLICK = ['when_clicked', 'move_right']

describe('kid-friendly failure reasons from the real judge (TQ-008)', () => {
  it.each([
    ['empty program', GREETING, b(), 'empty', '先放一块“开始时”'],
    ['missing start block', GREETING, b('move_right', 'say_line'), 'missing-start', '把“开始时”放在最上面'],
    ['missing click hat in a click lesson', CLICK, b('move_right'), 'missing-start', '把“被点击时”放在最上面'],
    ['disconnected block', GREETING, [{ type: 'when_start' }, { type: 'move_right', disconnected: true }], 'disconnected', '掉队'],
    ['two start blocks', GREETING, b('when_start', 'when_start', 'move_right'), 'extra-start', '一块就够'],
    ['repeat before any move', ['when_start', 'move_right', 'move_right'], b('when_start', 'repeat_twice'), 'repeat-without-move', '要跟在移动后面'],
    ['wrong trigger (needs click)', CLICK, b('when_start', 'move_right'), 'needs-click-trigger', '换成“被点击时”'],
    ['wrong trigger (needs start)', GREETING, b('when_clicked', 'move_right', 'say_line'), 'needs-start-trigger', '换成“开始时”'],
    ['no scene switch', MEADOW, b('when_start', 'move_right'), 'missing-scene-switch', '还在森林里'],
    ['scene switched too early (wrong order)', MEADOW, b('when_start', 'switch_scene', 'move_right'), 'scene-switch-early', '换场景换早啦'],
    ['too few moves', ['when_start', 'move_right', 'move_right'], b('when_start', 'move_right'), 'too-few-moves', '只走了 100 步，要走 200 步'],
    ['too many moves', ['when_start', 'move_right'], b('when_start', 'move_right', 'move_right'), 'too-many-moves', '走过头啦'],
    ['missing say block', GREETING, b('when_start', 'move_right'), 'missing-say', '还没开口'],
    ['say not needed yet', ['when_start', 'move_right'], b('when_start', 'move_right', 'say_line'), 'extra-say', '先不用说话'],
    ['say too early (say before move)', GREETING, b('when_start', 'say_line', 'move_right'), 'say-too-early', '说话说早啦'],
    ['say too late', ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], b('when_clicked', 'move_right', 'repeat_twice', 'say_line'), 'say-too-late', '说话说晚啦'],
  ])('%s', (_name, goal, program, code, phrase) => {
    const result = explain(goal, program)
    expect(result.code).toBe(code)
    expect(result.text).toContain(phrase)
  })

  it('names the lesson character and never falls back to the generic “和任务要求一样” copy', () => {
    const result = explain(CLICK, b('when_clicked'), '小蝴蝶')
    expect(result.text).toContain('小蝴蝶')
    expect(result.text).not.toContain('任务要求的积木一样')
  })

  it('every reason is short (≤ 40 characters) for 5–7 year olds', () => {
    const programs: Array<[string[], ProgramBlock[]]> = [
      [GREETING, b()], [GREETING, b('move_right')], [CLICK, b('when_start', 'move_right')],
      [MEADOW, b('when_start', 'switch_scene', 'move_right')], [GREETING, b('when_start', 'say_line', 'move_right')],
      [['when_start', 'move_right', 'move_right'], b('when_start', 'move_right')],
    ]
    for (const [goal, program] of programs) {
      const text = explain(goal, program).text
      expect(text.length, text).toBeLessThanOrEqual(40)
      expect(text.length).toBeGreaterThan(0)
    }
  })

  it('returns nothing for a passing program', () => {
    expect(explain(GREETING, b(...GREETING)).text).toBe('')
  })
})
