import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { g0u2EventLessons } from '@/content/curriculum/g0-u2-event-lessons'
import { eventDraftKey } from '../event/event-draft'
import { LESSON_DRAFT_OWNER_STORAGE_KEY, scopedLessonDraftKey } from '../scoped-draft-key'
import {
  coerceEventDraft,
  emptyEventDraft,
  eventActorProgram,
  eventCurrentStep,
  eventStarterBlocks,
  hasLegacyEventDraft,
  hasUnclaimableLegacyEventDraft,
  importLegacyEventDraft,
  isEmptyEventDraft,
  isStarterProgram,
  isValidEventDraft,
  legacyEventDraftKeys,
  type EventActorPrograms,
  type EventSlotData,
} from './event-v3-draft'

const L01 = g0u2EventLessons['G0-U2-L01']
const L02 = g0u2EventLessons['G0-U2-L02']
const [LAB, GUIDED, PRACTICE_A, PRACTICE_B, CREATIVE] = L01.steps.map((step) => step.id)

const START = { type: 'when_start' }
const CLICKED = { type: 'when_clicked' }
const WAKE = { type: 'wake_up' }
const HELLO = { type: 'say_hello' }

function draftAt(stepIndex: number, programs: EventActorPrograms): EventSlotData {
  const draft = emptyEventDraft(L01)
  draft.stepIndex = stepIndex
  draft.programs[L01.steps[stepIndex].id] = programs
  return draft
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe('event-v3 draft shape', () => {
  it('a fresh draft is every step’s starter program per editable character, valid and empty', () => {
    const draft = emptyEventDraft(L01)
    expect(draft.version).toBe(1)
    expect(draft.lessonId).toBe(L01.id)
    expect(draft.stepIndex).toBe(0)
    expect(draft.passed).toEqual([])
    expect(draft.failures).toBe(0)
    expect(Object.keys(draft.programs)).toEqual(L01.steps.map((step) => step.id))
    // 错误实验关带着预置错误程序（事件在最下面）；引导关为空。
    expect(draft.programs[LAB]).toEqual({ fox: [WAKE, HELLO, START] })
    expect(draft.programs[GUIDED]).toEqual({ fox: [] })
    // 练习 B 的预置程序：小兔子名下多了一段“开始时”。
    expect(draft.programs[PRACTICE_B]).toEqual({ fox: [CLICKED, WAKE, HELLO], rabbit: [START, WAKE] })
    expect(Object.keys(draft.programs[CREATIVE])).toEqual(['fox', 'rabbit', 'bird'])
    expect(isValidEventDraft(L01, draft)).toBe(true)
    expect(isEmptyEventDraft(L01, draft)).toBe(true)
    expect(isEmptyEventDraft(L01, draftAt(1, { fox: [START] }))).toBe(false)
  })

  it('the starter program is a clone: editing the draft never mutates lesson data', () => {
    const starter = eventStarterBlocks(L01.steps[0], 'fox')
    starter.push({ type: 'say_hello' })
    expect(L01.steps[0].starter?.fox).toEqual([WAKE, HELLO, START])
    const draft = emptyEventDraft(L01)
    draft.programs[LAB].fox!.length = 0
    expect(emptyEventDraft(L01).programs[LAB].fox).toEqual([WAKE, HELLO, START])
  })

  it('current step / actor program are clamped to this lesson; starter detection is per step', () => {
    expect(eventCurrentStep(L01, { stepIndex: -3 }).id).toBe(LAB)
    expect(eventCurrentStep(L01, { stepIndex: 99 }).id).toBe(CREATIVE)
    expect(eventActorProgram(L01.steps[0], { programs: {} }, 'fox')).toEqual([WAKE, HELLO, START])
    expect(isStarterProgram(L01.steps[0], emptyEventDraft(L01))).toBe(true)
    expect(isStarterProgram(L01.steps[0], draftAt(0, { fox: [START, WAKE, HELLO] }))).toBe(false)
  })
})

describe('isValidEventDraft (strict, fail closed)', () => {
  it('accepts a real running record', () => {
    const draft = draftAt(1, { fox: [START, WAKE, HELLO] })
    draft.passed = [GUIDED]
    draft.failures = 2
    draft.mistakes = ['wrong_order']
    draft.reflection = 0
    expect(isValidEventDraft(L01, draft)).toBe(true)
  })

  it('rejects foreign lessons, bad versions and out-of-range steps', () => {
    expect(isValidEventDraft(L01, emptyEventDraft(L02))).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), version: 2 })).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), stepIndex: 99 })).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), stepIndex: 1.5 })).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), failures: -1 })).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), finished: 'yes' })).toBe(false)
    expect(isValidEventDraft(L01, null)).toBe(false)
    expect(isValidEventDraft(L01, [])).toBe(false)
  })

  it('rejects characters that are not editable here, blocks outside the step whitelist and extra keys', () => {
    // 第 1 关只有小狐狸可编辑。
    expect(isValidEventDraft(L01, draftAt(0, { rabbit: [START, WAKE] }))).toBe(false)
    expect(isValidEventDraft(L01, draftAt(1, { fox: [START, { type: 'raise_flag' }] }))).toBe(false)
    expect(isValidEventDraft(L01, draftAt(1, { fox: [START, { type: 'wake_up', extra: true } as never] }))).toBe(false)
    const unknownStep = emptyEventDraft(L01)
    unknownStep.programs['not-a-step'] = { fox: [START] }
    expect(isValidEventDraft(L01, unknownStep)).toBe(false)
  })

  it('rejects untrusted passes: an error lab never observed, a creative pass without a valid pick', () => {
    const lab = { ...emptyEventDraft(L01), passed: [LAB] }
    expect(isValidEventDraft(L01, lab)).toBe(false)
    expect(isValidEventDraft(L01, { ...lab, observed: [LAB] })).toBe(true)
    // observed 只能是错误实验关。
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), observed: [GUIDED] })).toBe(false)

    const creative: EventSlotData = { ...emptyEventDraft(L01), passed: [CREATIVE] }
    expect(isValidEventDraft(L01, creative)).toBe(false)
    expect(isValidEventDraft(L01, { ...creative, creative: { [CREATIVE]: { target: 'squirrel' } } })).toBe(false)
    expect(isValidEventDraft(L01, { ...creative, creative: { [CREATIVE]: { target: 'bird', extra: 1 } as never } })).toBe(false)
    expect(isValidEventDraft(L01, { ...creative, creative: { [PRACTICE_A]: { target: 'bird' } } })).toBe(false)
    expect(isValidEventDraft(L01, { ...creative, creative: { [CREATIVE]: { target: 'bird' } } })).toBe(true)

    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), passed: ['not-a-step'] })).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), passed: [GUIDED, GUIDED] })).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), mistakes: ['not_a_failure'] as never })).toBe(false)
    expect(isValidEventDraft(L01, { ...emptyEventDraft(L01), reflection: 9 })).toBe(false)
  })
})

