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

describe('loop ownership (R8): body vs after-loop vs nested', () => {
  it('marks only loop-body moves as fromRepeat; post-loop moves are not in-loop', () => {
    const expanded = expandDemoProgram([hat, repeat(3, [right(50)]), right(30)])
    expect(expanded.ok).toBe(true)
    if (!expanded.ok) return
    // Body move expanded 3x with fromRepeat=true; the trailing move once, false.
    expect(expanded.actions).toHaveLength(4)
    expect(expanded.actions.map((a) => a.fromRepeat)).toEqual([true, true, true, false])
    expect(expanded.actions.map((a) => a.steps)).toEqual([50, 50, 50, 30])
  })

  it('runs a post-loop move exactly once, not once per iteration', () => {
    const result = runDemoProgram([hat, right(30), repeat(3, [right(50)]), right(50)])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    // 30 + 3*50 + 50 = 230. If the trailing move were misjudged as in-loop
    // it would be 30 + 3*(50 + 50) = 330.
    expect(result.finalX).toBe(230)
    expect(result.frames).toHaveLength(5)
  })

  it('marks nested-loop inner moves as fromRepeat and keeps the outer after-loop separate', () => {
    const expanded = expandDemoProgram([hat, repeat(2, [right(10), repeat(2, [left(5)])]), right(7)])
    expect(expanded.ok).toBe(true)
    if (!expanded.ok) return
    // 2 * (10 + 2*(-5)) then trailing 7: flags [T,T,T, T,T,T, F].
    expect(expanded.actions.map((a) => a.fromRepeat)).toEqual([true, true, true, true, true, true, false])
    expect(expanded.actions.map((a) => a.steps)).toEqual([10, 5, 5, 10, 5, 5, 7])
  })

  it('exposes rail categories from the same toolbox builder (no workspace needed)', () => {
    const adapter = new BlocklyAdapter()
    const categories = adapter.getBlockCategories()
    expect(categories.map((c) => c.id)).toEqual(['开始', '控制', '更多'])
    expect(categories.find((c) => c.id === '开始')?.color).toBe('#ffab19')
    expect(categories.find((c) => c.id === '控制')?.color).toBe('#0fbdbd')
    expect(categories.find((c) => c.id === '更多')?.color).toBe('#6f7d92')
  })

  it('exposes a search inventory with labels and category ids (no workspace needed)', () => {
    const adapter = new BlocklyAdapter()
    const inventory = adapter.getBlockInventory()
    expect(inventory.map((item) => item.type)).toEqual(['when_start', 'ws_move_right', 'ws_move_left', 'repeat_times'])
    expect(inventory.find((item) => item.type === 'when_start')).toEqual({
      type: 'when_start',
      label: '开始时',
      categoryId: '开始',
    })
    expect(inventory.find((item) => item.type === 'ws_move_right')?.categoryId).toBe('更多')
    expect(inventory.find((item) => item.type === 'repeat_times')?.categoryId).toBe('控制')
  })

  it('returns null judgment before any run, and refuses category/insert without a workspace', () => {
    const adapter = new BlocklyAdapter()
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.selectCategory('开始')).toBeNull()
    expect(adapter.insertBlock('ws_move_right')).toBe(false)
  })

  it('keeps body and next-chain separate after a script-list delete and rebuild', () => {
    const adapter = new BlocklyAdapter()
    adapter.loadScript([hat, repeat(3, [right(50)]), right(30)])
    const before = adapter.getScript() as DemoBlock[]
    expect(before).toHaveLength(3)
    // Simulate the shell's removeBlockAt([1]) (delete the repeat): rebuild
    // from the remaining list and re-run — the trailing move stays a
    // top-level move, not a loop remnant.
    adapter.loadScript([before[0], before[2]])
    const result = runDemoProgram(adapter.getScript() as DemoBlock[])
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.finalX).toBe(30)
    expect(result.trace.usedRepeat).toBe(false)
  })
})

describe('generic run trace (§9 round 3)', () => {
  it('returns null before any run, then signed dx per move frame', () => {
    const adapter = new BlocklyAdapter()
    expect(adapter.getRunTrace('demo-a')).toBeNull()
    adapter.loadScript([hat, right(30), repeat(3, [right(50)])])
    adapter.run(() => {})
    const trace = adapter.getRunTrace('demo-a')
    expect(trace).not.toBeNull()
    expect(trace!.runId).toBe(1)
    expect(trace!.lessonId).toBe('demo-a')
    expect(trace!.frames.map((f) => f.frame)).toEqual([1, 2, 3, 4])
    expect(trace!.frames.map((f) => f.dx)).toEqual([30, 50, 50, 50])
    expect(trace!.frames.every((f) => f.dy === 0 && f.source === 'blockly-demo')).toBe(true)
    expect(trace!.frames.every((f) => f.inLoop === undefined)).toBe(true)
    adapter.stop()
    adapter.run(() => {})
    expect(adapter.getRunTrace('demo-a')!.runId).toBe(2)
    adapter.stop()
  })
})
