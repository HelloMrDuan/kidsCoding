import { describe, expect, it } from 'vitest'

import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import {
  buildTurnTakingJudgment,
  judgeTurnTakingProgram,
  mainTurnTakingProgram,
  normalizeTurnTakingLines,
} from './g1-u1-l02-judging'

const START = { type: 'when_start' }
const SAY_HELLO: ProgramBlock = { type: 'say_line', line: 'hello' }
const SAY_GLAD: ProgramBlock = { type: 'say_line', line: 'glad' }
const SWITCH: ProgramBlock = { type: 'switch_character' }

/** 标准答案只留在这里作夹具：狐狸“你好” → 兔子“很高兴见到你”。 */
const EXPECTED = [
  { actor: 'fox', text: '你好' },
  { actor: 'rabbit', text: '很高兴见到你' },
] as const

const CORRECT: ProgramBlock[] = [START, SAY_HELLO, SWITCH, SAY_GLAD]

/**
 * 判定 9 码全覆盖，对照第一阶段执行器 turn_taking_executor.py：
 * 正向、顺序颠倒、缺对白、缺开始、错文本、错人、重叠、未知积木、超长、畸形输入、拓展追加。
 */
describe('judgeTurnTakingProgram (mirrors the first-stage turn-taking executor)', () => {
  it('passes the correct program: start, fox hello, switch, rabbit glad', () => {
    const result = judgeTurnTakingProgram(CORRECT, EXPECTED)
    expect(result.passed).toBe(true)
    expect(result.failure).toBeNull()
    expect(result.lines).toEqual([
      { actor: 'fox', text: '你好' },
      { actor: 'rabbit', text: '很高兴见到你' },
    ])
    expect(result.log).toEqual(['狐狸说：你好', '切换角色', '兔子说：很高兴见到你'])
    expect(result.frames.map((frame) => frame.kind)).toEqual(['say', 'switch', 'say'])
  })

  it('fails reversed_order when the rabbit speaks first', () => {
    const result = judgeTurnTakingProgram(
      [START, SWITCH, SAY_GLAD, SWITCH, SAY_HELLO],
      EXPECTED,
    )
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('reversed_order')
    expect(result.message).toContain('顺序颠倒')
  })

  it('fails missing_line when the first line never comes', () => {
    expect(judgeTurnTakingProgram([START], EXPECTED).failure).toBe('missing_line')
    expect(judgeTurnTakingProgram([START, SWITCH], EXPECTED).failure).toBe('missing_line')
  })

  it('fails missing_line when the second line never comes', () => {
    expect(judgeTurnTakingProgram([START, SAY_HELLO], EXPECTED).failure).toBe('missing_line')
    expect(judgeTurnTakingProgram([START, SAY_HELLO, SWITCH], EXPECTED).failure).toBe('missing_line')
  })

  it('fails missing_start when the first block is not the start event, and when the program is empty', () => {
    expect(judgeTurnTakingProgram([SAY_HELLO, SWITCH, SAY_GLAD], EXPECTED).failure).toBe('missing_start')
    expect(judgeTurnTakingProgram([], EXPECTED).failure).toBe('missing_start')
    expect(judgeTurnTakingProgram([SWITCH, SAY_HELLO], EXPECTED).failure).toBe('missing_start')
  })

  it('fails wrong_text when a line says the wrong words', () => {
    const result = judgeTurnTakingProgram([START, SAY_HELLO, SWITCH, SAY_HELLO], EXPECTED)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('wrong_text')
    const foxWrong = judgeTurnTakingProgram([START, SAY_GLAD, SWITCH, SAY_GLAD], EXPECTED)
    expect(foxWrong.failure).toBe('wrong_text')
  })

  it('fails wrong_actor when both lines belong to the same speaker (missing switch)', () => {
    const result = judgeTurnTakingProgram([START, SAY_HELLO, SAY_GLAD], EXPECTED)
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('wrong_actor')
    expect(result.message).toContain('对白给错人')
    const rabbitOnly = judgeTurnTakingProgram([START, SWITCH, SAY_GLAD], EXPECTED)
    expect(rabbitOnly.failure).toBe('wrong_actor')
  })

  it('fails overlap on say_together, even as the third block', () => {
    const result = judgeTurnTakingProgram(
      [START, { type: 'say_together', line: 'hello' }],
      EXPECTED,
    )
    expect(result.passed).toBe(false)
    expect(result.failure).toBe('overlap')
    expect(result.message).toContain('重叠')
    const afterCorrect = judgeTurnTakingProgram(
      [...CORRECT, { type: 'say_together', line: 'glad' }],
      EXPECTED,
    )
    expect(afterCorrect.failure).toBe('overlap')
  })

  it('rejects programs over 20 blocks and unknown block types', () => {
    const long = [START, SAY_HELLO, SWITCH, SAY_GLAD, ...Array.from({ length: 17 }, () => SWITCH)]
    expect(long).toHaveLength(21)
    expect(judgeTurnTakingProgram(long, EXPECTED).failure).toBe('too_many')
    expect(judgeTurnTakingProgram([START, SAY_HELLO, { type: 'jump_forward' }], EXPECTED).failure).toBe(
      'unknown_block',
    )
    expect(judgeTurnTakingProgram([START, SAY_HELLO, { type: 'move_right' }], EXPECTED).failure).toBe(
      'unknown_block',
    )
  })

  it('returns invalid_program for malformed input and never throws', () => {
    expect(judgeTurnTakingProgram(null, EXPECTED).failure).toBe('invalid_program')
    expect(judgeTurnTakingProgram(undefined, EXPECTED).failure).toBe('invalid_program')
    expect(judgeTurnTakingProgram('not a program', EXPECTED).failure).toBe('invalid_program')
    expect(judgeTurnTakingProgram([null], EXPECTED).failure).toBe('invalid_program')
    expect(judgeTurnTakingProgram([{ type: 3 }], EXPECTED).failure).toBe('invalid_program')
    expect(judgeTurnTakingProgram([START, { type: 'say_line', line: 5 }], EXPECTED).failure).toBe(
      'invalid_program',
    )
    expect(judgeTurnTakingProgram(CORRECT, 'bad expected' as never).failure).toBe('invalid_program')
    expect(judgeTurnTakingProgram(CORRECT, [{ actor: 'bird', text: 'hi' }] as never).failure).toBe(
      'invalid_program',
    )
    expect(() => judgeTurnTakingProgram(null, EXPECTED)).not.toThrow()
    expect(() => judgeTurnTakingProgram([null], EXPECTED)).not.toThrow()
    expect(() => normalizeTurnTakingLines(null)).not.toThrow()
    expect(normalizeTurnTakingLines(null)).toEqual([])
  })

  it('passes with a third line as extension, and flags the extension', () => {
    const result = judgeTurnTakingProgram([...CORRECT, SWITCH, SAY_HELLO], EXPECTED)
    expect(result.passed).toBe(true)
    expect(result.hasExtension).toBe(true)
    expect(result.lines).toHaveLength(3)
    expect(result.log).toContain('狐狸说：你好')
    const noExtension = judgeTurnTakingProgram(CORRECT, EXPECTED)
    expect(noExtension.hasExtension).toBe(false)
  })

  it('follows the injected expected lines instead of a hardcoded answer', () => {
    const custom = [
      { actor: 'fox', text: '早上好' },
      { actor: 'rabbit', text: '再见' },
    ] as const
    const customProgram: ProgramBlock[] = [
      START,
      { type: 'say_line', line: '早上好' },
      SWITCH,
      { type: 'say_line', line: '再见' },
    ]
    expect(judgeTurnTakingProgram(customProgram, custom).passed).toBe(true)
    expect(judgeTurnTakingProgram(customProgram, EXPECTED).failure).toBe('wrong_text')
    expect(judgeTurnTakingProgram(CORRECT, custom).failure).toBe('wrong_text')
  })

  it('passes the fix-then-rerun sequence: reversed fails, fixed passes', () => {
    const broken = judgeTurnTakingProgram([START, SWITCH, SAY_GLAD, SWITCH, SAY_HELLO], EXPECTED)
    expect(broken.passed).toBe(false)
    expect(broken.failure).toBe('reversed_order')
    const fixed = judgeTurnTakingProgram(CORRECT, EXPECTED)
    expect(fixed.passed).toBe(true)
    expect(fixed.failure).toBeNull()
  })

  it('ignores disconnected loose blocks: only the main stack runs', () => {
    const result = judgeTurnTakingProgram(
      [...CORRECT, { ...SAY_HELLO, disconnected: true }],
      EXPECTED,
    )
    expect(result.passed).toBe(true)
    expect(result.lines).toHaveLength(2)
    expect(mainTurnTakingProgram([...CORRECT, { ...SAY_HELLO, disconnected: true }])).toHaveLength(4)
  })

  it('normalizes lines by tracking the current speaker', () => {
    expect(normalizeTurnTakingLines(CORRECT)).toEqual([
      { actor: 'fox', text: '你好' },
      { actor: 'rabbit', text: '很高兴见到你' },
    ])
    expect(normalizeTurnTakingLines([START, SAY_HELLO, SAY_GLAD])).toEqual([
      { actor: 'fox', text: '你好' },
      { actor: 'fox', text: '很高兴见到你' },
    ])
    expect(normalizeTurnTakingLines([START, SWITCH, SAY_GLAD, SWITCH, SAY_HELLO])).toEqual([
      { actor: 'rabbit', text: '很高兴见到你' },
      { actor: 'fox', text: '你好' },
    ])
  })
})

