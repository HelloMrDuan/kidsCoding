import { describe, expect, it } from 'vitest'
import { isDuoDesignedMistakeRun, judgeDuoProgram } from './duo-judge'

const blocks = (...types: string[]) => types.map((type) => ({ type }))

describe('duo judge (TQ-015)', () => {
  it('passes the canonical programs of all three duo lessons', () => {
    expect(judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right'), 'independent', 2).passed).toBe(true)
    expect(judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right', 'say_line'), 'dialogue', 2).passed).toBe(true)
    expect(judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right', 'repeat_twice'), 'graduation', 2).passed).toBe(true)
    expect(judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right', 'move_right'), 'graduation', 2).passed).toBe(true)
    expect(judgeDuoProgram(blocks('when_start'), 'independent', 0).passed).toBe(true)
    expect(judgeDuoProgram(blocks('when_start', 'move_right', 'say_line', 'switch_character', 'move_right'), 'independent', 4).passed).toBe(true)
  })

  it('requires the start block and connected blocks, in short sentences', () => {
    const noStart = judgeDuoProgram(blocks('move_right'), 'independent', 2)
    expect(noStart.code).toBe('no-start')
    expect(noStart.reason).toContain('开始时')
    const detached = judgeDuoProgram(
      ['when_start', 'move_right', 'switch_character', 'move_right'].map((type, i) => ({ type, disconnected: i === 2 })),
      'independent', 2,
    )
    expect(detached.code).toBe('not-connected')
    expect(detached.reason).toContain('没接好')
  })

  it('names a missing switch as “还没切换角色”', () => {
    const verdict = judgeDuoProgram(blocks('when_start', 'move_right', 'move_right'), 'independent', 2)
    expect(verdict.passed).toBe(false)
    expect(verdict.code).toBe('no-switch')
    expect(verdict.reason).toBe('还没切换角色，小熊还没动。')
    expect(verdict.fox).toBe(200)
    expect(verdict.bear).toBe(0)
  })

  it('names a switch with no bear move after it as the wrong actor', () => {
    const verdict = judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character'), 'independent', 2)
    expect(verdict.code).toBe('wrong-actor')
    expect(verdict.reason).toContain('动错角色')
  })

  it('stops at an early or repeated switch, at the failing block', () => {
    const early = judgeDuoProgram(blocks('when_start', 'switch_character', 'move_right'), 'independent', 2)
    expect(early.code).toBe('switch-early')
    expect(early.failIndex).toBe(1)
    const twice = judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'switch_character', 'move_right'), 'independent', 2)
    expect(twice.code).toBe('switch-twice')
    expect(twice.failIndex).toBe(3)
  })

  it('reports distance problems without a target/actual dump', () => {
    const foxOver = judgeDuoProgram(blocks('when_start', 'move_right', 'repeat_twice'), 'graduation', 1)
    expect(foxOver.code).toBe('wrong-distance')
    expect(foxOver.reason).toBe('小狐狸走多了，距离不对。')
    const bearShort = judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right'), 'graduation', 3)
    expect(bearShort.code).toBe('wrong-distance')
    expect(bearShort.reason).toBe('小熊要走到 200 步，还差 100 步。')
  })

  it('keeps the repeat tied to the current actor’s move', () => {
    const misplaced = judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'repeat_twice'), 'graduation', 2)
    expect(misplaced.code).toBe('repeat-misplaced')
    expect(misplaced.failIndex).toBe(3)
    const inDialogue = judgeDuoProgram(blocks('when_start', 'move_right', 'repeat_twice', 'say_line'), 'dialogue', 2)
    expect(inDialogue.code).toBe('unsupported')
  })

  it('gives dialogue to the wrong actor a short name, and spots a missing line', () => {
    const wrongActor = judgeDuoProgram(blocks('when_start', 'move_right', 'say_line', 'switch_character', 'move_right'), 'dialogue', 2)
    expect(wrongActor.code).toBe('say-wrong-actor')
    expect(wrongActor.reason).toContain('对白给错人')
    const missing = judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right'), 'dialogue', 2)
    expect(missing.code).toBe('say-missing')
    expect(missing.reason).toContain('小熊还没说')
    const tooEarly = judgeDuoProgram(blocks('when_start', 'say_line'), 'dialogue', 0)
    expect(tooEarly.code).toBe('say-not-now')
  })

  it('recognises each lesson’s designed mistake run (the step-4 experiment)', () => {
    expect(isDuoDesignedMistakeRun(judgeDuoProgram(blocks('when_start', 'move_right', 'move_right'), 'independent', 3), 'independent')).toBe(true)
    expect(isDuoDesignedMistakeRun(judgeDuoProgram(blocks('when_start', 'move_right', 'say_line', 'switch_character', 'move_right'), 'dialogue', 3), 'dialogue')).toBe(true)
    expect(isDuoDesignedMistakeRun(judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right'), 'graduation', 3), 'graduation')).toBe(true)
    expect(isDuoDesignedMistakeRun(judgeDuoProgram(blocks('when_start', 'move_right', 'switch_character', 'move_right'), 'independent', 3), 'independent')).toBe(false)
  })
})