describe('coerceEventDraft (field-level repair)', () => {
  it('repairs a damaged draft instead of throwing it away wholesale', () => {
    const draft = coerceEventDraft(L01, {
      version: 1,
      lessonId: L01.id,
      stepIndex: 99,
      programs: {
        [GUIDED]: { fox: [START, { type: 'raise_flag' }, WAKE], bird: [START] },
        'not-a-step': { fox: [START] },
      },
      passed: [GUIDED, 'not-a-step', LAB, CREATIVE],
      failures: -2,
      reflection: 99,
      observed: [GUIDED, 'not-an-error-lab'],
      creative: { [CREATIVE]: { target: 'squirrel' } },
      mistakes: ['wrong_order', 'not_a_failure'],
      finished: 'yes',
    })
    expect(draft.stepIndex).toBe(L01.steps.length - 1)
    expect(draft.programs[GUIDED]).toEqual({ fox: [START, WAKE] })
    expect(draft.programs['not-a-step']).toBeUndefined()
    // 缺失关回填初始程序。
    expect(draft.programs[LAB]).toEqual({ fox: [WAKE, HELLO, START] })
    // 错误实验没亲眼看过、创意关没有合法选择：通过记录都不可信。
    expect(draft.passed).toEqual([GUIDED])
    expect(draft.failures).toBe(0)
    expect(draft.reflection).toBeUndefined()
    expect(draft.observed).toBeUndefined()
    expect(draft.creative).toBeUndefined()
    expect(draft.mistakes).toEqual(['wrong_order'])
    expect(draft.finished).toBeUndefined()
    expect(isValidEventDraft(L01, draft)).toBe(true)
  })

  it('foreign lesson payloads never leak into this lesson’s draft', () => {
    expect(coerceEventDraft(L01, emptyEventDraft(L02))).toEqual(emptyEventDraft(L01))
    expect(coerceEventDraft(L01, { hello: 'world' })).toEqual(emptyEventDraft(L01))
    expect(coerceEventDraft(L01, null)).toEqual(emptyEventDraft(L01))
  })
})

