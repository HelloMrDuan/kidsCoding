import { describe, expect, it } from 'vitest'

import { countBlocks, expandProgram, programDepth, repeatTimes, sanitizeProgram, type ProgramBlock } from './program-tree'

const fwd: ProgramBlock = { type: 'move_forward' }
const right: ProgramBlock = { type: 'turn_right' }

describe('SYS-107 program tree', () => {
  it('unrolls a repeat into its body N times, keeping the top-level index and rounds', () => {
    const r = expandProgram([{ type: 'repeat_times', times: 3, body: [fwd, right] }], 80)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.steps.map(s => s.block.type)).toEqual(['move_forward', 'turn_right', 'move_forward', 'turn_right', 'move_forward', 'turn_right'])
    expect(r.steps.every(s => s.topIndex === 0)).toBe(true)
    expect(r.steps.map(s => s.rounds[0])).toEqual([1, 1, 2, 2, 3, 3])
  })

  it('changing only the count changes how many actions run', () => {
    const run = (times: number) => {
      const r = expandProgram([{ type: 'repeat_times', times, body: [fwd] }], 80)
      return r.ok ? r.steps.length : -1
    }
    expect([run(2), run(3), run(4), run(8)]).toEqual([2, 3, 4, 8])
  })

  it('a flat program (older drafts) expands to itself', () => {
    const r = expandProgram([fwd, right, fwd], 80)
    expect(r.ok && r.steps.map(s => [s.block.type, s.topIndex])).toEqual([['move_forward', 0], ['turn_right', 1], ['move_forward', 2]])
  })

  it('blocks after a repeat run once, after all rounds', () => {
    const r = expandProgram([{ type: 'repeat_times', times: 2, body: [fwd] }, right], 80)
    expect(r.ok && r.steps.map(s => s.block.type)).toEqual(['move_forward', 'move_forward', 'turn_right'])
  })

  it('allows one repeat inside another, and refuses a third level', () => {
    const nested: ProgramBlock = { type: 'repeat_times', times: 2, body: [{ type: 'repeat_times', times: 3, body: [fwd] }, right] }
    const r = expandProgram([nested], 80)
    expect(r.ok && r.steps.length).toBe(8)
    expect(programDepth([nested])).toBe(2)
    const deep: ProgramBlock = { type: 'repeat_times', times: 2, body: [nested] }
    expect(expandProgram([deep], 80)).toEqual({ ok: false, reason: 'too_deep' })
  })

  it('refuses an empty repeat and stops runaway loops at the limit', () => {
    expect(expandProgram([{ type: 'repeat_times', times: 4, body: [] }], 80)).toEqual({ ok: false, reason: 'empty_repeat' })
    const big: ProgramBlock = { type: 'repeat_times', times: 8, body: [{ type: 'repeat_times', times: 8, body: [fwd, right] }] }
    expect(expandProgram([big], 80)).toEqual({ ok: false, reason: 'too_many' })
  })

  it('clamps an unoffered repeat count to the default', () => {
    expect(repeatTimes({ type: 'repeat_times', times: 99 })).toBe(2)
    expect(repeatTimes({ type: 'repeat_times', times: 4 })).toBe(4)
  })

  it('counts blocks inside bodies', () => {
    expect(countBlocks([{ type: 'when_start' }, { type: 'repeat_times', times: 2, body: [fwd, right] }])).toBe(4)
  })

  it('sanitises stored programs: drops unknown blocks, keeps bodies, ignores disconnected inside bodies', () => {
    const known = new Set(['when_start', 'repeat_times', 'move_forward', 'turn_right'])
    const parsed = sanitizeProgram([
      { type: 'when_start' },
      { type: 'repeat_times', times: '4', body: [{ type: 'move_forward', disconnected: true }, { type: 'hack' }, { type: 'turn_right' }] },
      { type: 'evil' },
      { type: 'move_forward', disconnected: true },
    ], known, 41)
    expect(parsed).toEqual([
      { type: 'when_start' },
      { type: 'repeat_times', times: 4, body: [{ type: 'move_forward' }, { type: 'turn_right' }] },
      { type: 'move_forward', disconnected: true },
    ])
    expect(sanitizeProgram('nope', known, 41)).toEqual([])
    expect(sanitizeProgram(Array.from({ length: 100 }, () => ({ type: 'move_forward' })), known, 41)).toHaveLength(41)
  })
})
