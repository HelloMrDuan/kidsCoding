import { describe, expect, it } from 'vitest'

import { DEMO_A, DEMO_SLOT } from '../workspace/demo-contracts'
import { toLessonContract, validateStudioLesson, type StudioLesson } from './studio-lesson'

function validLesson(overrides: Partial<StudioLesson> = {}): StudioLesson {
  return {
    ...DEMO_A.contract,
    backHref: '/learn/map',
    ...overrides,
  }
}

describe('validateStudioLesson', () => {
  it('accepts a valid blockly StudioLesson', () => {
    expect(validateStudioLesson(validLesson())).toEqual([])
  })

  it('accepts a python engine (contract-level compatibility only)', () => {
    const lesson: StudioLesson = { ...DEMO_SLOT.contract, engine: 'python', backHref: '/learn/map' }
    expect(validateStudioLesson(lesson)).toEqual([])
  })

  it('rejects json as an engine value', () => {
    const errors = validateStudioLesson(validLesson({ engine: 'json' as never }))
    expect(errors.some((e) => e.includes('engine'))).toBe(true)
  })

  it('rejects a missing backHref', () => {
    const lesson = validLesson()
    delete (lesson as Partial<StudioLesson>).backHref
    expect(validateStudioLesson(lesson).some((e) => e.includes('backHref'))).toBe(true)
  })

  it('rejects malformed help', () => {
    expect(
      validateStudioLesson(validLesson({ help: { title: '', body: ['x'] } })).some((e) =>
        e.includes('help'),
      ),
    ).toBe(true)
    expect(
      validateStudioLesson(validLesson({ help: { title: '帮助', body: 'not-an-array' as never } })).some(
        (e) => e.includes('help'),
      ),
    ).toBe(true)
  })

  it('accepts well-formed help', () => {
    expect(
      validateStudioLesson(validLesson({ help: { title: '帮助', body: ['第一步', '第二步'] } })),
    ).toEqual([])
  })

  it('rejects a non-object contract', () => {
    expect(validateStudioLesson(null)).toEqual(['课程契约不是对象'])
    expect(validateStudioLesson('demo-a')).toEqual(['课程契约不是对象'])
  })

  it('still checks shared fields (goal5 / draftKey) for a studio lesson', () => {
    const errors = validateStudioLesson(validLesson({ goal5: ['只有一项'] as never }))
    expect(errors.some((e) => e.includes('goal5'))).toBe(true)
  })
})

describe('toLessonContract', () => {
  it('converts a blockly StudioLesson and drops studio-only fields', () => {
    const contract = toLessonContract(validLesson({ help: { title: '帮助', body: ['x'] } }))
    expect(contract.lessonId).toBe('demo-a')
    expect(contract.engine).toBe('blockly')
    expect(contract.title).toBe(DEMO_A.contract.title)
    expect('backHref' in contract).toBe(false)
    expect('help' in contract).toBe(false)
  })

  it('throws for python instead of silently degrading to slot', () => {
    const lesson: StudioLesson = { ...DEMO_SLOT.contract, engine: 'python', backHref: '/learn/map' }
    expect(() => toLessonContract(lesson)).toThrow(/python/)
  })
})
