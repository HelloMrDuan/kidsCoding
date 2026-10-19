import { describe, expect, it } from 'vitest'
import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import { parseGridDraft } from './grid-draft'

const lesson = g0u1GridLessons['G0-U1-L01']

describe('EDU-104 grid lesson local draft', () => {
  it('restores step, per-step programs and real passes', () => {
    const raw = JSON.stringify({ stepIndex: 2, programs: { 'mushroom-house': [{ type: 'when_start' }, { type: 'move_forward' }] }, passed: ['leave-treehouse'], savedAt: '2026-10-19T00:00:00Z' })
    expect(parseGridDraft(lesson, raw)).toEqual({ stepIndex: 2, programs: { 'mushroom-house': [{ type: 'when_start' }, { type: 'move_forward' }] }, passed: ['leave-treehouse'], savedAt: '2026-10-19T00:00:00Z' })
  })
  it('drops unknown steps, unknown blocks, bad indexes and garbage', () => {
    const raw = JSON.stringify({ stepIndex: 99, programs: { nope: [{ type: 'when_start' }], 'leave-treehouse': [{ type: 'rm_rf' }, { type: 'move_right_cell', disconnected: true }] }, passed: ['nope', 'leave-treehouse'] })
    expect(parseGridDraft(lesson, raw)).toEqual({ stepIndex: 3, programs: { 'leave-treehouse': [{ type: 'move_right_cell', disconnected: true }] }, passed: ['leave-treehouse'], savedAt: null })
    expect(parseGridDraft(lesson, '{oops')).toBeNull()
    expect(parseGridDraft(lesson, null)).toBeNull()
  })
  it('keeps a valid reflection choice and drops an out-of-range one', () => {
    expect(parseGridDraft(lesson, JSON.stringify({ stepIndex: 0, reflection: 1 }))?.reflection).toBe(1)
    expect(parseGridDraft(lesson, JSON.stringify({ stepIndex: 0, reflection: 9 }))?.reflection).toBeUndefined()
  })
})
