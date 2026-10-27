import { describe, expect, it } from 'vitest'
import { runGridProgram, type GridLevel } from '@/features/lessons/grid/grid-engine'
import { stepLevel } from '@/features/lessons/grid/grid-lab'
import { g0u1GridLessons } from './g0-u1-grid-lessons'

const toBlocks = (program: string[]) => program.map(type => ({ type }))
const lessons = Object.values(g0u1GridLessons)
/** Lessons that have had the Hark A formal-course pass (error lab + creative remake + review + work). */
const FORMAL = ['G0-U1-L01', 'G0-U1-L02', 'G0-U1-L03', 'G0-U1-L04', 'G0-U1-L05']
const MOVES: Record<string, [number, number]> = { move_up: [0, -1], move_down: [0, 1], move_left: [-1, 0], move_right_cell: [1, 0] }

/** Shortest dry route (BFS over the four direction blocks) — proves a goal is reachable with real blocks. */
function shortestRoute(level: GridLevel): string[] | null {
  const key = (x: number, y: number) => `${x},${y}`
  const wet = new Set((level.water ?? []).map(c => key(c.x, c.y)))
  const seen = new Map<string, string[]>([[key(level.start.x, level.start.y), []]])
  const queue: Array<[number, number]> = [[level.start.x, level.start.y]]
  while (queue.length) {
    const [x, y] = queue.shift()!
    const path = seen.get(key(x, y))!
    if (x === level.goal.x && y === level.goal.y) return path
    for (const [type, [dx, dy]] of Object.entries(MOVES)) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows || wet.has(key(nx, ny)) || seen.has(key(nx, ny))) continue
      seen.set(key(nx, ny), [...path, type])
      queue.push([nx, ny])
    }
  }
  return null
}

/** Shortest route with only forward / turn-left / turn-right, searched over (cell, facing) — checked by the real engine. */
function shortestTurnRoute(level: GridLevel): string[] | null {
  const order = ['up', 'right', 'down', 'left'] as const
  const step: Record<string, [number, number]> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }
  const blocked = new Set([...(level.water ?? []), ...(level.rocks ?? [])].map(c => `${c.x},${c.y}`))
  const key = (x: number, y: number, d: string) => `${x},${y},${d}`
  const seen = new Map<string, string[]>([[key(level.start.x, level.start.y, level.start.facing), []]])
  const queue: Array<[number, number, string]> = [[level.start.x, level.start.y, level.start.facing]]
  while (queue.length) {
    const [x, y, d] = queue.shift()!
    const path = seen.get(key(x, y, d))!
    if (x === level.goal.x && y === level.goal.y) return path
    const i = order.indexOf(d as (typeof order)[number])
    const next: Array<[string, number, number, string]> = [
      ['move_forward', x + step[d][0], y + step[d][1], d],
      ['turn_left', x, y, order[(i + 3) % 4]],
      ['turn_right', x, y, order[(i + 1) % 4]],
    ]
    for (const [type, nx, ny, nd] of next) {
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows || blocked.has(`${nx},${ny}`) || seen.has(key(nx, ny, nd))) continue
      seen.set(key(nx, ny, nd), [...path, type])
      queue.push([nx, ny, nd])
    }
  }
  return null
}

/** Shortest key → door → goal route over (cell, has key, door open) with the four direction blocks — checked by the real engine. */
function shortestKeyRoute(level: GridLevel): string[] | null {
  const blocked = new Set([...(level.water ?? []), ...(level.rocks ?? [])].map(c => `${c.x},${c.y}`))
  const door = level.door!, key = level.key!
  const key4 = (x: number, y: number, k: boolean, o: boolean) => `${x},${y},${k},${o}`
  const seen = new Map<string, string[]>([[key4(level.start.x, level.start.y, false, false), []]])
  const queue: Array<[number, number, boolean, boolean]> = [[level.start.x, level.start.y, false, false]]
  while (queue.length) {
    const [x, y, k, o] = queue.shift()!
    const path = seen.get(key4(x, y, k, o))!
    if (x === level.goal.x && y === level.goal.y) return path
    const next: Array<[string, number, number, boolean, boolean]> = []
    for (const [type, [dx, dy]] of Object.entries(MOVES)) next.push([type, x + dx, y + dy, k, o])
    if (!k && x === key.x && y === key.y) next.push(['pick_key', x, y, true, o])
    if (k && !o && Math.abs(x - door.x) + Math.abs(y - door.y) === 1) next.push(['open_door', x, y, k, true])
    for (const [type, nx, ny, nk, no] of next) {
      if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows || blocked.has(`${nx},${ny}`)) continue
      if (nx === door.x && ny === door.y && !no) continue
      if (seen.has(key4(nx, ny, nk, no))) continue
      seen.set(key4(nx, ny, nk, no), [...path, type])
      queue.push([nx, ny, nk, no])
    }
  }
  return null
}