/**
 * 三层映射：
 * stage.passed = 两句气泡按序在舞台出现（狐狸“你好”在前、兔子“很高兴见到你”在后）；
 * task.passed = result.passed；
 * knowledge.passed = 顺序 + 文本 + 分开说三者皆对
 * （stage 通过，且失败码不在 {wrong_actor, wrong_text, reversed_order, overlap}）；
 * conclusion passed = task && knowledge。
 * 与 L01 同类的偏差：unknown_block 若发生在两句对白之后，knowledge 为通过。
 */
describe('buildTurnTakingJudgment (three-layer mapping)', () => {
  const layers = (program: ProgramBlock[]) => {
    const judgment = buildTurnTakingJudgment(judgeTurnTakingProgram(program, EXPECTED))
    return {
      judgment,
      stage: judgment.layers[0].passed,
      task: judgment.layers[1].passed,
      knowledge: judgment.layers[2].passed,
    }
  }

  it('pass: all three layers pass; conclusion is 已完成', () => {
    const { judgment, stage, task, knowledge } = layers(CORRECT)
    expect([stage, task, knowledge]).toEqual([true, true, true])
    expect(judgment.passed).toBe(true)
    expect(judgment.conclusion).toContain('已完成')
    expect(judgment.layers[0].detail).toContain('狐狸先说“你好”')
    expect(judgment.layers[0].detail).toContain('兔子再说“很高兴见到你”')
  })

  it('missing_start: all three layers fail', () => {
    const { stage, task, knowledge } = layers([])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('missing_line: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, SAY_HELLO])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('too_many: all three layers fail', () => {
    const long = [START, SAY_HELLO, SWITCH, SAY_GLAD, ...Array.from({ length: 17 }, () => SWITCH)]
    const { stage, task, knowledge } = layers(long)
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('unknown_block before the lines: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, { type: 'jump_forward' }])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('unknown_block after the two lines: knowledge stays passed (deviation, see header)', () => {
    const { judgment, stage, task, knowledge } = layers([...CORRECT, { type: 'jump_forward' }])
    expect([stage, task, knowledge]).toEqual([true, false, true])
    expect(judgment.passed).toBe(false)
  })

  it('wrong_actor (both lines by the fox): all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, SAY_HELLO, SAY_GLAD])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('wrong_text: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, SAY_HELLO, SWITCH, SAY_HELLO])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('reversed_order: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, SWITCH, SAY_GLAD, SWITCH, SAY_HELLO])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('overlap: all three layers fail', () => {
    const { stage, task, knowledge } = layers([START, { type: 'say_together', line: 'hello' }])
    expect([stage, task, knowledge]).toEqual([false, false, false])
  })

  it('extension pass still passes all three layers and notes the extension', () => {
    const { judgment } = layers([...CORRECT, SWITCH, SAY_HELLO])
    expect(judgment.passed).toBe(true)
    expect(judgment.conclusion).toContain('拓展也做到了')
  })
})
