import { describe, expect, it } from 'vitest'

import {
  BlocklyAdapter,
  expandDemoProgram,
  runDemoProgram,
  validateDemoBlocks,
  type DemoBlock,
} from './blockly-adapter'

const hat = { type: 'when_start' }
const right = (steps: number): DemoBlock => ({ type: 'ws_move_right', steps })
const left = (steps: number): DemoBlock => ({ type: 'ws_move_left', steps })
const repeat = (times: number, body: DemoBlock[]): DemoBlock => ({ type: 'repeat_times', times, body })

describe('demo program expansion and run (pure runner)', () => {
  it('expands a nested repeat truly (not just count == 4)', () => {
    const result = runDemoProgram([hat, repeat(2, [right(10), repeat(3, [left(5)])])])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 2 * (10 - 3*5) = -10.
    expect(result.finalX).toBe(-10)
    expect(result.trace.usedRepeat).toBe(true)
    expect(result.trace.didMove).toBe(true)
  })

  it('fails over-cap expansion instead of silently truncating', () => {
    const body = Array.from({ length: 10 }, () => right(1))
    const result = expandDemoProgram([hat, repeat(8, [repeat(8, body)])], 80)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('too_many_steps')
  })

  it('passes exactly at the 80-step cap and fails at 81', () => {
    const ten = Array.from({ length: 10 }, () => right(1))
    const atCap = runDemoProgram([hat, repeat(8, ten)], 80)
    expect(atCap.ok).toBe(true)
    if (atCap.ok) expect(atCap.frames).toHaveLength(80)
    const overCap = runDemoProgram([hat, repeat(8, ten), right(1)], 80)
    expect(overCap.ok).toBe(false)
    if (!overCap.ok) expect(overCap.reason).toBe('too_many_steps')
  })

  it('fails disconnected blocks with a named reason', () => {
    const result = runDemoProgram([hat, right(10), { ...right(20), disconnected: true }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('disconnected')
  })

  it('fails a missing hat with a named reason', () => {
    const result = runDemoProgram([right(10)])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('missing_start')
  })

  it('fails an empty repeat body with a named reason', () => {
    const result = runDemoProgram([hat, repeat(3, [])])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('empty_repeat')
  })

  it('fails unknown block types with a named reason', () => {
    const result = runDemoProgram([hat, { type: 'if_block' }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('unknown_block')
  })

  it('fails invalid move steps with a named reason', () => {
    const result = runDemoProgram([hat, { type: 'ws_move_right', steps: Number.NaN }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('invalid_steps')
  })
})

describe('BlocklyAdapter script cache round-trip (unmounted: validation + cache path)', () => {
  it('loadScript then getScript equals input, including a nested repeat', () => {
    const adapter = new BlocklyAdapter()
    const script: DemoBlock[] = [
      hat,
      repeat(3, [right(50), repeat(2, [left(10)])]),
      right(20),
    ]
    adapter.loadScript(script)
    expect(adapter.getScript()).toEqual(script)
  })

  it('a failed loadScript leaves the previous program unchanged', () => {
    const adapter = new BlocklyAdapter()
    const good: DemoBlock[] = [hat, right(30)]
    adapter.loadScript(good)
    expect(() => adapter.loadScript([hat, { type: 'nope_block' }])).toThrow()
    expect(adapter.getScript()).toEqual(good)
  })

  it('validateDemoBlocks rejects repeat times outside the Blockly dropdown options', () => {
    expect(() => validateDemoBlocks([hat, repeat(7, [right(10)])])).toThrow()
  })
})