describe('EDU-104 G0-U1 grid lessons (TQ-001 rewrite)', () => {
  it('covers L01–L06; formal-course lessons (L01–L05) have five steps, the rest four; L06 is the unit project', () => {
    expect(lessons.map(l => l.id)).toEqual(['G0-U1-L01', 'G0-U1-L02', 'G0-U1-L03', 'G0-U1-L04', 'G0-U1-L05', 'G0-U1-L06'])
    const project = g0u1GridLessons['G0-U1-L06'].project!
    expect(g0u1GridLessons['G0-U1-L06'].steps.find(s => s.id === project.stepId)?.kind).toBe('practice-a')
    for (const lesson of lessons) expect(lesson.steps).toHaveLength(FORMAL.includes(lesson.id) ? 5 : 4)
  })

  for (const lesson of lessons) {
    describe(lesson.id, () => {
      it('every solution really passes and uses only allowed blocks', () => {
        for (const step of lesson.steps) {
          expect(step.solutions.length, step.id).toBeGreaterThan(0)
          for (const program of step.solutions) {
            expect(runGridProgram(step.level, toBlocks(program)).passed, `${step.id} ${program}`).toBe(true)
            for (const type of program) expect(step.allowedBlocks, `${step.id} ${type}`).toContain(type)
          }
        }
      })

      it('every counter-example fails with the expected engine failure', () => {
        for (const step of lesson.steps) {
          expect(step.counterExamples.length, step.id).toBeGreaterThan(0)
          for (const c of step.counterExamples) expect(runGridProgram(step.level, toBlocks(c.program)).failure, `${step.id} ${c.program}`).toBe(c.failure)
        }
      })

      it('accepts at least two different correct programs (not one fixed answer)', () => {
        expect(lesson.steps.some(s => new Set(s.solutions.map(p => p.join())).size >= 2)).toBe(true)
      })

      it('has two hands-on practices with different goals', () => {
        const a = lesson.steps.find(s => s.kind === 'practice-a')!
        const b = lesson.steps.find(s => s.kind === 'practice-b')!
        expect(a && b).toBeTruthy()
        expect(a.instruction).not.toBe(b.instruction)
        expect(b.starterBlocks?.length ?? 0).toBeGreaterThan(0) // practice B is debugging a given program
        expect(a.starterBlocks ?? []).toHaveLength(0)
      })

      it('starter programs of debug practice fail before the fix', () => {
        for (const step of lesson.steps.filter(s => s.starterBlocks?.length)) {
          expect(runGridProgram(step.level, step.starterBlocks!).passed, step.id).toBe(false)
        }
      })

      it('hints are three distinct layers and diagnoses are lesson-specific, not templates', () => {
        for (const step of lesson.steps) {
          expect(new Set(step.hints).size, step.id).toBe(3)
          expect(step.predict.length).toBeGreaterThan(4)
        }
        const diagnoses = Object.values(lesson.diagnoses)
        expect(diagnoses.length).toBeGreaterThanOrEqual(3)
        for (const text of diagnoses) expect(text).not.toMatch(/检查「/)
      })

      it('needs no offline paper/floor activity and no loop yet', () => {
        const text = JSON.stringify(lesson)
        expect(text).not.toMatch(/网格纸|地面|repeat|循环|同伴/)
      })
    })
  }

  it('every lesson has a one-tap reflection check with exactly one right answer', () => {
    for (const lesson of lessons) {
      const check = lesson.reflectionCheck
      expect(check.options.length, lesson.id).toBeGreaterThanOrEqual(2)
      expect(check.options.filter(o => o.correct), lesson.id).toHaveLength(1)
      expect(check.why.length, lesson.id).toBeGreaterThan(8)
    }
  })

  describe('G0-U1-L01 formal-course pass (error lab, creative remake, review)', () => {
    const lesson = g0u1GridLessons['G0-U1-L01']
    const lab = lesson.steps.find(s => s.kind === 'error-lab')!
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('the error lab starter really produces the planned failure, and its predictions are two concrete, different outcomes', () => {
      expect(runGridProgram(lab.level, lab.starterBlocks!).failure).toBe(lab.errorLab!.expect)
      const [a, b] = lab.predictChoices!
      expect(a.when).not.toBe(b.when)
      expect([a.when, b.when]).toContain(lab.errorLab!.expect)
      expect(lab.errorLab!.expected).not.toBe(lab.errorLab!.actual)
    })

    it('every goal the child may choose is reachable with the allowed blocks, and the old route fails after a move', () => {
      expect(creative.creative!.goalChoices.length).toBeGreaterThanOrEqual(3)
      for (const goal of creative.creative!.goalChoices) {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        const steps = goal.x - level.start.x
        const right = ['when_start', ...Array(steps).fill('move_right_cell')]
        const forward = ['when_start', ...Array(steps).fill('move_forward')]
        expect(runGridProgram(level, toBlocks(right)).passed, `goal ${goal.x}`).toBe(true)
        expect(runGridProgram(level, toBlocks(forward)).passed, `goal ${goal.x}`).toBe(true)
        expect(runGridProgram(level, toBlocks(right.slice(0, -1))).failure, `goal ${goal.x}`).toBe('not_at_goal')
      }
      // Two children placing the house differently make two different valid works.
      const near = stepLevel(creative, { creative: { [creative.id]: { goal: { x: 2, y: 0 } } } })
      expect(runGridProgram(near, toBlocks(['when_start', 'move_right_cell', 'move_right_cell', 'move_right_cell'])).passed).toBe(false)
    })

    it('the creative remake is the saved lesson work, and review has a what-if with an answer', () => {
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.whatIf.length).toBeGreaterThan(6)
      expect(lesson.review?.answer.length).toBeGreaterThan(6)
    })

    it('keeps two practices with different goals besides the error lab and the remake', () => {
      expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    })
  })
  describe('G0-U1-L02 formal-course pass (error lab, creative remake, review)', () => {
    const lesson = g0u1GridLessons['G0-U1-L02']
    const lab = lesson.steps.find(s => s.kind === 'error-lab')!
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('keeps the same five-step shape as L01: error lab, guided, two different practices, creative', () => {
      expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    })

    it('the error lab is a wrong-direction mistake: the starter really walks off the map, and the predictions are two concrete outcomes', () => {
      expect(runGridProgram(lab.level, lab.starterBlocks!).failure).toBe('out_of_bounds')
      expect(lab.errorLab!.expect).toBe('out_of_bounds')
      expect(lab.starterBlocks!.map(b => b.type)).toContain('move_down')
      const [a, b] = lab.predictChoices!
      expect(a.when).not.toBe(b.when)
      expect([a.when, b.when]).toContain(lab.errorLab!.expect)
      expect(lab.errorLab!.expected).not.toBe(lab.errorLab!.actual)
    })

    it('every friend the child may pick is reachable on dry land with the four direction blocks; one route never fits two friends', () => {
      const choices = creative.creative!.goalChoices
      expect(choices.length).toBeGreaterThanOrEqual(3)
      expect(creative.creative!.labels).toHaveLength(choices.length)
      const routes = choices.map(goal => {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        expect(level.water?.some(w => w.x === goal.x && w.y === goal.y), `goal ${goal.x},${goal.y} on water`).toBeFalsy()
        const route = shortestRoute(level)
        expect(route, `goal ${goal.x},${goal.y}`).not.toBeNull()
        expect(runGridProgram(level, toBlocks(['when_start', ...route!])).passed).toBe(true)
        return { level, route: route! }
      })
      // Picking another friend invalidates the old route: each route fails on every other goal.
      for (const [i, a] of routes.entries()) {
        for (const [j, b] of routes.entries()) {
          if (i !== j) expect(runGridProgram(b.level, toBlocks(['when_start', ...a.route])).passed, `${i}→${j}`).toBe(false)
        }
      }
      // The choices really need different directions (not only "right"): at least one goal is straight up.
      expect(routes.some(r => r.route.every(t => t === 'move_up'))).toBe(true)
      expect(routes.some(r => r.route.includes('move_up') && r.route.includes('move_right_cell'))).toBe(true)
    })

    it('the creative remake is the saved lesson work, and review has a what-if with an answer', () => {
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.whatIf.length).toBeGreaterThan(6)
      expect(lesson.review?.answer).toContain('向左')
    })

    it('every step shows the original post-office scenery', () => {
      for (const step of lesson.steps) expect(step.level.scenery, step.id).toBe('signpost')
    })
  })
  describe('G0-U1-L03 formal-course pass (error lab, creative remake, review)', () => {
    const lesson = g0u1GridLessons['G0-U1-L03']
    const lab = lesson.steps.find(s => s.kind === 'error-lab')!
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('keeps the five-step shape: error lab, guided, two different practices, creative', () => {
      expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    })

    it('the error lab is a one-step-short mistake: the starter really stops before the house; adding one block fixes it', () => {
      expect(runGridProgram(lab.level, lab.starterBlocks!).failure).toBe('not_at_goal')
      expect(lab.errorLab!.expect).toBe('not_at_goal')
      const fixed = [...lab.starterBlocks!, { type: 'move_right_cell' }]
      expect(runGridProgram(lab.level, fixed).passed).toBe(true)
      const [a, b] = lab.predictChoices!
      expect(a.when).not.toBe(b.when)
      expect([a.when, b.when]).toContain(lab.errorLab!.expect)
    })

    it('the house may go on either side; each choice needs its own direction and count, off-by-one always fails', () => {
      const choices = creative.creative!.goalChoices
      expect(choices.length).toBeGreaterThanOrEqual(3)
      const start = creative.level.start
      expect(choices.some(c => c.x < start.x) && choices.some(c => c.x > start.x)).toBe(true)
      const routes = choices.map(goal => {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        const dx = goal.x - start.x
        const route = Array(Math.abs(dx)).fill(dx > 0 ? 'move_right_cell' : 'move_left')
        expect(runGridProgram(level, toBlocks(['when_start', ...route])).passed, `goal ${goal.x}`).toBe(true)
        expect(runGridProgram(level, toBlocks(['when_start', ...route.slice(0, -1)])).passed, `short ${goal.x}`).toBe(false)
        expect(runGridProgram(level, toBlocks(['when_start', ...route, route[0]])).passed, `long ${goal.x}`).toBe(false)
        return { level, route }
      })
      for (const [i, a] of routes.entries()) {
        for (const [j, b] of routes.entries()) {
          if (i !== j) expect(runGridProgram(b.level, toBlocks(['when_start', ...a.route])).passed, `${i}→${j}`).toBe(false)
        }
      }
    })

    it('the creative remake is the saved lesson work, review asks a what-if, and every step shows the counting board', () => {
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.answer).toContain('撤回最后一块')
      for (const step of lesson.steps) expect(step.level.scenery, step.id).toBe('counting')
    })
  })
  describe('G0-U1-L04 formal-course pass (error lab, creative remake, review)', () => {
    const lesson = g0u1GridLessons['G0-U1-L04']
    const lab = lesson.steps.find(s => s.kind === 'error-lab')!
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('keeps the five-step shape: error lab, guided, two different practices, creative', () => {
      expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    })

    it('the error lab shows a turn does not walk: the fox turns in place, and one forward block fixes it', () => {
      const run = runGridProgram(lab.level, lab.starterBlocks!)
      expect(run.failure).toBe('not_at_goal')
      const last = run.frames[run.frames.length - 1]
      expect([last.x, last.y, last.facing]).toEqual([lab.level.start.x, lab.level.start.y, 'up'])
      expect(runGridProgram(lab.level, [...lab.starterBlocks!, { type: 'move_forward' }]).passed).toBe(true)
      const [a, b] = lab.predictChoices!
      expect(a.when).not.toBe(b.when)
      expect([a.when, b.when]).toContain(lab.errorLab!.expect)
    })

    it('every friend is reachable around the rock with forward/turn blocks only, needs at least one turn, and one route never fits two friends', () => {
      const choices = creative.creative!.goalChoices
      expect(choices.length).toBeGreaterThanOrEqual(3)
      expect(creative.creative!.labels).toHaveLength(choices.length)
      expect(creative.allowedBlocks.filter(t => t !== 'when_start').sort()).toEqual(['move_forward', 'turn_left', 'turn_right'])
      const routes = choices.map(goal => {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        const route = shortestTurnRoute(level)
        expect(route, `goal ${goal.x},${goal.y}`).not.toBeNull()
        expect(route!.some(t => t.startsWith('turn_')), `goal ${goal.x},${goal.y}`).toBe(true)
        expect(runGridProgram(level, toBlocks(['when_start', ...route!])).passed).toBe(true)
        return { level, route: route! }
      })
      for (const [i, a] of routes.entries()) {
        for (const [j, b] of routes.entries()) {
          if (i !== j) expect(runGridProgram(b.level, toBlocks(['when_start', ...a.route])).passed, `${i}→${j}`).toBe(false)
        }
      }
      // The friend behind the rock really needs a detour: going straight hits the rock.
      const behind = routes[0].level
      expect(runGridProgram(behind, toBlocks(['when_start', 'move_forward', 'move_forward'])).failure).toBe('hit_rock')
    })

    it('the creative remake is the saved lesson work, review asks a what-if, and every step shows the turn sign', () => {
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.answer).toContain('向右转')
      for (const step of lesson.steps) expect(step.level.scenery, step.id).toBe('turnsign')
    })
  })
  describe('G0-U1-L05 formal-course pass (error lab, creative remake, review)', () => {
    const lesson = g0u1GridLessons['G0-U1-L05']
    const lab = lesson.steps.find(s => s.kind === 'error-lab')!
    const creative = lesson.steps.find(s => s.kind === 'creative')!

    it('keeps the five-step shape: error lab, guided, two different practices, creative', () => {
      expect(lesson.steps.map(s => s.kind)).toEqual(['error-lab', 'guided', 'practice-a', 'practice-b', 'creative'])
    })

    it('the error lab walks straight into the locked door; the door never opens by itself', () => {
      expect(runGridProgram(lab.level, lab.starterBlocks!).failure).toBe('door_locked')
      expect(lab.errorLab!.expect).toBe('door_locked')
      const [a, b] = lab.predictChoices!
      expect(a.when).not.toBe(b.when)
      expect([a.when, b.when]).toContain(lab.errorLab!.expect)
    })

    it('every friend behind the door is reached only by key → open → walk; skipping the key or swapping the order fails; one route never fits two friends', () => {
      const choices = creative.creative!.goalChoices
      expect(choices.length).toBeGreaterThanOrEqual(3)
      expect(creative.creative!.labels).toHaveLength(choices.length)
      const routes = choices.map(goal => {
        const level = stepLevel(creative, { creative: { [creative.id]: { goal } } })
        expect(goal.x).toBeGreaterThan(level.door!.x) // every friend lives behind the door
        const route = shortestKeyRoute(level)
        expect(route, `goal ${goal.x},${goal.y}`).not.toBeNull()
        expect(route!.indexOf('pick_key')).toBeGreaterThanOrEqual(0)
        expect(route!.indexOf('pick_key')).toBeLessThan(route!.indexOf('open_door'))
        expect(runGridProgram(level, toBlocks(['when_start', ...route!])).passed).toBe(true)
        expect(runGridProgram(level, toBlocks(['when_start', ...route!.filter(t => t !== 'pick_key')])).passed, 'no key').toBe(false)
        const swapped = [...route!]
        const ki = swapped.indexOf('pick_key'), oi = swapped.indexOf('open_door')
        ;[swapped[ki], swapped[oi]] = [swapped[oi], swapped[ki]]
        expect(runGridProgram(level, toBlocks(['when_start', ...swapped])).passed, 'swapped').toBe(false)
        return { level, route: route! }
      })
      for (const [i, a] of routes.entries()) {
        for (const [j, b] of routes.entries()) {
          if (i !== j) expect(runGridProgram(b.level, toBlocks(['when_start', ...a.route])).passed, `${i}→${j}`).toBe(false)
        }
      }
    })

    it('the creative remake is the saved lesson work, review asks a what-if, and every step shows the key hook board', () => {
      expect(lesson.project?.stepId).toBe(creative.id)
      expect(lesson.review?.answer).toContain('先捡钥匙')
      for (const step of lesson.steps) expect(step.level.scenery, step.id).toBe('keyhook')
    })
  })
})
