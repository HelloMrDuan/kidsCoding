import { describe, expect, it } from 'vitest'

import {
  buildForestJudgment,
  forestKnowledgePassed,
  forestStepRequiredBlocks,
  judgeForestStep,
} from './forest-hello-judging'

const whenStart = { type: 'when_start' }
const move = { type: 'move_right' }

describe('forest-hello judging', () => {
  it('step targets come from the lesson data, not a second copy', () => {
    expect(forestStepRequiredBlocks('step-1')).toEqual(['when_start'])
    expect(forestStepRequiredBlocks('step-2')).toEqual(['when_start', 'move_right'])
    expect(forestStepRequiredBlocks('step-3')).toEqual(['when_start', 'move_right', 'move_right'])
    expect(forestStepRequiredBlocks('step-4')).toEqual(['when_start', 'move_right'])
  })

  it('step-1: only when_start passes with the fox staying at 0', () => {
    const result = judgeForestStep([whenStart], 0)
    expect(result.passed).toBe(true)
    expect(result.failure).toBeNull()
    expect(result.foxPosition).toBe(0)
    expect(result.frames).toEqual([])
    expect(result.designedMistake).toBe(false)
    const judgment = buildForestJudgment(result, 0)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers.map((layer) => [layer.id, layer.passed])).toEqual([
      ['stage', true],
      ['task', true],
      ['knowledge', true],
    ])
    expect(judgment.layers[0].detail).toContain('一动不动')
  })

  it('step-1: empty program fails and knowledge fails too', () => {
    const result = judgeForestStep([], 0)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('empty')
    expect(buildForestJudgment(result, 0).layers[2].passed).toBe(false)
  })

  it('step-2: when_start + move_right passes at 100 steps with one frame', () => {
    const result = judgeForestStep([whenStart, move], 1)
    expect(result.passed).toBe(true)
    expect(result.foxPosition).toBe(100)
    expect(result.frames).toEqual([{ kind: 'move', foxPosition: 100 }])
    const judgment = buildForestJudgment(result, 1)
    expect(judgment.passed).toBe(true)
    expect(judgment.layers[0].detail).toContain('已走 100 步')
    expect(judgment.conclusion).toContain('已完成')
  })

  it('step-2: only when_start fails the task but keeps the knowledge (order is right)', () => {
    const result = judgeForestStep([whenStart], 1)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('too-few-moves')
    const judgment = buildForestJudgment(result, 1)
    expect(judgment.layers[0].passed).toBe(false)
    expect(judgment.layers[1].passed).toBe(false)
    // 顺序知识用对了（开始时在最前），只是走得不够。
    expect(judgment.layers[2].passed).toBe(true)
    expect(judgment.passed).toBe(false)
  })

  it('step-2: missing start fails everything and names the reason', () => {
    const result = judgeForestStep([move], 1)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('missing-start')
    expect(result.message).toContain('开始时')
    const judgment = buildForestJudgment(result, 1)
    expect(judgment.layers.map((layer) => layer.passed)).toEqual([false, false, false])
  })

  it('step-3: two moves pass at 200 steps with two frames; one move is too few', () => {
    const two = judgeForestStep([whenStart, move, move], 2)
    expect(two.passed).toBe(true)
    expect(two.foxPosition).toBe(200)
    expect(two.frames).toEqual([
      { kind: 'move', foxPosition: 100 },
      { kind: 'move', foxPosition: 200 },
    ])
    const one = judgeForestStep([whenStart, move], 2)
    expect(one.passed).toBe(false)
    expect(one.failure).toBe('too-few-moves')
    expect(one.foxPosition).toBe(100)
  })

  it('step-4: the pre-built wrong program is the experiment, not a failure', () => {
    const result = judgeForestStep([move], 3, false)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('missing-start')
    expect(result.designedMistake).toBe(true)
    expect(result.foxPosition).toBe(0)
    expect(result.frames).toEqual([])
    const judgment = buildForestJudgment(result, 3)
    expect(judgment.conclusion).toContain('错误实验已观察')
    expect(judgment.passed).toBe(false)
  })

  it('step-4: the same wrong program after observation is a real failure', () => {
    const result = judgeForestStep([move], 3, true)
    expect(result.designedMistake).toBe(false)
    expect(result.failure).toBe('missing-start')
    expect(buildForestJudgment(result, 3).conclusion).toContain('未合格')
  })

  it('step-4: the fixed program passes at 100 steps; three moves overshoot', () => {
    expect(judgeForestStep([whenStart, move], 3).passed).toBe(true)
    const three = judgeForestStep([whenStart, move, move], 3)
    expect(three.passed).toBe(false)
    expect(three.failure).toBe('too-many-moves')
  })

  it('a disconnected block fails the run (same as the old classroom)', () => {
    const blocks = [whenStart, move, { type: 'move_right', disconnected: true }]
    const result = judgeForestStep(blocks, 1)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('disconnected')
    expect(buildForestJudgment(result, 1).layers[2].passed).toBe(false)
  })

  it('forestKnowledgePassed: order is the knowledge, distance is the task', () => {
    const twoMoves = judgeForestStep([whenStart, move, move], 1)
    expect(forestKnowledgePassed(twoMoves.program, twoMoves.verdict)).toBe(true)
    const noStart = judgeForestStep([move], 1)
    expect(forestKnowledgePassed(noStart.program, noStart.verdict)).toBe(false)
    expect(forestKnowledgePassed([], null)).toBe(false)
  })

  it('judging never throws on malformed input', () => {
    expect(() => judgeForestStep([{ type: 'say_line' }], 1)).not.toThrow()
    // No start hat at all: the hat check fires before the block itself.
    expect(judgeForestStep([{ type: 'say_line' }], 1).failure).toBe('missing-start')
    expect(judgeForestStep([whenStart, { type: 'unknown_block_xyz' }], 1).failure).toBe(
      'unsupported-block',
    )
    expect(() => judgeForestStep([], 99)).not.toThrow()
  })
})
