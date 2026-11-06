import { describe, expect, it } from 'vitest'

import {
  penSegmentsToSvgLines,
  summarizePenRun,
  isValidPenSegment,
  type PenSegment,
} from './pen-segments'

const blue: PenSegment = { x0: -200, y0: 0, x1: -180, y1: 0, color: [0, 0, 1, 1], diameter: 1 }

describe('penSegmentsToSvgLines', () => {
  it('maps VM coordinates to the 480x360 stage and flips y', () => {
    const lines = penSegmentsToSvgLines([blue])
    expect(lines).toEqual([{ x1: 40, y1: 180, x2: 60, y2: 180, stroke: 'rgba(0,0,255,1)', strokeWidth: 1 }])
  })

  it('converts pen color and diameter to stroke style', () => {
    const lines = penSegmentsToSvgLines([{ x0: 0, y0: 180, x1: 0, y1: -180, color: [1, 0, 0, 0.5], diameter: 3 }])
    expect(lines).toEqual([{ x1: 240, y1: 0, x2: 240, y2: 360, stroke: 'rgba(255,0,0,0.5)', strokeWidth: 3 }])
  })

  it('drops non-finite or out-of-range segments instead of repairing them', () => {
    const lines = penSegmentsToSvgLines([
      blue,
      { x0: Number.NaN, y0: 0, x1: 0, y1: 0, color: [0, 0, 1, 1], diameter: 1 },
      { x0: 0, y0: 0, x1: 0, y1: 0, color: [0, 0, 2, 1], diameter: 1 },
      { x0: 0, y0: 0, x1: 0, y1: 0, color: [0, 0, 1, 1], diameter: 0 },
    ])
    expect(lines).toHaveLength(1)
  })

  it('accepts only well-formed segments', () => {
    expect(isValidPenSegment(blue)).toBe(true)
    expect(isValidPenSegment(null)).toBe(false)
    expect(isValidPenSegment({ ...blue, color: [0, 0, 1] })).toBe(false)
  })
})

describe('summarizePenRun', () => {
  it('reports only VM-measured values', () => {
    expect(summarizePenRun([blue], { x: 160.4, sizeVar: 140 })).toBe('画线 1 段，终点 x=160，size 变量=140。')
    expect(summarizePenRun([], null)).toBe('画线 0 段。')
  })
})
