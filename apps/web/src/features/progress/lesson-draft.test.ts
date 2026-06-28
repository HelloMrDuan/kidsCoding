import { beforeEach, describe, expect, it } from 'vitest'

import {
  buildLessonDraftKey,
  clearLessonDraft,
  clearLessonDraftsForLesson,
  loadLessonDraft,
  saveLessonDraft,
} from './lesson-draft'

beforeEach(() => {
  window.sessionStorage.clear()
})

describe('lessonDraft', () => {
  it('saves and loads a draft for the same lesson and step', () => {
    saveLessonDraft('lesson-01', 0, [{ type: 'when_start' }])

    const draft = loadLessonDraft('lesson-01', 0)
    expect(draft).not.toBeNull()
    expect(draft?.lessonId).toBe('lesson-01')
    expect(draft?.stepIndex).toBe(0)
    expect(draft?.blocks).toEqual([{ type: 'when_start' }])
    expect(draft?.schemaVersion).toBe(1)
    expect(draft?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('isolates drafts by lesson id', () => {
    saveLessonDraft('lesson-01', 0, [{ type: 'when_start' }])
    saveLessonDraft('lesson-02', 0, [{ type: 'move_right' }])

    expect(loadLessonDraft('lesson-01', 0)?.blocks).toEqual([
      { type: 'when_start' },
    ])
    expect(loadLessonDraft('lesson-02', 0)?.blocks).toEqual([
      { type: 'move_right' },
    ])
  })

  it('isolates drafts by step index', () => {
    saveLessonDraft('lesson-01', 0, [{ type: 'when_start' }])
    saveLessonDraft('lesson-01', 1, [{ type: 'move_right' }])

    expect(loadLessonDraft('lesson-01', 0)?.blocks).toEqual([
      { type: 'when_start' },
    ])
    expect(loadLessonDraft('lesson-01', 1)?.blocks).toEqual([
      { type: 'move_right' },
    ])
  })

  it('returns null when no draft exists', () => {
    expect(loadLessonDraft('lesson-01', 0)).toBeNull()
  })

  it('returns null when the stored payload is not valid JSON', () => {
    window.sessionStorage.setItem(
      buildLessonDraftKey('lesson-01', 0),
      'not-json',
    )

    expect(loadLessonDraft('lesson-01', 0)).toBeNull()
  })

  it('returns null when the schema version does not match', () => {
    window.sessionStorage.setItem(
      buildLessonDraftKey('lesson-01', 0),
      JSON.stringify({
        schemaVersion: 999,
        lessonId: 'lesson-01',
        stepIndex: 0,
        blocks: [{ type: 'when_start' }],
        updatedAt: '2026-03-31T10:00:00.000Z',
      }),
    )

    expect(loadLessonDraft('lesson-01', 0)).toBeNull()
  })

  it('returns null when the stored payload is missing required fields', () => {
    window.sessionStorage.setItem(
      buildLessonDraftKey('lesson-01', 0),
      JSON.stringify({ foo: 'bar' }),
    )

    expect(loadLessonDraft('lesson-01', 0)).toBeNull()
  })

  it('returns null when the stored lessonId or stepIndex does not match the key', () => {
    window.sessionStorage.setItem(
      buildLessonDraftKey('lesson-01', 0),
      JSON.stringify({
        schemaVersion: 1,
        lessonId: 'lesson-02',
        stepIndex: 0,
        blocks: [],
        updatedAt: '2026-03-31T10:00:00.000Z',
      }),
    )

    expect(loadLessonDraft('lesson-01', 0)).toBeNull()
  })

  it('clears a single step draft without touching other steps', () => {
    saveLessonDraft('lesson-01', 0, [{ type: 'when_start' }])
    saveLessonDraft('lesson-01', 1, [{ type: 'move_right' }])

    clearLessonDraft('lesson-01', 0)

    expect(loadLessonDraft('lesson-01', 0)).toBeNull()
    expect(loadLessonDraft('lesson-01', 1)?.blocks).toEqual([
      { type: 'move_right' },
    ])
  })

  it('clears every step draft for a lesson without touching other lessons', () => {
    saveLessonDraft('lesson-01', 0, [{ type: 'when_start' }])
    saveLessonDraft('lesson-01', 1, [{ type: 'move_right' }])
    saveLessonDraft('lesson-02', 0, [{ type: 'say_line' }])

    clearLessonDraftsForLesson('lesson-01')

    expect(loadLessonDraft('lesson-01', 0)).toBeNull()
    expect(loadLessonDraft('lesson-01', 1)).toBeNull()
    expect(loadLessonDraft('lesson-02', 0)?.blocks).toEqual([
      { type: 'say_line' },
    ])
  })

  it('does not throw when clearing a lesson with no drafts', () => {
    expect(() => clearLessonDraftsForLesson('lesson-empty')).not.toThrow()
  })
})
