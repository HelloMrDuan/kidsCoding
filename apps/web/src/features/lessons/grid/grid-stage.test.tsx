import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GridStage } from './grid-stage'
import { runGridProgram } from './grid-engine'
import { sampleGridLevels as L } from './grid-levels'

describe('GridStage (SYS-106)', () => {
  it('draws an illustrated fox, rocks, key, locked door and goal', () => {
    const { container } = render(<GridStage level={L.keyDoor} state={{ ...L.keyDoor.start, hasKey: false, doorOpen: false }} />)
    expect(screen.getByTestId('grid-stage').getAttribute('data-fox-cell')).toBe('0,1')
    expect(container.querySelector('[data-character-art="fox"]')).not.toBeNull()
    expect(container.querySelectorAll('[data-grid-item="rock"]')).toHaveLength(2)
    expect(container.querySelector('[data-grid-item="key"]')).not.toBeNull()
    expect(container.querySelector('[data-grid-item="door"]')?.getAttribute('data-open')).toBe('false')
  })

  it('shows the real final frame of a run: key carried, door open', () => {
    const run = runGridProgram(L.keyDoor, [{ type: 'when_start' }, ...['move_forward', 'move_forward', 'pick_key', 'move_forward', 'open_door'].map(type => ({ type }))])
    const { container } = render(<GridStage level={L.keyDoor} state={run.frames.at(-1)!} />)
    expect(container.querySelector('[data-grid-item="key"]')).toBeNull()
    expect(container.querySelector('[data-grid-item="carried-key"]')).not.toBeNull()
    expect(container.querySelector('[data-grid-item="door"]')?.getAttribute('data-open')).toBe('true')
  })

  it('marks the bump cell when the fox hits a rock', () => {
    const run = runGridProgram(L.rock, [{ type: 'when_start' }, { type: 'move_forward' }, { type: 'move_forward' }])
    const { container } = render(<GridStage level={L.rock} state={run.frames.at(-1)!} />)
    expect(container.querySelector('[data-grid-item="bump"]')).not.toBeNull()
  })
})
