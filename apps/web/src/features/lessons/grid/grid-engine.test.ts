import { describe, expect, it } from 'vitest'
import { runGridProgram, turn } from './grid-engine'
import { sampleGridLevels as L } from './grid-levels'

const prog = (...types: string[]) => [{ type: 'when_start' }, ...types.map(type => ({ type }))]

describe('grid engine (SYS-106)', () => {
  it('turns clockwise and counter-clockwise', () => {
    expect(turn('up', 'right')).toBe('right')
    expect(turn('up', 'left')).toBe('left')
    expect(turn('left', 'right')).toBe('up')
  })

  it('needs a start event and connected blocks', () => {
    expect(runGridProgram(L.straight, [{ type: 'move_forward' }]).failure).toBe('no_start')
    expect(runGridProgram(L.straight, [{ type: 'when_start' }, { type: 'move_forward', disconnected: true }]).failure).toBe('disconnected')
    expect(runGridProgram(L.straight, prog('say_line')).failure).toBe('unknown_block')
  })

  it('straight: forward and absolute arrows are equivalent solutions', () => {
    expect(runGridProgram(L.straight, prog('move_forward', 'move_forward', 'move_forward')).passed).toBe(true)
    expect(runGridProgram(L.straight, prog('move_right_cell', 'move_right_cell', 'move_right_cell')).passed).toBe(true)
  })

  it('straight: too short and too far fail with a specific reason', () => {
    const short = runGridProgram(L.straight, prog('move_forward', 'move_forward'))
    expect(short.failure).toBe('not_at_goal')
    expect(short.message).toContain('往右还差 1 格')
    expect(runGridProgram(L.straight, prog(...Array(5).fill('move_forward'))).failure).toBe('out_of_bounds')
  })

  it('river: two different routes pass, walking through the river fails', () => {
    expect(runGridProgram(L.river, prog('move_right_cell', 'move_right_cell', 'move_right_cell', 'move_right_cell', 'move_up', 'move_up', 'move_up')).passed).toBe(true)
    expect(runGridProgram(L.river, prog('move_right_cell', 'move_right_cell', 'move_right_cell', 'move_right_cell', 'move_up', 'move_up', 'move_up', 'move_left', 'move_right_cell')).passed).toBe(true)
    const wet = runGridProgram(L.river, prog('move_up', 'move_right_cell'))
    expect(wet.failure).toBe('fell_in_water')
  })

  it('rock: turning around the rock passes, going straight bumps', () => {
    const bump = runGridProgram(L.rock, prog('move_forward', 'move_forward'))
    expect(bump.failure).toBe('hit_rock')
    expect(bump.final).toMatchObject({ x: 1, y: 2 })
    expect(bump.frames.at(-1)?.bump).toEqual({ x: 2, y: 2 })
    expect(runGridProgram(L.rock, prog('move_forward', 'turn_left', 'move_forward', 'turn_right', 'move_forward', 'move_forward', 'move_forward')).passed).toBe(true)
    expect(runGridProgram(L.rock, prog('move_up', 'move_right_cell', 'move_right_cell', 'move_right_cell', 'move_right_cell')).passed).toBe(true)
  })

  it('key door: key → open → forward passes; wrong orders keep the door shut', () => {
    const ok = runGridProgram(L.keyDoor, prog('move_forward', 'move_forward', 'pick_key', 'move_forward', 'open_door', 'move_forward', 'move_forward'))
    expect(ok.passed).toBe(true)
    expect(ok.final).toMatchObject({ hasKey: true, doorOpen: true })
    expect(runGridProgram(L.keyDoor, prog('move_forward', 'move_forward', 'move_forward', 'move_forward')).failure).toBe('door_locked')
    expect(runGridProgram(L.keyDoor, prog('move_forward', 'move_forward', 'move_forward', 'open_door')).failure).toBe('need_key')
    expect(runGridProgram(L.keyDoor, prog('pick_key')).failure).toBe('no_key_here')
    expect(runGridProgram(L.keyDoor, prog('move_forward', 'move_forward', 'pick_key', 'open_door')).failure).toBe('not_at_door')
  })

  it('records one frame per executed block for the stage animation', () => {
    const run = runGridProgram(L.rock, prog('move_forward', 'turn_left'))
    expect(run.frames.map(f => [f.action, f.x, f.y, f.facing])).toEqual([
      ['move_forward', 1, 2, 'right'],
      ['turn_left', 1, 2, 'up'],
    ])
  })
})

describe('grid engine: repeat N times (SYS-107)', () => {
  const rep = (times: number, ...body: string[]) => ({ type: 'repeat_times', times, body: body.map(type => ({ type })) })
  const square = { cols: 5, rows: 5, start: { x: 1, y: 3, facing: 'up' as const }, goal: { x: 1, y: 3 } }

  it('repeat 3 × forward reaches the same goal as three forward blocks', () => {
    const looped = runGridProgram(L.straight, [{ type: 'when_start' }, rep(3, 'move_forward')])
    expect(looped.passed).toBe(true)
    expect(looped.frames.map(f => f.rounds?.[0])).toEqual([1, 2, 3])
    expect(looped.frames.every(f => f.blockIndex === 1)).toBe(true)
  })

  it('changing only the count changes the outcome (2 too short, 4 too far)', () => {
    expect(runGridProgram(L.straight, [{ type: 'when_start' }, rep(2, 'move_forward')]).failure).toBe('not_at_goal')
    expect(runGridProgram(L.straight, [{ type: 'when_start' }, rep(4, 'move_forward')]).passed).toBe(false)
  })

  it('a square fence: repeat 4 × (forward, forward, right turn) returns to the start', () => {
    const r = runGridProgram(square, [{ type: 'when_start' }, rep(4, 'move_forward', 'move_forward', 'turn_right')])
    expect(r.passed).toBe(true)
    expect(r.steps).toBe(8)
    expect(r.final.facing).toBe('up')
    // turning the wrong way inside the loop leaves the map
    expect(runGridProgram(square, [{ type: 'when_start' }, rep(4, 'move_forward', 'move_forward', 'turn_left')]).failure).toBe('out_of_bounds')
    // 3 rounds does not close the fence
    expect(runGridProgram(square, [{ type: 'when_start' }, rep(3, 'move_forward', 'move_forward', 'turn_right')]).failure).toBe('not_at_goal')
  })

  it('an empty repeat and an unknown block inside a repeat are real failures', () => {
    expect(runGridProgram(L.straight, [{ type: 'when_start' }, { type: 'repeat_times', times: 3, body: [] }]).failure).toBe('empty_repeat')
    expect(runGridProgram(L.straight, [{ type: 'when_start' }, rep(3, 'say_line')]).failure).toBe('unknown_block')
  })

  it('stops a runaway loop instead of freezing the stage', () => {
    const big = { type: 'repeat_times', times: 8, body: [rep(8, 'turn_left', 'turn_right')] }
    expect(runGridProgram(L.straight, [{ type: 'when_start' }, big]).failure).toBe('too_many')
  })
})
