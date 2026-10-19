import { describe, expect, it } from 'vitest'
import { runGridProgram } from './grid-engine'
import { failingBlockNote } from './grid-lab'

const level = { cols: 5, rows: 4, start: { x: 0, y: 2, facing: 'right' as const }, goal: { x: 4, y: 1 }, rocks: [{ x: 2, y: 2 }] }

describe('EDU-105 failing block pointer', () => {
  it('names the exact block that hit the rock', () => {
    const blocks = [{ type: 'when_start' }, { type: 'move_forward' }, { type: 'move_forward' }]
    expect(failingBlockNote(runGridProgram(level, blocks), blocks)).toBe('问题出在第 2 块“向前走一格”。')
  })
  it('says nothing for a pass or for stopping short', () => {
    const short = [{ type: 'when_start' }, { type: 'move_forward' }]
    expect(failingBlockNote(runGridProgram(level, short), short)).toBeNull()
  })
})
