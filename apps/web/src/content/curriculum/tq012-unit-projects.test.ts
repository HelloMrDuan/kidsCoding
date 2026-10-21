import { describe, expect, it } from 'vitest'

import { allKidsBlockLabels } from '@/features/lessons/blockly/block-labels'
import { evaluateAcceptedPrograms, simulateProgram, type ProgramBlock } from '@/features/lessons/blockly/observable-run'
import { explainRunFailure } from '@/features/lessons/blockly/run-feedback'
import {
  ALL_SAY_LINE_GROUPS,
  FOREST_GREETING_LINES,
  GARDEN_REPLY_LINES,
  MEADOW_TRAVEL_LINES,
  resolveSayLine,
} from '@/features/lessons/blockly/say-line-presets'

import { launchLessons } from './launch-lessons'
import {
  evaluateUnitProject,
  getUnitProject,
  getUnitProjectJudgeOptions,
  getUnitProjectStartBlocks,
  UNIT_PROJECT_LESSON_IDS,
  unitProjects,
} from './unit-projects'

/** TQ-012 (= TQ-002f): unit projects of lessons 01–09 — data and judging. */
const L03 = 'lesson-03-forest-story'
const L06 = 'lesson-06-meadow-story'
const L09 = 'lesson-09-garden-story'
const CHOICE_LESSONS = [L03, L06, L09]

const prog = (types: string[], line?: string): ProgramBlock[] =>
  types.map((type) => (type === 'say_line' && line ? { type, line } : { type }))

describe('TQ-012 unit project config', () => {
  it('covers exactly lessons 01–09 in order', () => {
    expect(UNIT_PROJECT_LESSON_IDS).toEqual(launchLessons.slice(0, 9).map((lesson) => lesson.id))
  })

  it.each(unitProjects.map((project) => [project.lessonId, project] as const))(
    '%s: allowed blocks are the lesson blocks, starter = main build, every accepted program passes',
    (lessonId, project) => {
      const lesson = launchLessons.find((item) => item.id === lessonId)!
      expect(new Set(project.allowedBlocks)).toEqual(new Set(lesson.steps.flatMap((step) => step.allowedBlocks)))
      expect(project.starterProgram).toEqual(lesson.steps.find((step) => step.id === 'step-2')!.requiredBlockTypes)
      expect(project.acceptedPrograms.length).toBeGreaterThan(0)
      for (const program of project.acceptedPrograms) {
        expect(program.every((type) => project.allowedBlocks.includes(type))).toBe(true)
        expect(evaluateUnitProject(lessonId, prog([...program])).passed).toBe(true)
      }
      expect(evaluateUnitProject(lessonId, prog([...project.starterProgram])).passed).toBe(true)
    },
  )

  it('L03 / L06 / L09 offer a line choice and two observably different correct programs', () => {
    for (const lessonId of CHOICE_LESSONS) {
      const project = getUnitProject(lessonId)!
      expect(project.sayLineChoices!.length).toBeGreaterThanOrEqual(3)
      expect(project.choiceHint).toBeTruthy()
      expect(project.acceptedPrograms).toHaveLength(2)
      const [a, b] = project.acceptedPrograms.map((program) => {
        const run = simulateProgram(program.map((type) => ({ type })))
        if (!run.ok) throw new Error('reference cannot run')
        return run.observed
      })
      expect(a).not.toEqual(b)
    }
    expect(getUnitProject(L03)!.sayLineChoices).toBe(FOREST_GREETING_LINES)
    expect(getUnitProject(L06)!.sayLineChoices).toBe(MEADOW_TRAVEL_LINES)
    expect(getUnitProject(L09)!.sayLineChoices).toBe(GARDEN_REPLY_LINES)
  })

  it('kid copy is short and quotes only real block labels', () => {
    const labels = new Set([...allKidsBlockLabels('walk'), ...allKidsBlockLabels('fly')])
    for (const project of unitProjects) {
      for (const text of [project.title, project.prompt, project.choiceHint ?? '']) {
        expect(text.length).toBeLessThanOrEqual(40)
        for (const [, quoted] of text.matchAll(/“([^”]+)”/g)) expect(labels.has(quoted)).toBe(true)
      }
      if (project.verb === 'fly') expect(`${project.prompt}${project.choiceHint ?? ''}`).not.toMatch(/走/)
    }
  })
})

