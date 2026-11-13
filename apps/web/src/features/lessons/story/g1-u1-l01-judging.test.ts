import { describe, expect, it } from 'vitest'

import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { buildStoryJudgment, judgeStoryProgram, mainStoryProgram } from './g1-u1-l01-judging'

const START = { type: 'when_start' }
const SAY_OPENING: ProgramBlock = { type: 'say_line', line: 'opening' }
const SAY_READY: ProgramBlock = { type: 'say_line', line: 'ready' }
const MOVE: ProgramBlock = { type: 'move_right' }
const SWITCH: ProgramBlock = { type: 'switch_character' }

/**
 * 判定 7 类全覆盖，对照第一阶段执行器 examples/blockly/g1/dialogue_executor.py：
 * 正向、移动-only、错人、先移动后说、错文本、缺开始、拓展追加。
 * （用例一字不改，只改引用：原 story-lab.test.ts → g1-u1-l01-judging.ts。）
 */
describe('judgeStoryProgram (mirrors the first-stage dialogue executor)', () => {
  it('passes the correct program: start, fox opening, move', () => {
    const result = judgeStoryProgram([START, SAY_OPENING, MOVE])
    expect(result.passed).toBe(true)
    expect(result.failure).toBeNull()
    expect(result.foxPosition).toBe(100)
    expect(result.log).toEqual(['狐狸说：欢迎来到森林剧场', '狐狸移动到100'])
  })

  it('fails move-only: no dialogue is not a pass', () => {
    const result = judgeStoryProgram([START, MOVE])
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('move_only')
    expect(result.message).toBe('只有移动没有对白时不能算完成')
  })

  it('fails when the opening dialogue belongs to someone else', () => {
    const result = judgeStoryProgram([START, SWITCH, SAY_OPENING, MOVE])
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('wrong_actor')
    expect(result.message).toContain('对白给错人')
  })

  it('fails when the fox moves before saying the opening line', () => {
    const result = judgeStoryProgram([START, MOVE, SAY_OPENING])
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('say_after_move')
  })

  it('fails when the opening text is not exactly the required line', () => {
    const result = judgeStoryProgram([START, SAY_READY, MOVE])
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('wrong_text')
  })

  it('fails when the first block is not the start event, and when the program is empty', () => {
    expect(judgeStoryProgram([MOVE, SAY_OPENING]).failure).toBe('missing_start')
    expect(judgeStoryProgram([]).failure).toBe('missing_start')
    expect(judgeStoryProgram([SAY_OPENING, MOVE]).failure).toBe('missing_start')
  })

  it('passes with an extension question after the move, and flags the extension', () => {
    const result = judgeStoryProgram([START, SAY_OPENING, MOVE, SAY_READY])
    expect(result.passed).toBe(true)
    expect(result.hasExtension).toBe(true)
    expect(result.log).toContain('狐狸说：你们准备好了吗？')
  })

  it('rejects programs over 20 blocks and unknown block types', () => {
    const long = [START, SAY_OPENING, ...Array.from({ length: 19 }, () => MOVE)]
    expect(judgeStoryProgram(long).failure).toBe('too_many')
    expect(judgeStoryProgram([START, SAY_OPENING, { type: 'jump_forward' }]).failure).toBe('unknown_block')
  })

  it('fails when the greeting never comes and when it is never followed by a move', () => {
    expect(judgeStoryProgram([START, SWITCH, MOVE]).failure).toBe('move_only')
    expect(judgeStoryProgram([START, SAY_OPENING]).failure).toBe('missing_move')
  })

  it('ignores disconnected loose blocks: only the main stack runs', () => {
    const result = judgeStoryProgram([START, SAY_OPENING, MOVE, { ...MOVE, disconnected: true }])
    expect(result.passed).toBe(true)
    expect(result.foxPosition).toBe(100)
    expect(mainStoryProgram([START, SAY_OPENING, MOVE, { ...MOVE, disconnected: true }])).toHaveLength(3)
  })
})

/**
 * 三层映射（Q2 裁定定义逐码锁定）：
 * stage.passed = foxPosition > 0；task.passed = result.passed；
 * knowledge.passed = greetingDone 且失败码不在 {wrong_actor, wrong_text, say_after_move}；
 * conclusion passed = task && knowledge。
 * 与设计文档 §4.5 表格的偏差（已在判定文件头注释与整改报告中单列，
 * 供首席复核）：move_only 与 say_after_move 的 stage 为通过（狐狸确实
 * 移动到 100）；unknown_block 若发生在开场对白之后，knowledge 为通过。
 */
describe('buildStoryJudgment (Q2 three-layer mapping)', () => {
  const layers = (program: ProgramBlock[]) => {
    const judgment = buildStoryJudgment(judgeStoryProgram(program))
    return {
      judgment,
      stage: judgment.layers[0].passed,
      task: judgment.layers[1].passed,
      knowledge: judgment.layers[2].passed,
    }
  }

  it('pass: all three layers pass; conclusion is 已完成', () => {
    const { judgment, stage, task, knowledge } = layers([START, SAY_OPENING, MOVE])
    expect([stage, task, knowledge]).toEqual([true, true, true])
    expect(judgment.passed).toBe(true)
    expect(judgment.conclusion).toContain('已完成')
    expect(judgment.layers[0].detail).toContain('狐狸位置 100')
  })

  it('missing_start: all three layers fail', () => {
    const { stage, task, knowledge } = layers([])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('too_many: all three layers fail', () => {
    const long = [START, SAY_OPENING, ...Array.from({ length: 19 }, () => MOVE)]
    const { stage, task, knowledge } = layers(long)
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('unknown_block before the greeting: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, { type: 'jump_forward' }])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('unknown_block after the greeting: knowledge stays passed (deviation, see header)', () => {
    const { judgment, stage, task, knowledge } = layers([START, SAY_OPENING, { type: 'jump_forward' }])
    expect([stage, task, knowledge]).toEqual([false, false, true])
    expect(judgment.passed).toBe(false)
  })

  it('wrong_actor: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, SWITCH, SAY_OPENING, MOVE])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('wrong_text: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, SAY_READY, MOVE])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('say_after_move: stage passes (the fox did move to 100), task and knowledge fail', () => {
    const { judgment, stage, task, knowledge } = layers([START, MOVE, SAY_OPENING])
    expect([stage, task, knowledge]).toEqual([true, false, false])
    expect(judgment.layers[0].detail).toContain('狐狸位置 100')
    expect(judgment.passed).toBe(false)
  })

  it('move_only: stage passes (the fox did move to 100), task and knowledge fail', () => {
    const { judgment, stage, task, knowledge } = layers([START, MOVE])
    expect([stage, task, knowledge]).toEqual([true, false, false])
    expect(judgment.layers[0].detail).toContain('狐狸位置 100')
    expect(judgment.layers[0].detail).toContain('还没说话')
    expect(judgment.passed).toBe(false)
  })

  it('missing_move: stage fails, task fails, knowledge passes', () => {
    const { stage, task, knowledge } = layers([START, SAY_OPENING])
    expect([stage, task, knowledge]).toEqual([false, false, true])
  })

  it('extension pass still passes all three layers and notes the extension', () => {
    const { judgment } = layers([START, SAY_OPENING, MOVE, SAY_READY])
    expect(judgment.passed).toBe(true)
    expect(judgment.conclusion).toContain('拓展也做到了')
  })
})
