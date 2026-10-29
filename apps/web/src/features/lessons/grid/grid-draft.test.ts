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
    expect(parseGridDraft(lesson, raw)).toEqual({ stepIndex: 4, programs: { 'leave-treehouse': [{ type: 'move_right_cell', disconnected: true }] }, passed: ['leave-treehouse'], savedAt: null })
    expect(parseGridDraft(lesson, '{oops')).toBeNull()
    expect(parseGridDraft(lesson, null)).toBeNull()
  })
  it('SYS-107: restores a program with a repeat body and clamps a forged count', () => {
    const raw = JSON.stringify({ stepIndex: 0, programs: { 'leave-treehouse': [{ type: 'when_start' }, { type: 'repeat_times', times: 3, body: [{ type: 'move_forward' }, { type: 'rm_rf' }] }, { type: 'repeat_times', times: 999, body: [{ type: 'turn_right' }] }] } })
    expect(parseGridDraft(lesson, raw)?.programs['leave-treehouse']).toEqual([
      { type: 'when_start' },
      { type: 'repeat_times', times: 3, body: [{ type: 'move_forward' }] },
      { type: 'repeat_times', times: 2, body: [{ type: 'turn_right' }] },
    ])
  })
  it('keeps a valid reflection choice and drops an out-of-range one', () => {
    expect(parseGridDraft(lesson, JSON.stringify({ stepIndex: 0, reflection: 1 }))?.reflection).toBe(1)
    expect(parseGridDraft(lesson, JSON.stringify({ stepIndex: 0, reflection: 9 }))?.reflection).toBeUndefined()
  })
  it('G0-U1-L01: keeps the error-lab observation, the chosen goal and real mistakes; drops forged ones', () => {
    const raw = JSON.stringify({
      stepIndex: 4,
      observed: ['leave-treehouse', 'mushroom-house', 'nope'],
      creative: { 'my-start-card': { goal: { x: 4, y: 0 } }, 'mushroom-house': { goal: { x: 1, y: 0 } } },
      mistakes: ['no_start', 'fell_in_water', 'rm_rf', 'no_start'],
      passed: ['my-start-card'],
    })
    expect(parseGridDraft(lesson, raw)).toMatchObject({
      observed: ['leave-treehouse'],
      creative: { 'my-start-card': { goal: { x: 4, y: 0 } } },
      mistakes: ['no_start', 'fell_in_water'],
      passed: ['my-start-card'],
    })
  })
  it('G0-U1-L01: a goal off the offered cells is dropped, and so is the creative pass that depended on it', () => {
    const raw = JSON.stringify({ stepIndex: 4, creative: { 'my-start-card': { goal: { x: 9, y: 0 } } }, passed: ['my-start-card', 'leave-treehouse'] })
    const draft = parseGridDraft(lesson, raw)!
    expect(draft.creative).toBeUndefined()
    expect(draft.passed).toEqual(['leave-treehouse'])
  })
})