describe('TQ-012 unit project judging', () => {
  it('L03: walk-walk-say and walk-say-walk both pass, with any preset line', () => {
    for (const line of FOREST_GREETING_LINES) {
      expect(evaluateUnitProject(L03, prog(['when_start', 'move_right', 'move_right', 'say_line'], line.id)).passed).toBe(true)
      expect(evaluateUnitProject(L03, prog(['when_start', 'move_right', 'say_line', 'move_right'], line.id)).passed).toBe(true)
    }
    // no choice: the forest default line still passes
    expect(evaluateUnitProject(L03, prog(['when_start', 'move_right', 'move_right', 'say_line'])).passed).toBe(true)
  })

  it('L03: saying before walking fails with a specific cause', () => {
    const verdict = evaluateUnitProject(L03, prog(['when_start', 'say_line', 'move_right', 'move_right'], 'hi-all'))
    expect(verdict.passed).toBe(false)
    expect(verdict.code).toBe('say-too-early')
    expect(explainRunFailure(verdict)).toMatch(/说早/)
    expect(evaluateUnitProject(L03, prog(['when_start', 'move_right', 'say_line'])).code).toBe('too-few-moves')
  })

  it('L06: say in the meadow at the end or in the forest before switching — both pass', () => {
    for (const line of MEADOW_TRAVEL_LINES) {
      expect(evaluateUnitProject(L06, prog(['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], line.id)).passed).toBe(true)
      expect(evaluateUnitProject(L06, prog(['when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice'], line.id)).passed).toBe(true)
    }
    // no choice: the scene default line still passes in both places
    expect(evaluateUnitProject(L06, prog(['when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice'])).passed).toBe(true)
    expect(evaluateUnitProject(L06, prog(['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'])).passed).toBe(true)
    // switching too late still fails
    expect(evaluateUnitProject(L06, prog(['when_start', 'move_right', 'repeat_twice', 'switch_scene', 'say_line'])).passed).toBe(false)
  })

  it('L09: reply after one flight or after both — both pass; replying before flying fails', () => {
    for (const line of GARDEN_REPLY_LINES) {
      expect(evaluateUnitProject(L09, prog(['when_clicked', 'move_right', 'say_line', 'repeat_twice'], line.id)).passed).toBe(true)
      expect(evaluateUnitProject(L09, prog(['when_clicked', 'move_right', 'repeat_twice', 'say_line'], line.id)).passed).toBe(true)
    }
    expect(evaluateUnitProject(L09, prog(['when_clicked', 'say_line', 'move_right', 'repeat_twice'])).code).toBe('say-too-early')
    expect(evaluateUnitProject(L09, prog(['when_start', 'move_right', 'say_line', 'repeat_twice'])).code).toBe('needs-click-trigger')
  })

  it('rejects a line id that is unknown or belongs to another project', () => {
    const walkSay = ['when_start', 'move_right', 'move_right', 'say_line']
    expect(evaluateUnitProject(L03, prog(walkSay, 'not-a-line')).code).toBe('unknown-line')
    expect(evaluateUnitProject(L03, prog(walkSay, 'meadow-pretty')).code).toBe('unknown-line')
    expect(evaluateUnitProject('lesson-08-garden-dialogue', prog(['when_clicked', 'move_right', 'say_line'], 'garden-thanks')).code).toBe('unknown-line')
    expect(explainRunFailure({ code: 'unknown-line', goal: null, actual: null })).toMatch(/选一句对白/)
  })

  it('rejects blocks the lesson does not offer and unknown lessons', () => {
    // observably equal to walk-walk-say, but “重复” is not a lesson-03 block
    expect(evaluateUnitProject(L03, prog(['when_start', 'move_right', 'repeat_twice', 'say_line'])).code).toBe('unsupported-block')
    expect(evaluateUnitProject('lesson-99', prog(['when_start'])).code).toBe('goal-misconfigured')
  })

  it('judge options are stable and include scene defaults for choice lessons', () => {
    expect(getUnitProjectJudgeOptions(L06)).toBe(getUnitProjectJudgeOptions(L06))
    expect(getUnitProjectJudgeOptions(L06).acceptedLines).toEqual(expect.arrayContaining(['我到草地啦！', '你好！', '草地真漂亮！']))
    expect(getUnitProjectJudgeOptions(L06).allowedLineIds).toEqual(MEADOW_TRAVEL_LINES.map((line) => line.id))
  })

  it('evaluateAcceptedPrograms with no references never passes', () => {
    expect(evaluateAcceptedPrograms([], prog(['when_start'])).code).toBe('goal-misconfigured')
  })
})

describe('TQ-012 say line presets', () => {
  it('ids are unique across groups and every group resolves; old forest ids unchanged', () => {
    const ids = ALL_SAY_LINE_GROUPS.flat().map((line) => line.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const line of ALL_SAY_LINE_GROUPS.flat()) expect(resolveSayLine(line.id)).toBe(line.text)
    expect(resolveSayLine('hello')).toBe('你好！')
    expect(resolveSayLine('nope')).toBeNull()
    expect(MEADOW_TRAVEL_LINES[0].text).toBe('我到草地啦！')
    expect(GARDEN_REPLY_LINES[0].text).toBe('蝴蝶收到你的点击啦！')
  })
})

describe('TQ-012 start blocks', () => {
  it('opens the saved snapshot (with lines) or falls back to the main build', () => {
    const saved = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'hi-all' }, { type: 'move_right' }]
    expect(getUnitProjectStartBlocks(L03, saved)).toEqual(saved)
    expect(getUnitProjectStartBlocks(L03, undefined)).toEqual(getUnitProject(L03)!.starterProgram.map((type) => ({ type })))
    expect(getUnitProjectStartBlocks(L03, [])).toHaveLength(4)
    expect(getUnitProjectStartBlocks('lesson-99', saved)).toEqual([])
  })
})
