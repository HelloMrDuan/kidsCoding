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
