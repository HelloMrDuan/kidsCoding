import { describe, expect, it } from 'vitest'

import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { judgeStoryProgram, mainStoryProgram, storyDraftKey } from './story-lab'

const START = { type: 'when_start' }
const SAY_OPENING: ProgramBlock = { type: 'say_line', line: 'opening' }
const SAY_READY: ProgramBlock = { type: 'say_line', line: 'ready' }
const MOVE: ProgramBlock = { type: 'move_right' }
const SWITCH: ProgramBlock = { type: 'switch_character' }

/**
 * 判定 7 类全覆盖，对照第一阶段执行器 examples/blockly/g1/dialogue_executor.py：
 * 正向、移动-only、错人、先移动后说、错文本、缺开始、拓展追加。
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

  it('uses a story-local storage key, never the grid key', () => {
    expect(storyDraftKey('G1-U1-L01')).toBe('kids-story-lesson-v1:G1-U1-L01')
    expect(storyDraftKey('G1-U1-L01')).not.toContain('grid')
  })
})