describe('legacy event classroom draft (owner-isolated read-only compatibility)', () => {
  const GUEST_A = 'guest:family-a'
  const GUEST_B = 'guest:family-b'
  const USER_A = 'user:a'
  const USER_B = 'user:b'
  const old = {
    stepIndex: 2,
    programs: {
      [GUIDED]: { fox: [START, WAKE, HELLO] },
      [PRACTICE_A]: { fox: [CLICKED, WAKE, HELLO] },
    },
    passed: [GUIDED, PRACTICE_A],
    observed: [LAB],
    mistakes: ['wrong_order', 'too_early'],
    reflection: 1,
    savedAt: '2026-10-01T00:00:00.000Z',
  }
  const finishedOld = {
    stepIndex: 4,
    programs: Object.fromEntries(L01.steps.map((step) => [step.id, { fox: [CLICKED, WAKE, HELLO] }])),
    passed: L01.steps.map((step) => step.id),
    observed: [LAB],
    // 创意关的通过记录必须带着孩子当时选的角色，旧解析器才认。
    creative: { [CREATIVE]: { target: 'bird' } },
    reflection: 0,
    savedAt: null,
  }
  const seedUnscoped = (value: unknown = old) => {
    window.localStorage.setItem(eventDraftKey(L01.id), JSON.stringify(value))
  }
  const seedClaim = (owner: string) => window.localStorage.setItem(LESSON_DRAFT_OWNER_STORAGE_KEY, owner)
  const stamp = () => window.localStorage.getItem(LESSON_DRAFT_OWNER_STORAGE_KEY)
  const scoped = (owner: string) => scopedLessonDraftKey(owner, eventDraftKey(L01.id))

  it('unknown identity reads no legacy key at all (fail-closed)', () => {
    seedUnscoped()
    for (const owner of [undefined, null, '', 'owner-a', 'someone-else']) {
      expect(legacyEventDraftKeys(L01.id, owner)).toEqual([])
      expect(hasLegacyEventDraft(L01, owner)).toBe(false)
      expect(importLegacyEventDraft(L01, owner).ok).toBe(false)
      expect(hasUnclaimableLegacyEventDraft(L01, owner)).toBe(true)
    }
    expect(stamp()).toBeNull()
    expect(window.localStorage.getItem(eventDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('offers the owner-scoped key first; the unscoped key only with an existing, exactly matching claim', () => {
    expect(legacyEventDraftKeys(L01.id, GUEST_A)).toEqual([scoped(GUEST_A)])
    expect(legacyEventDraftKeys(L01.id, USER_A)).toEqual([scoped(USER_A)])
    seedClaim(GUEST_A)
    expect(legacyEventDraftKeys(L01.id, GUEST_A)).toEqual([scoped(GUEST_A), eventDraftKey(L01.id)])
    expect(legacyEventDraftKeys(L01.id, GUEST_B)).toEqual([scoped(GUEST_B)])
    expect(legacyEventDraftKeys(L01.id, USER_A)).toEqual([scoped(USER_A)])
  })

  it('no claim evidence: whoever opens an unclaimed old draft first gets no content, and nothing is claimed', () => {
    seedUnscoped()
    for (const owner of [GUEST_B, GUEST_A, 'guest', USER_A]) {
      expect(hasLegacyEventDraft(L01, owner)).toBe(false)
      expect(importLegacyEventDraft(L01, owner)).toEqual({ ok: false, reason: '旧课堂没有找到可导入的草稿。' })
      // 只提示原键保留：不读内容、不解析、不认领。
      expect(hasUnclaimableLegacyEventDraft(L01, owner)).toBe(true)
    }
    expect(stamp()).toBeNull()
    expect(window.localStorage.getItem(eventDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('imports a real old draft for the guest whose claim already matches, never writing the claim or the old key', () => {
    seedUnscoped()
    seedClaim(GUEST_A)
    expect(hasLegacyEventDraft(L01, GUEST_A)).toBe(true)
    expect(hasUnclaimableLegacyEventDraft(L01, GUEST_A)).toBe(false)
    const imported = importLegacyEventDraft(L01, GUEST_A)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.fromStep).toBe(2)
    expect(imported.importedSteps).toBe(2)
    expect(imported.data.stepIndex).toBe(2)
    expect(imported.data.programs[GUIDED]).toEqual({ fox: [START, WAKE, HELLO] })
    // 缺失的角色 / 关按本关初始程序回填（错误实验带回预置错误程序）。
    expect(imported.data.programs[PRACTICE_A]).toEqual({ fox: [CLICKED, WAKE, HELLO], rabbit: [] })
    expect(imported.data.programs[LAB]).toEqual({ fox: [WAKE, HELLO, START] })
    expect(imported.data.passed).toEqual([GUIDED, PRACTICE_A])
    expect(imported.data.observed).toEqual([LAB])
    expect(imported.data.reflection).toBe(1)
    expect(imported.data.mistakes).toEqual(['wrong_order', 'too_early'])
    expect(imported.data.failures).toBe(0)
    expect(imported.data.finished).toBeUndefined()
    expect(isValidEventDraft(L01, imported.data)).toBe(true)
    expect(stamp()).toBe(GUEST_A)
    // 旧键原样保留：导入不写、不删、不复制旧草稿。
    expect(window.localStorage.getItem(eventDraftKey(L01.id))).toBe(JSON.stringify(old))
    expect(window.localStorage.getItem(scoped(GUEST_A))).toBeNull()
  })

  it('guest A then B then A: B never reads the old draft A claimed, A still can', () => {
    seedUnscoped()
    seedClaim(GUEST_A)
    expect(importLegacyEventDraft(L01, GUEST_A).ok).toBe(true)
    expect(hasLegacyEventDraft(L01, GUEST_B)).toBe(false)
    expect(importLegacyEventDraft(L01, GUEST_B)).toEqual({ ok: false, reason: '旧课堂没有找到可导入的草稿。' })
    expect(hasUnclaimableLegacyEventDraft(L01, GUEST_B)).toBe(true)
    expect(stamp()).toBe(GUEST_A)
    const again = importLegacyEventDraft(L01, GUEST_A)
    expect(again.ok).toBe(true)
    if (again.ok) expect(again.data.passed).toEqual(old.passed)
    expect(window.localStorage.getItem(eventDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('strict policy: a bare guest stamp is not trusted evidence for a concrete guest id, and is never rewritten', () => {
    seedUnscoped()
    seedClaim('guest')
    expect(hasLegacyEventDraft(L01, GUEST_A)).toBe(false)
    expect(importLegacyEventDraft(L01, GUEST_A).ok).toBe(false)
    expect(hasUnclaimableLegacyEventDraft(L01, GUEST_A)).toBe(true)
    expect(hasLegacyEventDraft(L01, GUEST_B)).toBe(false)
    // 戳与 owner 完全一致（裸 guest 本人）才可读。
    expect(importLegacyEventDraft(L01, 'guest').ok).toBe(true)
    expect(stamp()).toBe('guest')
    expect(window.localStorage.getItem(eventDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('user A then B then A: signed-in accounts never read the unscoped draft, only their own scoped one', () => {
    seedUnscoped()
    window.localStorage.setItem(
      scoped(USER_A),
      JSON.stringify({ stepIndex: 1, programs: { [GUIDED]: { fox: [START, WAKE] } }, passed: [], savedAt: null }),
    )
    const a = importLegacyEventDraft(L01, USER_A)
    expect(a.ok).toBe(true)
    if (a.ok) {
      expect(a.data.stepIndex).toBe(1)
      expect(a.data.programs[GUIDED]).toEqual({ fox: [START, WAKE] })
      expect(a.data.passed).toEqual([])
    }
    expect(hasLegacyEventDraft(L01, USER_B)).toBe(false)
    expect(importLegacyEventDraft(L01, USER_B).ok).toBe(false)
    expect(hasUnclaimableLegacyEventDraft(L01, USER_B)).toBe(true)
    expect(hasUnclaimableLegacyEventDraft(L01, USER_A)).toBe(false)
    expect(importLegacyEventDraft(L01, USER_A).ok).toBe(true)
    // 账号从不认领访客旧草稿：认领戳不变，旧键不变。
    expect(stamp()).toBeNull()
    expect(window.localStorage.getItem(eventDraftKey(L01.id))).toBe(JSON.stringify(old))
  })

  it('restores a fully-passed old draft as finished, keeping passes, reflection and the creative pick', () => {
    seedUnscoped(finishedOld)
    seedClaim(GUEST_A)
    const imported = importLegacyEventDraft(L01, GUEST_A)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.data.finished).toBe(true)
    expect(imported.data.passed).toEqual(L01.steps.map((step) => step.id))
    expect(imported.data.reflection).toBe(0)
    expect(imported.data.creative).toEqual({ [CREATIVE]: { target: 'bird' } })
    expect(isValidEventDraft(L01, imported.data)).toBe(true)
    // 恢复后的完成态经外壳信封往返（coerce）仍保持完成。
    expect(coerceEventDraft(L01, JSON.parse(JSON.stringify(imported.data))).finished).toBe(true)
  })

  it('drops forged passes from an old draft (error lab never observed, creative without a pick)', () => {
    seedUnscoped({ ...finishedOld, observed: [], creative: {} })
    seedClaim(GUEST_A)
    const imported = importLegacyEventDraft(L01, GUEST_A)
    expect(imported.ok).toBe(true)
    if (!imported.ok) return
    expect(imported.data.passed).toEqual([GUIDED, PRACTICE_A, PRACTICE_B])
    expect(imported.data.finished).toBeUndefined()
    expect(isValidEventDraft(L01, imported.data)).toBe(true)
  })

  it('reports malformed / missing old drafts honestly and never throws', () => {
    expect(importLegacyEventDraft(L01, GUEST_A)).toEqual({ ok: false, reason: '旧课堂没有找到可导入的草稿。' })
    expect(hasUnclaimableLegacyEventDraft(L01, GUEST_A)).toBe(false)
    window.localStorage.setItem(eventDraftKey(L01.id), '{not json')
    seedClaim(GUEST_A)
    expect(importLegacyEventDraft(L01, GUEST_A)).toEqual({ ok: false, reason: '旧课堂的草稿格式不对，无法导入。' })
    expect(window.localStorage.getItem(eventDraftKey(L01.id))).toBe('{not json')
  })

  it('another lesson’s old draft is never offered here', () => {
    window.localStorage.setItem(eventDraftKey(L02.id), JSON.stringify(old))
    seedClaim(GUEST_A)
    expect(hasLegacyEventDraft(L01, GUEST_A)).toBe(false)
    expect(hasUnclaimableLegacyEventDraft(L01, GUEST_A)).toBe(false)
  })
})
