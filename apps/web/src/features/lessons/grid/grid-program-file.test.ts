import { describe, expect, it } from 'vitest'
import { parseGridProgram, serializeGridProgram } from './grid-program-file'

const lesson = 'G0-U3-L05'
const step = 'nested-square'
const allowed = ['when_start', 'repeat_times', 'move_forward', 'turn_right']

describe('grid program files', () => {
  it('round trips nested loops and a disconnected block from Blockly', () => {
    const blocks = [{ type: 'when_start' }, { type: 'repeat_times', times: 4, body: [
      { type: 'repeat_times', times: 2, body: [{ type: 'move_forward' }] }, { type: 'turn_right' },
    ], disconnected: true }]
    expect(parseGridProgram(serializeGridProgram(lesson, step, blocks), lesson, step, allowed)).toEqual(blocks)
  })

  it('rejects another step, unknown blocks and invalid repeats without returning a partial program', () => {
    const file = (blocks: Parameters<typeof serializeGridProgram>[2], id = step) => serializeGridProgram(lesson, id, blocks)
    expect(() => parseGridProgram(file([], 'another-step'), lesson, step, allowed)).toThrow('这一关')
    expect(() => parseGridProgram(file([{ type: 'glow_on' }]), lesson, step, allowed)).toThrow('无法使用')
    expect(() => parseGridProgram(file([{ type: 'repeat_times', times: 999, body: [] }]), lesson, step, allowed)).toThrow('无法使用')
  })
})
