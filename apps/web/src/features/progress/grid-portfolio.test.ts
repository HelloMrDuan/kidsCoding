import { beforeEach, describe, expect, it } from 'vitest'
import { fenceLesson } from '@/content/curriculum/g0-u3-fence-lesson'
import { toGridBlocks } from '@/content/curriculum/g0-u1-grid-lessons'
import { gridDraftKey, parseGridDraft } from '@/features/lessons/grid/grid-draft'
import { saveDraft, loadDraft } from '@/features/lessons/workspace/workspace-draft'
import { emptyGridDraft } from '@/features/lessons/grid-v3/grid-v3-draft'
import {
  isGridProjectDeleted,
  loadGridProjectDraft,
  saveGridProjectDraft,
} from '@/features/lessons/grid-v3/grid-project'
import { collectGridWorks, removeGridWork } from './grid-portfolio'

const owner = 'user:alice'
const other = 'user:bob'
const key = gridDraftKey(fenceLesson.id, owner)
const legacyKey = gridDraftKey(fenceLesson.id)

function workDraft() {
  const first = fenceLesson.steps[0]
  const project = fenceLesson.steps[4]
  return {
    first,
    project,
    draft: {
      ...emptyGridDraft(fenceLesson),
      stepIndex: 4,
      passed: [first.id, project.id],
      programs: {
        [first.id]: toGridBlocks(first.solutions[0]),
        [project.id]: toGridBlocks(project.solutions[0]),
      },
      creative: { [project.id]: { goal: project.creative!.goalChoices[0] } },
      finished: true,
    },
  }
}

beforeEach(() => window.localStorage.clear())

describe('grid portfolio', () => {
  it('OPS-057: deleting a work leaves both lesson drafts byte-identical and blocks them from reappearing', () => {
    const { project, draft } = workDraft()
    // 旧课堂草稿 + V3 课程草稿都保存过这件作品。
    saveDraft(window.localStorage, fenceLesson.id, draft, owner)
    const v3Before = window.localStorage.getItem(key)
    window.localStorage.setItem(legacyKey, JSON.stringify({
      savedAt: '2026-11-20T01:00:00.000Z',
      stepIndex: 4,
      passed: draft.passed,
      programs: draft.programs,
      creative: draft.creative,
    }))
    const legacyBefore = window.localStorage.getItem(legacyKey)
    expect(collectGridWorks(window.localStorage, owner)).toHaveLength(1)

    // 其他账号的删除不影响这件作品。
    removeGridWork(window.localStorage, fenceLesson.id, other)
    expect(collectGridWorks(window.localStorage, owner)).toHaveLength(1)

    removeGridWork(window.localStorage, fenceLesson.id, owner)
    expect(collectGridWorks(window.localStorage, owner)).toEqual([])
    expect(isGridProjectDeleted(fenceLesson.id, owner)).toBe(true)
    // 删除作品绝不改课程草稿：程序、创意、passed、finished 原样，逐字节一致。
    expect(window.localStorage.getItem(key)).toBe(v3Before)
    expect(window.localStorage.getItem(legacyKey)).toBe(legacyBefore)
    const remaining = loadDraft(window.localStorage, fenceLesson.id, owner).data as typeof draft
    expect(remaining.passed).toEqual(draft.passed)
    expect(remaining.programs[project.id]).toEqual(draft.programs[project.id])
    expect(remaining.creative?.[project.id]).toEqual(draft.creative[project.id])
    expect(remaining.finished).toBe(true)
    const legacy = parseGridDraft(fenceLesson, window.localStorage.getItem(legacyKey))
    expect(legacy?.programs[project.id]).toBeDefined()
    expect(legacy?.creative?.[project.id]).toBeDefined()
    expect(legacy?.passed).toContain(project.id)
    // 作品模式不会再从课程草稿/旧草稿打开已删除作品。
    expect(loadGridProjectDraft(fenceLesson.id, owner).data).toBeNull()
  })

  it('OPS-057: an independent work envelope is listed and deleted without touching the lesson draft', () => {
    const { first, project, draft } = workDraft()
    // 课程草稿只保留第一关的进度；作品模式另存整件作品。
    saveDraft(window.localStorage, fenceLesson.id, {
      ...emptyGridDraft(fenceLesson),
      passed: [first.id],
      programs: { [first.id]: toGridBlocks(first.solutions[0]) },
    }, owner)
    const courseDraft = window.localStorage.getItem(key)
    const work = {
      ...emptyGridDraft(fenceLesson),
      stepIndex: 4,
      passed: [first.id, project.id],
      programs: { [project.id]: toGridBlocks(project.solutions[0]) },
      creative: { [project.id]: { goal: project.creative!.goalChoices[0] } },
    }
    expect(saveGridProjectDraft(fenceLesson.id, work, owner)).toEqual({ ok: true })
    expect(window.localStorage.getItem(key)).toBe(courseDraft)
    expect(collectGridWorks(window.localStorage, other)).toEqual([])
    expect(collectGridWorks(window.localStorage, owner)).toEqual([expect.objectContaining({
      id: 'grid:G0-U3-L05', href: '/studio/blockly/project/grid/G0-U3-L05',
    })])
    expect(loadGridProjectDraft(fenceLesson.id, owner).data).not.toBeNull()

    removeGridWork(window.localStorage, fenceLesson.id, owner)
    expect(window.localStorage.getItem(key)).toBe(courseDraft)
    expect(collectGridWorks(window.localStorage, owner)).toEqual([])
    expect(loadGridProjectDraft(fenceLesson.id, owner).data).toBeNull()

    // 重新保存一件真实作品即解除删除标记；课程草稿仍未被改写。
    expect(saveGridProjectDraft(fenceLesson.id, work, owner)).toEqual({ ok: true })
    expect(collectGridWorks(window.localStorage, owner)).toHaveLength(1)
    expect(loadGridProjectDraft(fenceLesson.id, owner).data).not.toBeNull()
    expect(window.localStorage.getItem(key)).toBe(courseDraft)
    expect(draft.programs[project.id]).toBeDefined()
  })

  it('OPS-057: ordinary lesson progress is never opened as a work', () => {
    const first = fenceLesson.steps[0]
    const project = fenceLesson.steps[4]
    saveDraft(window.localStorage, fenceLesson.id, {
      ...emptyGridDraft(fenceLesson),
      stepIndex: 4,
      passed: [first.id],
      programs: { [first.id]: toGridBlocks(first.solutions[0]) },
    }, owner)
    // 只有普通课程进度 → 不是作品。
    expect(loadGridProjectDraft(fenceLesson.id, owner).data).toBeNull()
    expect(collectGridWorks(window.localStorage, owner)).toEqual([])

    // 有作品关程序、但创意关没有目标格 → 仍不算真实作品。
    saveDraft(window.localStorage, fenceLesson.id, {
      ...emptyGridDraft(fenceLesson),
      stepIndex: 4,
      programs: { [project.id]: toGridBlocks(project.solutions[0]) },
    }, owner)
    expect(loadGridProjectDraft(fenceLesson.id, owner).data).toBeNull()

    // 两样都有才是真实保存过的作品。
    saveDraft(window.localStorage, fenceLesson.id, {
      ...emptyGridDraft(fenceLesson),
      stepIndex: 4,
      programs: { [project.id]: toGridBlocks(project.solutions[0]) },
      creative: { [project.id]: { goal: project.creative!.goalChoices[0] } },
    }, owner)
    expect(loadGridProjectDraft(fenceLesson.id, owner).data).not.toBeNull()
    expect(collectGridWorks(window.localStorage, owner)).toHaveLength(1)
  })
})
