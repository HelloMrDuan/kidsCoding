import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import { gridDraftKey } from '../grid/grid-draft'
import { LESSON_DRAFT_OWNER_STORAGE_KEY } from '../scoped-draft-key'
import {
  coerceGridDraft,
  emptyGridDraft,
  gridCurrentProgram,
  gridCurrentStep,
  gridStarterProgram,
  hasLegacyGridDraft,
  hasUnclaimableLegacyGridDraft,
  importLegacyGridDraft,
  isEmptyGridDraft,
  isValidGridDraft,
  legacyGridDraftKeys,
  type GridSlotData,
} from './grid-v3-draft'

const L01 = g0u1GridLessons['G0-U1-L01']
const L05 = g0u1GridLessons['G0-U1-L05']
const START = { type: 'when_start' }
const RIGHT = { type: 'move_right_cell' }

function draftWith(program: unknown[], stepIndex = 1): GridSlotData {
  const draft = emptyGridDraft(L01)
  draft.stepIndex = stepIndex
  const stepId = L01.steps[stepIndex].id
  draft.programs[stepId] = program as never
  return draft
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('grid-v3 draft shape', () => {
  it('a fresh draft is the starter programs of every step, and it is valid + empty', () => {
    const draft = emptyGridDraft(L01)
    expect(draft.version).toBe(1)
    expect(draft.lessonId).toBe(L01.id)
    expect(draft.stepIndex).toBe(0)
    expect(draft.passed).toEqual([])
    expect(draft.failures).toBe(0)
    expect(Object.keys(draft.programs)).toEqual(L01.steps.map((step) => step.id))
    // error-lab 关带着预置错误程序；其余为空。
    expect(draft.programs[L01.steps[0].id]).toEqual([{ type: 'move_right_cell' }])
    expect(draft.programs[L01.steps[1].id]).toEqual([])
    expect(isValidGridDraft(L01, draft)).toBe(true)
    expect(isEmptyGridDraft(L01, draft)).toBe(true)
  })

  it('the starter program is a clone: editing the draft never mutates lesson data', () => {
    const starter = gridStarterProgram(L01.steps[0])
    starter.push({ type: START.type })
    expect(L01.steps[0].starterBlocks).toEqual([{ type: 'move_right_cell' }])
  })

  it('current step / program are clamped to this lesson', () => {
    expect(gridCurrentStep(L01, { stepIndex: -3 }).id).toBe(L01.steps[0].id)
    expect(gridCurrentStep(L01, { stepIndex: 99 }).id).toBe(L01.steps[L01.steps.length - 1].id)
    expect(gridCurrentProgram(L01, { stepIndex: 99, programs: {} })).toEqual([])
  })
})

describe('isValidGridDraft (strict, fail closed)', () => {
  it('accepts a real running record', () => {
    const draft = draftWith([START, RIGHT, RIGHT, RIGHT])
    draft.passed = [L01.steps[1].id]
    draft.failures = 2
    draft.mistakes = ['no_start']
    draft.reflection = 0
    expect(isValidGridDraft(L01, draft)).toBe(true)
  })

  it('rejects foreign lessons, bad versions and out-of-range steps', () => {
    expect(isValidGridDraft(L01, { ...emptyGridDraft(L05) })).toBe(false)
    expect(isValidGridDraft(L01, { ...emptyGridDraft(L01), version: 2 })).toBe(false)
    expect(isValidGridDraft(L01, { ...emptyGridDraft(L01), stepIndex: 99 })).toBe(false)
    expect(isValidGridDraft(L01, { ...emptyGridDraft(L01), stepIndex: 1.5 })).toBe(false)
    expect(isValidGridDraft(L01, { ...emptyGridDraft(L01), failures: -1 })).toBe(false)
    expect(isValidGridDraft(L01, null)).toBe(false)
  })

  it('rejects blocks outside the step whitelist and extra keys', () => {
    const foreign = draftWith([START, { type: 'pick_key' }])
    expect(isValidGridDraft(L01, foreign)).toBe(false)
    const extraKey = draftWith([START, { type: 'move_right_cell', extra: true }])
    expect(isValidGridDraft(L01, extraKey)).toBe(false)
  })

  it('rejects unknown steps, failures and untrusted creative passes', () => {
    const unknownStep = { ...draftWith([START]), passed: ['not-a-step'] }
    expect(isValidGridDraft(L01, unknownStep)).toBe(false)
    const unknownMistake = { ...draftWith([START]), mistakes: ['not_a_failure'] }
    expect(isValidGridDraft(L01, unknownMistake)).toBe(false)
    // 创意关通过必须带着当时选的目标格，否则无法重放。
    const creative = emptyGridDraft(L01)
    creative.passed = [L01.steps[4].id]
    expect(isValidGridDraft(L01, creative)).toBe(false)
    creative.creative = { [L01.steps[4].id]: { goal: { x: 99, y: 0 } } }
    expect(isValidGridDraft(L01, creative)).toBe(false)
    creative.creative = { [L01.steps[4].id]: { goal: { x: 3, y: 0 } } }
    expect(isValidGridDraft(L01, creative)).toBe(true)
  })
})

describe('coerceGridDraft (field-level repair)', () => {
  it('repairs a damaged draft instead of throwing it away wholesale', () => {
    const draft = coerceGridDraft(L01, {
      version: 1,
      lessonId: L01.id,
      stepIndex: 99,
      programs: {
        [L01.steps[1].id]: [START, { type: 'pick_key' }],
        'not-a-step': [START],
      },
      passed: [L01.steps[1].id, 'not-a-step', L01.steps[4].id],
      failures: -2,
      reflection: 99,
      observed: ['leave-treehouse', 'not-an-error-lab'],
      creative: { [L01.steps[4].id]: { goal: { x: 99, y: 0 } } },
      mistakes: ['no_start', 'not_a_failure'],
      finished: 'yes',
    })
    expect(draft.stepIndex).toBe(L01.steps.length - 1)
    expect(draft.programs[L01.steps[1].id]).toEqual([START])
    expect(draft.programs['not-a-step']).toBeUndefined()
    expect(draft.programs[L01.steps[1].id]).toHaveLength(1)
    expect(draft.passed).toEqual([L01.steps[1].id])
    expect(draft.failures).toBe(0)
    expect(draft.reflection).toBeUndefined()
    expect(draft.observed).toEqual(['leave-treehouse'])
    expect(draft.creative).toBeUndefined()
    expect(draft.mistakes).toEqual(['no_start'])
    expect(draft.finished).toBeUndefined()
    expect(isValidGridDraft(L01, draft)).toBe(true)
  })

  it('foreign lesson payloads never leak into this lesson’s draft', () => {
    expect(coerceGridDraft(L01, emptyGridDraft(L05))).toEqual(emptyGridDraft(L01))
    expect(coerceGridDraft(L01, { hello: 'world' })).toEqual(emptyGridDraft(L01))
  })
})

describe('legacy classroom draft (owner-isolated read-only compatibility)', () => {
  const GUEST_A = 'guest:family-a'
  const GUEST_B = 'guest:family-b'
  const USER_A = 'user:a'
  const USER_B = 'user:b'
  const old = {
    stepIndex: 2,
    programs: {
      [L01.steps[1].id]: [START, RIGHT, RIGHT, RIGHT],
      [L01.steps[2].id]: [START, RIGHT, RIGHT],
    },
    passed: [L01.steps[1].id, L01.steps[2].id],
    savedAt: '2026-10-01T00:00:00.000Z',
    reflection: 1,
    observed: [L01.steps[0].id],
    mistakes: ['no_start', 'not_at_goal'],
  }
  const finishedOld = {
    stepIndex: 4,
    programs: Object.fromEntries(L01.steps.map((step) => [step.id, [START]])),
    passed: L01.steps.map((step) => step.id),
    // 创意关的通过记录必须带着孩子当时选的目标格，旧解析器才认。
    creative: { [L01.steps[4].id]: { goal: { x: 2, y: 0 } } },
    reflection: 0,
    savedAt: null,
  }
  const seedUnscoped = (value: unknown = old) => {
    window.localStorage.setItem(gridDraftKey(L01.id), JSON.stringify(value))
  }
  const stamp = () => window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)

  it('unknown identity reads no legacy key at all (fail-closed)', () => {
    seedUnscoped()
    for (const owner of [undefined, null, '', 'owner-a', 'someone-else']) {
      expect(legacyGridDraftKeys(L01.id, owner)).toEqual([])
      expect(hasLegacyGridDraft(L01, owner)).toBe(false)
      expect(importLegacyGridDraft(L01, owner).ok).toBe(false)
      expect(hasUnclaimableLegacyGridDraft(L01, owner)).toBe(true)
    }
    expect(stamp()).toBeNull()
    expect(window.localStorage.getItem(gridDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('offers the owner-scoped key first; the unscoped key only to a guest that may claim it', () => {
    expect(legacyGridDraftKeys(L01.id, GUEST_A)).toEqual([gridDraftKey(L01.id, GUEST_A), gridDraftKey(L01.id)])
    expect(legacyGridDraftKeys(L01.id, USER_A)).toEqual([gridDraftKey(L01.id, USER_A)])
    window.localStorage.setItem(LESSON_DRAFT_OWNER_STORAGE_KEY, GUEST_A)
    expect(legacyGridDraftKeys(L01.id, GUEST_B)).toEqual([gridDraftKey(L01.id, GUEST_B)])
  })

  it('imports a real old draft for its claiming guest and stamps the claim without touching the old key', () => {
    seedUnscoped()
    expect(hasLegacyGridDraft(L01, GUEST_A)).toBe(true)
    expect(hasUnclaimableLegacyGridDraft(L01, GUEST_A)).toBe(false)
    const imported = importLegacyGridDraft(L01, GUEST_A)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.fromStep).toBe(2)
    expect(imported.importedSteps).toBe(2)
    expect(imported.data.stepIndex).toBe(2)
    expect(imported.data.programs[L01.steps[1].id]).toEqual([START, RIGHT, RIGHT, RIGHT])
    // 缺失关按本关初始程序回填（error-lab 带回预置错误程序）。
    expect(imported.data.programs[L01.steps[0].id]).toEqual([{ type: 'move_right_cell' }])
    expect(imported.data.passed).toEqual([L01.steps[1].id, L01.steps[2].id])
    expect(imported.data.observed).toEqual([L01.steps[0].id])
    expect(imported.data.reflection).toBe(1)
    expect(imported.data.mistakes).toEqual(['no_start', 'not_at_goal'])
    expect(imported.data.failures).toBe(0)
    expect(imported.data.finished).toBeUndefined()
    expect(stamp()).toBe(GUEST_A)
    // 旧键原样保留：导入不写、不删、不复制旧草稿。
    expect(window.localStorage.getItem(gridDraftKey(L01.id))).toBe(JSON.stringify(old))
    expect(window.localStorage.getItem(gridDraftKey(L01.id, GUEST_A))).toBeNull()
  })

  it('guest A then B then A: B never reads the old draft A claimed, A still can', () => {
    seedUnscoped()
    expect(importLegacyGridDraft(L01, GUEST_A).ok).toBe(true)
    expect(hasLegacyGridDraft(L01, GUEST_B)).toBe(false)
    expect(importLegacyGridDraft(L01, GUEST_B)).toEqual({ ok: false, reason: '旧课堂没有找到可导入的草稿。' })
    expect(hasUnclaimableLegacyGridDraft(L01, GUEST_B)).toBe(true)
    expect(stamp()).toBe(GUEST_A)
    const again = importLegacyGridDraft(L01, GUEST_A)
    expect(again.ok).toBe(true)
    if (again.ok) expect(again.data.passed).toEqual(old.passed)
    expect(window.localStorage.getItem(gridDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('a pre-cookie bare guest claim is adopted by the concrete guest id, then closed to the bare guest', () => {
    seedUnscoped()
    expect(importLegacyGridDraft(L01, 'guest').ok).toBe(true)
    expect(stamp()).toBe('guest')
    expect(importLegacyGridDraft(L01, GUEST_A).ok).toBe(true)
    expect(stamp()).toBe(GUEST_A)
    expect(hasLegacyGridDraft(L01, 'guest')).toBe(false)
    expect(hasLegacyGridDraft(L01, GUEST_B)).toBe(false)
  })

  it('user A then B then A: signed-in accounts never read the unscoped draft, only their own scoped one', () => {
    seedUnscoped()
    window.localStorage.setItem(
      gridDraftKey(L01.id, USER_A),
      JSON.stringify({ stepIndex: 1, programs: { [L01.steps[1].id]: [START, RIGHT] }, passed: [], savedAt: null }),
    )
    const a = importLegacyGridDraft(L01, USER_A)
    expect(a.ok).toBe(true)
    if (a.ok) {
      expect(a.data.stepIndex).toBe(1)
      expect(a.data.programs[L01.steps[1].id]).toEqual([START, RIGHT])
      expect(a.data.passed).toEqual([])
    }
    expect(hasLegacyGridDraft(L01, USER_B)).toBe(false)
    expect(importLegacyGridDraft(L01, USER_B).ok).toBe(false)
    expect(hasUnclaimableLegacyGridDraft(L01, USER_B)).toBe(true)
    expect(hasUnclaimableLegacyGridDraft(L01, USER_A)).toBe(false)
    expect(importLegacyGridDraft(L01, USER_A).ok).toBe(true)
    // 账号从不认领访客旧草稿：认领戳不变，旧键不变。
    expect(stamp()).toBeNull()
    expect(window.localStorage.getItem(gridDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('a signed-in account with only an unscoped old draft gets nothing to import', () => {
    seedUnscoped(finishedOld)
    expect(hasLegacyGridDraft(L01, USER_A)).toBe(false)
    expect(hasUnclaimableLegacyGridDraft(L01, USER_A)).toBe(true)
    expect(stamp()).toBeNull()
  })

  it('restores a fully-passed old draft as finished, keeping passes, reflection and the creative work', () => {
    seedUnscoped(finishedOld)
    const imported = importLegacyGridDraft(L01, GUEST_A)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.data.finished).toBe(true)
    expect(imported.data.passed).toEqual(L01.steps.map((step) => step.id))
    expect(imported.data.reflection).toBe(0)
    expect(imported.data.creative).toEqual({ [L01.steps[4].id]: { goal: { x: 2, y: 0 } } })
    expect(isValidGridDraft(L01, imported.data)).toBe(true)
    // 恢复后的完成态经外壳信封往返（coerce）仍保持完成。
    expect(coerceGridDraft(L01, JSON.parse(JSON.stringify(imported.data))).finished).toBe(true)
  })

  it('reports malformed / missing old drafts honestly and never throws', () => {
    expect(importLegacyGridDraft(L01, GUEST_A)).toEqual({
      ok: false,
      reason: '旧课堂没有找到可导入的草稿。',
    })
    expect(hasUnclaimableLegacyGridDraft(L01, GUEST_A)).toBe(false)
    window.localStorage.setItem(gridDraftKey(L01.id), '{not json')
    expect(importLegacyGridDraft(L01, GUEST_A)).toEqual({
      ok: false,
      reason: '旧课堂的草稿格式不对，无法导入。',
    })
  })

  it('reads an owner-scoped old draft when the classroom once used the golden layout', () => {
    window.localStorage.setItem(
      gridDraftKey(L01.id, USER_A),
      JSON.stringify({ stepIndex: 1, programs: {}, passed: [], savedAt: null }),
    )
    expect(hasLegacyGridDraft(L01, USER_A)).toBe(true)
    expect(hasLegacyGridDraft(L01, USER_B)).toBe(false)
    expect(hasLegacyGridDraft(L01)).toBe(false)
    expect(importLegacyGridDraft(L01, USER_A).ok).toBe(true)
  })
})
