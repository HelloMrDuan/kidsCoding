import {describe, expect, it} from 'vitest'
import {
  A0_U1_L01_COUNTER_EXAMPLE,
  A0_U1_L01_PASS_THRESHOLD,
  a0u1L01,
  evaluateA0CounterExample,
  evaluateA0Creative,
  evaluateA0U1L01,
  getA0Lesson,
  type A0Answer,
} from './a0-u1-ai-lessons'

const allCorrect: A0Answer[] = a0u1L01.tools.map((tool) => ({ toolId: tool.id, category: tool.category, reason: tool.reason }))

describe('A0-U1-L01 AI在哪里出现: classification data and judge', () => {
  it('registers the lesson with 6 tools in three balanced categories', () => {
    expect(getA0Lesson('A0-U1-L01')).toBe(a0u1L01)
    expect(a0u1L01.tools).toHaveLength(6)
    expect(a0u1L01.tools.filter((t) => t.category === 'ai')).toHaveLength(2)
    expect(a0u1L01.tools.filter((t) => t.category === 'traditional')).toHaveLength(2)
    expect(a0u1L01.tools.filter((t) => t.category === 'non_digital')).toHaveLength(2)
    expect(a0u1L01.rule).toContain('是否从数据中识别模式')
  })

  it('keeps the three detailed-lesson tools with their setting categories', () => {
    const byId = new Map(a0u1L01.tools.map((t) => [t.id, t]))
    expect(byId.get('nav-software')?.category).toBe('ai')
    expect(byId.get('calculator')?.category).toBe('traditional')
    expect(byId.get('paper-ruler')?.category).toBe('non_digital')
    expect(a0u1L01.tools.filter((t) => t.source === 'detailed_lesson')).toHaveLength(3)
    expect(a0u1L01.tools.filter((t) => t.source === 'implementer_example')).toHaveLength(3)
  })

  it('scores the detailed lesson criteria to exactly 100', () => {
    expect(a0u1L01.criteria.map((c) => c.name)).toEqual(['作品与任务', '概念理解', '风险与核验', '自主创作与反思'])
    expect(a0u1L01.criteria.reduce((sum, c) => sum + c.points, 0)).toBe(100)
    expect(a0u1L01.diagnostics).toHaveLength(3)
    expect(a0u1L01.diagnostics[0].mistake).toContain('会发声')
  })

  it('passes 6 correct with reasons and 5 correct with reasons', () => {
    expect(evaluateA0U1L01(allCorrect)).toMatchObject({ total: 6, correctWithReason: 6, passed: true })
    const five = allCorrect.slice(0, 5).concat([{ toolId: 'notebook', category: 'ai', reason: '电子的所以是 AI' }])
    expect(evaluateA0U1L01(five)).toMatchObject({ correctWithReason: 5, passed: true })
    expect(A0_U1_L01_PASS_THRESHOLD).toBe(5)
  })

  it('fails below 5 and never counts a right category without a reason', () => {
    const four = allCorrect.slice(0, 4).concat([
      { toolId: 'alarm-clock', category: 'ai', reason: '电子的' },
      { toolId: 'notebook', category: 'ai', reason: '电子的' },
    ])
    expect(evaluateA0U1L01(four).passed).toBe(false)
    const noReasons = allCorrect.map((a) => ({ ...a, reason: '   ' }))
    expect(evaluateA0U1L01(noReasons)).toMatchObject({ correctWithReason: 0, passed: false })
    expect(evaluateA0U1L01([]).passed).toBe(false)
  })

  it('flags the sounding-device counter-example and accepts the corrected answer', () => {
    expect(evaluateA0CounterExample('ai', '它会说话')).toMatchObject({ correct: false })
    expect(evaluateA0CounterExample('traditional', '')).toMatchObject({ correct: false })
    expect(evaluateA0CounterExample(A0_U1_L01_COUNTER_EXAMPLE.category, A0_U1_L01_COUNTER_EXAMPLE.reason).correct).toBe(true)
    expect(A0_U1_L01_COUNTER_EXAMPLE.name).toContain('收音机')
  })

  it('accepts a creative example only with a category and a reason', () => {
    expect(evaluateA0Creative('ai', '它从照片数据里认东西')).toBe(true)
    expect(evaluateA0Creative('ai', '  ')).toBe(false)
    expect(evaluateA0Creative(null, '有理由')).toBe(false)
    expect(a0u1L01.nextLesson).toBe('A0-U1-L02 人和机器的判断')
    expect(a0u1L01.materialsReady).toBe(false)
    expect(a0u1L01.doesNotCollectPersonalData).toBe(true)
  })
})
