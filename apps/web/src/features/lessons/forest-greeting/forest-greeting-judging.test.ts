import { describe, expect, it } from 'vitest'

import { FOREST_GREETING_LINES } from '@/features/lessons/blockly/say-line-presets'

import {
  buildGreetingJudgment,
  greetingKnowledgePassed,
  greetingStepRequiredBlocks,
  GREETING_STEP_GOALS,
  GREETING_STEP_SPEAK_AT,
  judgeGreetingStep,
} from './forest-greeting-judging'

const start = { type: 'when_start' }
const move = { type: 'move_right' }
const say = { type: 'say_line' }

describe('forest-greeting judging', () => {
  it('step targets come from the lesson data, not a second copy', () => {
    expect(greetingStepRequiredBlocks('step-1')).toEqual(['when_start', 'move_right'])
    expect(greetingStepRequiredBlocks('step-2')).toEqual(['when_start', 'move_right', 'say_line'])
    expect(greetingStepRequiredBlocks('step-3')).toEqual(['when_start', 'say_line'])
    expect(greetingStepRequiredBlocks('step-4')).toEqual(['when_start', 'move_right', 'say_line'])
    expect(GREETING_STEP_GOALS).toEqual({ 'step-1': 100, 'step-2': 100, 'step-3': 0, 'step-4': 100 })
    expect(GREETING_STEP_SPEAK_AT).toEqual({ 'step-1': null, 'step-2': 100, 'step-3': 0, 'step-4': 100 })
  })

  it('step-1: start + move passes at 100 steps with one move frame and no speech', () => {
    const result = judgeGreetingStep([start, move], 0)
    expect(result.passed).toBe(true)
    expect(result.failure).toBeNull()
    expect(result.foxPosition).toBe(100)
    expect(result.spokenLine).toBeNull()
    expect(result.frames).toEqual([{ kind: 'move', foxPosition: 100 }])
  })

  it('step-1: only start fails; adding a say block fails as extra speech', () => {
    const onlyStart = judgeGreetingStep([start], 0)
    expect(onlyStart.passed).toBe(false)
    const withSay = judgeGreetingStep([start, move, say], 0)
    expect(withSay.passed).toBe(false)
    expect(withSay.failure).toBe('extra-say')
  })

  it('step-1: empty program fails and knowledge fails too', () => {
    const result = judgeGreetingStep([], 0)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('empty')
    const judgment = buildGreetingJudgment(result, 0)
    expect(judgment.passed).toBe(false)
    expect(judgment.layers.find((layer) => layer.id === 'knowledge')?.passed).toBe(false)
  })

  it('step-2: start + move + say passes; the fox moves first, then speaks at 100', () => {
    const result = judgeGreetingStep([start, move, { ...say, line: 'hi-all' }], 1)
    expect(result.passed).toBe(true)
    expect(result.foxPosition).toBe(100)
    expect(result.spokenLine).toBe('大家好呀！')
    expect(result.spokenAt).toBe(100)
    expect(result.frames).toEqual([
      { kind: 'move', foxPosition: 100 },
      { kind: 'say', foxPosition: 100, message: '大家好呀！' },
    ])
    const judgment = buildGreetingJudgment(result, 1)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.every((layer) => layer.passed)).toBe(true)
  })

  it('step-2: every preset line passes (the choice is the child’s)', () => {
    for (const line of FOREST_GREETING_LINES) {
      const result = judgeGreetingStep([start, move, { ...say, line: line.id }], 1)
      expect(result.passed).toBe(true)
      expect(result.spokenLine).toBe(line.text)
    }
    // No explicit choice: the default line “你好！” also passes.
    expect(judgeGreetingStep([start, move, say], 1).passed).toBe(true)
  })

  it('step-2: saying before moving is say-too-early and the knowledge layer fails', () => {
    const result = judgeGreetingStep([start, say, move], 1)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('say-too-early')
    expect(result.spokenAt).toBe(0)
    expect(greetingKnowledgePassed(result.program, result.verdict)).toBe(false)
    const judgment = buildGreetingJudgment(result, 1)
    expect(judgment.layers.find((layer) => layer.id === 'stage')?.passed).toBe(false)
    expect(judgment.layers.find((layer) => layer.id === 'knowledge')?.passed).toBe(false)
  })

  it('step-2: no say block fails as missing-say', () => {
    const result = judgeGreetingStep([start, move], 1)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('missing-say')
  })

  it('step-2: missing start fails everything and names the reason', () => {
    const result = judgeGreetingStep([move, say], 1)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('missing-start')
    expect(result.frames).toEqual([])
    expect(result.message).toContain('开始')
  })

  it('step-3: start + say passes standing still; the speech happens at 0', () => {
    const result = judgeGreetingStep([start, { ...say, line: 'lets-play' }], 2)
    expect(result.passed).toBe(true)
    expect(result.foxPosition).toBe(0)
    expect(result.spokenLine).toBe('一起来玩吧！')
    expect(result.spokenAt).toBe(0)
    expect(result.frames).toEqual([{ kind: 'say', foxPosition: 0, message: '一起来玩吧！' }])
    const judgment = buildGreetingJudgment(result, 2)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.find((layer) => layer.id === 'stage')?.passed).toBe(true)
  })

  it('step-3: walking first fails (this step is about speaking in place)', () => {
    const result = judgeGreetingStep([start, move, say], 2)
    expect(result.passed).toBe(false)
    expect(result.foxPosition).toBe(100)
  })

  it('step-4: the pre-built wrong program is the experiment, not a failure', () => {
    const result = judgeGreetingStep([start, say, move], 3, false)
    expect(result.passed).toBe(false)
    expect(result.designedMistake).toBe(true)
    expect(result.failure).toBe('say-too-early')
    // 舞台确实先说后走：说话帧在 0 步，移动帧在后。
    expect(result.frames).toEqual([
      { kind: 'say', foxPosition: 0, message: '你好！' },
      { kind: 'move', foxPosition: 100 },
    ])
    expect(result.message).toContain('错误程序')
  })

  it('step-4: the same wrong program after observation is a real failure', () => {
    const result = judgeGreetingStep([start, say, move], 3, true)
    expect(result.passed).toBe(false)
    expect(result.designedMistake).toBe(false)
    expect(result.failure).toBe('say-too-early')
  })

  it('step-4: the fixed program passes at 100 steps', () => {
    const result = judgeGreetingStep([start, move, say], 3)
    expect(result.passed).toBe(true)
    expect(result.foxPosition).toBe(100)
    expect(result.spokenAt).toBe(100)
  })

  it('a disconnected block fails the run (same as the old classroom)', () => {
    const result = judgeGreetingStep([start, move, { ...say, disconnected: true }], 1)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('disconnected')
  })

  it('greetingKnowledgePassed: order is the knowledge, distance is the task', () => {
    // 顺序对但距离不对（多走一块）：知识仍通过，任务不通过。
    const tooFar = judgeGreetingStep([start, move, move, say], 1)
    expect(tooFar.passed).toBe(false)
    expect(greetingKnowledgePassed(tooFar.program, tooFar.verdict)).toBe(true)
    // 顺序知识错（先说后走）：知识不通过。
    const early = judgeGreetingStep([start, say, move], 1)
    expect(greetingKnowledgePassed(early.program, early.verdict)).toBe(false)
  })

  it('judging never throws on malformed input', () => {
    expect(() => judgeGreetingStep([{ type: 'nope' }], 0)).not.toThrow()
    expect(() => judgeGreetingStep([], 99)).not.toThrow()
    expect(judgeGreetingStep([{ type: 'nope' }], 0).passed).toBe(false)
  })
})
