import { describe, expect, it, beforeEach } from 'vitest'

import {
  coerceGreetingDraft,
  emptyGreetingDraft,
  greetingStarterProgram,
  hasLegacyGreetingDraft,
  importLegacyGreetingDraft,
  isEmptyGreetingDraft,
  isValidGreetingDraft,
  type GreetingSlotData,
} from './forest-greeting-draft'

const LEGACY_KEY = (step: number) => `kc-lesson-draft:lesson-02-forest-greeting:${step}`

function seedLegacy(step: number, blocks: Array<{ type: string; line?: string }>) {
  window.sessionStorage.setItem(
    LEGACY_KEY(step),
    JSON.stringify({
      schemaVersion: 1,
      lessonId: 'lesson-02-forest-greeting',
      stepIndex: step,
      blocks,
      updatedAt: new Date().toISOString(),
    }),
  )
}

/** 第 4 关设计错误程序（mistake-steps.ts 原文：先说话再出场）。 */
const WRONG_PROGRAM = [{ type: 'when_start' }, { type: 'say_line' }, { type: 'move_right' }]

describe('forest-greeting draft', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('empty draft: step-4 starts on the designed wrong program, others empty', () => {
    const draft = emptyGreetingDraft()
    expect(draft.version).toBe(1)
    expect(draft.lessonId).toBe('lesson-02-forest-greeting')
    expect(draft.stepIndex).toBe(0)
    expect(draft.programs['step-1']).toEqual([])
    expect(draft.programs['step-2']).toEqual([])
    expect(draft.programs['step-3']).toEqual([])
    expect(draft.programs['step-4']).toEqual(WRONG_PROGRAM)
    expect(draft.passed).toEqual([])
    expect(draft.failures).toBe(0)
    expect(greetingStarterProgram('step-4')).toEqual(WRONG_PROGRAM)
    expect(greetingStarterProgram('step-2')).toEqual([])
  })

  it('isEmptyGreetingDraft is true only for the untouched initial draft', () => {
    expect(isEmptyGreetingDraft(emptyGreetingDraft())).toBe(true)
    const edited: GreetingSlotData = {
      ...emptyGreetingDraft(),
      programs: { ...emptyGreetingDraft().programs, 'step-1': [{ type: 'when_start' }] },
    }
    expect(isEmptyGreetingDraft(edited)).toBe(false)
    expect(isEmptyGreetingDraft({ ...emptyGreetingDraft(), stepIndex: 1 })).toBe(false)
  })

  it('isValidGreetingDraft accepts a well-formed draft and rejects bad shapes', () => {
    expect(isValidGreetingDraft(emptyGreetingDraft())).toBe(true)
    expect(isValidGreetingDraft({ ...emptyGreetingDraft(), version: 2 })).toBe(false)
    expect(isValidGreetingDraft({ ...emptyGreetingDraft(), lessonId: 'G1-U1-L01' })).toBe(false)
    expect(isValidGreetingDraft({ ...emptyGreetingDraft(), stepIndex: 4 })).toBe(false)
    expect(isValidGreetingDraft({ ...emptyGreetingDraft(), stepIndex: -1 })).toBe(false)
    expect(
      isValidGreetingDraft({
        ...emptyGreetingDraft(),
        programs: { ...emptyGreetingDraft().programs, 'step-9': [] },
      }),
    ).toBe(false)
    // say_line 是本课的合法积木，带预设对白 id 也合法。
    expect(
      isValidGreetingDraft({
        ...emptyGreetingDraft(),
        programs: {
          ...emptyGreetingDraft().programs,
          'step-2': [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'hi-all' }],
        },
      }),
    ).toBe(true)
    // 未知对白 id 严格不通过（防篡改/过期快照冒充孩子的选择）。
    expect(
      isValidGreetingDraft({
        ...emptyGreetingDraft(),
        programs: {
          ...emptyGreetingDraft().programs,
          'step-2': [{ type: 'say_line', line: 'not-a-preset' }],
        },
      }),
    ).toBe(false)
    // 对白只能挂在 say_line 上。
    expect(
      isValidGreetingDraft({
        ...emptyGreetingDraft(),
        programs: {
          ...emptyGreetingDraft().programs,
          'step-1': [{ type: 'move_right', line: 'hello' }],
        },
      }),
    ).toBe(false)
    // 本课没有的积木不通过。
    expect(
      isValidGreetingDraft({
        ...emptyGreetingDraft(),
        programs: { ...emptyGreetingDraft().programs, 'step-2': [{ type: 'jump' }] },
      }),
    ).toBe(false)
    expect(isValidGreetingDraft({ ...emptyGreetingDraft(), passed: ['step-9'] })).toBe(false)
    expect(isValidGreetingDraft({ ...emptyGreetingDraft(), failures: -1 })).toBe(false)
    expect(isValidGreetingDraft({ ...emptyGreetingDraft(), failures: 1.5 })).toBe(false)
    expect(isValidGreetingDraft(null)).toBe(false)
    expect(isValidGreetingDraft('nope')).toBe(false)
  })

  it('coerceGreetingDraft repairs field by field and never throws', () => {
    expect(coerceGreetingDraft(null)).toEqual(emptyGreetingDraft())
    expect(coerceGreetingDraft({ version: 2 })).toEqual(emptyGreetingDraft())
    const clamped = coerceGreetingDraft({ ...emptyGreetingDraft(), stepIndex: 99 })
    expect(clamped.stepIndex).toBe(3)
    const repaired = coerceGreetingDraft({
      ...emptyGreetingDraft(),
      programs: {
        'step-2': [
          { type: 'move_right' },
          { type: 'say_line', line: 'not-a-preset' },
          { type: 'jump' },
        ],
      },
      passed: ['step-2', 'step-9'],
      failures: -3,
    })
    // 未知积木丢弃；未知对白只剥掉 line 本身（整形不丢整块，回落默认对白）。
    expect(repaired.programs['step-2']).toEqual([{ type: 'move_right' }, { type: 'say_line' }])
    expect(repaired.programs['step-1']).toEqual([])
    expect(repaired.programs['step-4']).toEqual(WRONG_PROGRAM)
    expect(repaired.passed).toEqual(['step-2'])
    expect(repaired.failures).toBe(0)
    // 已知对白 id 原样保留。
    const kept = coerceGreetingDraft({
      ...emptyGreetingDraft(),
      programs: { 'step-2': [{ type: 'say_line', line: 'lets-play' }] },
    })
    expect(kept.programs['step-2']).toEqual([{ type: 'say_line', line: 'lets-play' }])
  })

  it('legacy import: no old draft means no import', () => {
    expect(hasLegacyGreetingDraft()).toBe(false)
    expect(importLegacyGreetingDraft()).toEqual({
      ok: false,
      reason: '旧课堂没有找到可导入的草稿。',
    })
  })

  it('legacy import: programs (with chosen lines) and furthest step carry over, passed stays empty', () => {
    seedLegacy(0, [{ type: 'when_start' }])
    seedLegacy(1, [
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'say_line', line: 'nice-to-meet' },
    ])
    expect(hasLegacyGreetingDraft()).toBe(true)
    const result = importLegacyGreetingDraft()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fromStep).toBe(1)
    expect(result.importedSteps).toBe(2)
    expect(result.data.stepIndex).toBe(1)
    expect(result.data.programs['step-1']).toEqual([{ type: 'when_start' }])
    expect(result.data.programs['step-2']).toEqual([
      { type: 'when_start' },
      { type: 'move_right' },
      { type: 'say_line', line: 'nice-to-meet' },
    ])
    expect(result.data.programs['step-3']).toEqual([])
    expect(result.data.programs['step-4']).toEqual(WRONG_PROGRAM)
    // 通过记录无法从旧草稿推断：导入后须重新运行才能通过。
    expect(result.data.passed).toEqual([])
    expect(result.data.failures).toBe(0)
    // 导入只读旧键：原草稿原样保留。
    expect(window.sessionStorage.getItem(LEGACY_KEY(0))).toContain('when_start')
    expect(window.sessionStorage.getItem(LEGACY_KEY(1))).toContain('nice-to-meet')
  })

  it('legacy import: unknown block fails the whole import, honestly', () => {
    seedLegacy(0, [{ type: 'when_start' }])
    seedLegacy(1, [{ type: 'when_start' }, { type: 'jump' }])
    const result = importLegacyGreetingDraft()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('jump')
    expect(result.reason).toContain('无法导入')
  })

  it('legacy import: unknown line id fails the whole import, honestly', () => {
    seedLegacy(1, [{ type: 'when_start' }, { type: 'say_line', line: 'not-a-preset' }])
    const result = importLegacyGreetingDraft()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('无法导入')
  })

  it('legacy import: corrupt JSON in an old key is ignored, not imported', () => {
    window.sessionStorage.setItem(LEGACY_KEY(0), '{not json')
    expect(hasLegacyGreetingDraft()).toBe(false)
    expect(importLegacyGreetingDraft().ok).toBe(false)
  })
})
