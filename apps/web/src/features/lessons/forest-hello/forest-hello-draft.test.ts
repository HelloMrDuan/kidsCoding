import { describe, expect, it, beforeEach } from 'vitest'

import {
  coerceForestDraft,
  emptyForestDraft,
  forestStarterProgram,
  hasLegacyForestDraft,
  importLegacyForestDraft,
  isEmptyForestDraft,
  isValidForestDraft,
  type ForestSlotData,
} from './forest-hello-draft'

const LEGACY_KEY = (step: number) => `kc-lesson-draft:lesson-01-forest-hello:${step}`

function seedLegacy(step: number, blocks: Array<{ type: string }>) {
  window.sessionStorage.setItem(
    LEGACY_KEY(step),
    JSON.stringify({
      schemaVersion: 1,
      lessonId: 'lesson-01-forest-hello',
      stepIndex: step,
      blocks,
      updatedAt: new Date().toISOString(),
    }),
  )
}

describe('forest-hello draft', () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  it('empty draft: step-4 starts on the designed wrong program, others empty', () => {
    const draft = emptyForestDraft()
    expect(draft.version).toBe(1)
    expect(draft.lessonId).toBe('lesson-01-forest-hello')
    expect(draft.stepIndex).toBe(0)
    expect(draft.programs['step-1']).toEqual([])
    expect(draft.programs['step-2']).toEqual([])
    expect(draft.programs['step-3']).toEqual([])
    expect(draft.programs['step-4']).toEqual([{ type: 'move_right' }])
    expect(draft.passed).toEqual([])
    expect(draft.failures).toBe(0)
    expect(forestStarterProgram('step-4')).toEqual([{ type: 'move_right' }])
    expect(forestStarterProgram('step-2')).toEqual([])
  })

  it('isEmptyForestDraft is true only for the untouched initial draft', () => {
    expect(isEmptyForestDraft(emptyForestDraft())).toBe(true)
    const edited: ForestSlotData = {
      ...emptyForestDraft(),
      programs: { ...emptyForestDraft().programs, 'step-1': [{ type: 'when_start' }] },
    }
    expect(isEmptyForestDraft(edited)).toBe(false)
    expect(isEmptyForestDraft({ ...emptyForestDraft(), stepIndex: 1 })).toBe(false)
  })

  it('isValidForestDraft accepts a well-formed draft and rejects bad shapes', () => {
    expect(isValidForestDraft(emptyForestDraft())).toBe(true)
    expect(isValidForestDraft({ ...emptyForestDraft(), version: 2 })).toBe(false)
    expect(isValidForestDraft({ ...emptyForestDraft(), lessonId: 'G1-U1-L01' })).toBe(false)
    expect(isValidForestDraft({ ...emptyForestDraft(), stepIndex: 4 })).toBe(false)
    expect(isValidForestDraft({ ...emptyForestDraft(), stepIndex: -1 })).toBe(false)
    expect(
      isValidForestDraft({
        ...emptyForestDraft(),
        programs: { ...emptyForestDraft().programs, 'step-9': [] },
      }),
    ).toBe(false)
    expect(
      isValidForestDraft({
        ...emptyForestDraft(),
        programs: { ...emptyForestDraft().programs, 'step-2': [{ type: 'say_line' }] },
      }),
    ).toBe(false)
    expect(isValidForestDraft({ ...emptyForestDraft(), passed: ['step-9'] })).toBe(false)
    expect(isValidForestDraft({ ...emptyForestDraft(), failures: -1 })).toBe(false)
    expect(isValidForestDraft({ ...emptyForestDraft(), failures: 1.5 })).toBe(false)
    expect(isValidForestDraft(null)).toBe(false)
    expect(isValidForestDraft('nope')).toBe(false)
  })

  it('coerceForestDraft repairs field by field and never throws', () => {
    expect(coerceForestDraft(null)).toEqual(emptyForestDraft())
    expect(coerceForestDraft({ version: 2 })).toEqual(emptyForestDraft())
    const clamped = coerceForestDraft({ ...emptyForestDraft(), stepIndex: 99 })
    expect(clamped.stepIndex).toBe(3)
    const repaired = coerceForestDraft({
      ...emptyForestDraft(),
      programs: { 'step-2': [{ type: 'move_right' }, { type: 'say_line' }] },
      passed: ['step-2', 'step-9'],
      failures: -3,
    })
    expect(repaired.programs['step-2']).toEqual([{ type: 'move_right' }])
    expect(repaired.programs['step-1']).toEqual([])
    expect(repaired.programs['step-4']).toEqual([{ type: 'move_right' }])
    expect(repaired.passed).toEqual(['step-2'])
    expect(repaired.failures).toBe(0)
  })

  it('legacy import: no old draft means no import', () => {
    expect(hasLegacyForestDraft()).toBe(false)
    expect(importLegacyForestDraft()).toEqual({
      ok: false,
      reason: '旧课堂没有找到可导入的草稿。',
    })
  })

  it('legacy import: programs and furthest step carry over, passed stays empty', () => {
    seedLegacy(0, [{ type: 'when_start' }])
    seedLegacy(1, [{ type: 'when_start' }, { type: 'move_right' }])
    expect(hasLegacyForestDraft()).toBe(true)
    const result = importLegacyForestDraft()
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.fromStep).toBe(1)
    expect(result.importedSteps).toBe(2)
    expect(result.data.stepIndex).toBe(1)
    expect(result.data.programs['step-1']).toEqual([{ type: 'when_start' }])
    expect(result.data.programs['step-2']).toEqual([{ type: 'when_start' }, { type: 'move_right' }])
    expect(result.data.programs['step-3']).toEqual([])
    expect(result.data.programs['step-4']).toEqual([{ type: 'move_right' }])
    // 通过记录无法从旧草稿推断：导入后须重新运行才能通过。
    expect(result.data.passed).toEqual([])
    expect(result.data.failures).toBe(0)
    // 导入只读旧键：原草稿原样保留。
    expect(window.sessionStorage.getItem(LEGACY_KEY(0))).toContain('when_start')
    expect(window.sessionStorage.getItem(LEGACY_KEY(1))).toContain('move_right')
  })

  it('legacy import: unknown block fails the whole import, honestly', () => {
    seedLegacy(0, [{ type: 'when_start' }])
    seedLegacy(1, [{ type: 'when_start' }, { type: 'say_line' }])
    const result = importLegacyForestDraft()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toContain('say_line')
    expect(result.reason).toContain('无法导入')
  })

  it('legacy import: corrupt JSON in an old key is ignored, not imported', () => {
    window.sessionStorage.setItem(LEGACY_KEY(0), '{not json')
    expect(hasLegacyForestDraft()).toBe(false)
    expect(importLegacyForestDraft().ok).toBe(false)
  })
})
