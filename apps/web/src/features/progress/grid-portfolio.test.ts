import { beforeEach, describe, expect, it } from 'vitest'
import { fenceLesson } from '@/content/curriculum/g0-u3-fence-lesson'
import { toGridBlocks } from '@/content/curriculum/g0-u1-grid-lessons'
import { gridDraftKey, parseGridDraft } from '@/features/lessons/grid/grid-draft'
import { collectGridWorks, removeGridWork } from './grid-portfolio'

const owner = 'user:alice'
const other = 'user:bob'
const key = gridDraftKey(fenceLesson.id, owner)

beforeEach(() => window.localStorage.clear())

describe('grid portfolio', () => {
  it('shows the saved project and removes only the project step when the user deletes it', () => {
    const first = fenceLesson.steps[0]
    const project = fenceLesson.steps[4]
    window.localStorage.setItem(key, JSON.stringify({
      savedAt: '2026-11-20T01:00:00.000Z',
      stepIndex: 4,
      passed: [first.id, project.id],
      programs: { [first.id]: toGridBlocks(first.solutions[0]), [project.id]: toGridBlocks(project.solutions[0]) },
      creative: { [project.id]: { goal: project.level.goal } },
    }))
    window.localStorage.setItem(gridDraftKey(fenceLesson.id), window.localStorage.getItem(key)!)
    expect(collectGridWorks(window.localStorage, other)).toEqual([])
    expect(collectGridWorks(window.localStorage, 'guest')).toEqual([])
    expect(collectGridWorks(window.localStorage, null)).toEqual([])
    removeGridWork(window.localStorage, fenceLesson.id, other)
    expect(collectGridWorks(window.localStorage, owner)).toEqual([expect.objectContaining({
      id: 'grid:G0-U3-L05', href: '/learn/grid-lab/G0-U3-L05', localPassed: true,
    })])
    removeGridWork(window.localStorage, fenceLesson.id, owner)
    expect(collectGridWorks(window.localStorage, owner)).toEqual([])
    expect(window.localStorage.getItem(gridDraftKey(fenceLesson.id))).not.toBeNull()
    const remaining = parseGridDraft(fenceLesson, window.localStorage.getItem(key))
    expect(remaining?.passed).toEqual([first.id])
    expect(remaining?.programs[first.id]).toBeDefined()
    expect(remaining?.programs[project.id]).toBeUndefined()
  })
})
