import type { GridLevel } from './grid-engine'

// Sample forest levels covering each G0-U1 engine need. They prove the engine,
// they are not lesson content: G0-U1 stays L1 until its scripts are rewritten.
export const sampleGridLevels: Record<string, GridLevel> = {
  // straight line: start event + three steps right
  straight: { cols: 5, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 3, y: 1 } },
  // absolute arrows around a river
  river: {
    cols: 5, rows: 4,
    start: { x: 0, y: 3, facing: 'right' }, goal: { x: 4, y: 0 },
    water: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 1, y: 1 }],
  },
  // turn to avoid a rock
  rock: {
    cols: 5, rows: 4,
    start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 1 },
    rocks: [{ x: 2, y: 2 }, { x: 2, y: 3 }],
  },
  // key before door
  keyDoor: {
    cols: 6, rows: 3,
    start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 },
    key: { x: 2, y: 1 }, door: { x: 4, y: 1 },
    rocks: [{ x: 4, y: 0 }, { x: 4, y: 2 }],
  },
}
