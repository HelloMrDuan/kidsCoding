import { describe, expect, it } from 'vitest'

import p0 from './track-p0-detailed-lessons-v1.json'
import p2 from './track-p2-detailed-lessons-v2.json'

// 第一批审定整改回归测试（AUD-102/103/104，2026-10-30 主 Muse 纠偏批处理）。
// 只断言本批改动的字段，不碰其他课节；算法部分是真实可执行计数，不是字符串断言。
// 本文件不使用 any（仓库 ESLint 禁止 no-explicit-any，测试亦无例外）。
type LessonRecord = {
  id: string
  learningSteps?: Array<{ order: number; teacherPrompt: string }>
  feedback?: { commonMistakes: Array<{ symptom: string }> }
  assessment?: {
    failCases?: Array<{ kind: string; when: string }>
    scoring?: Array<{ criterion: string; evidence: string }>
    mustPass?: string[]
    positive?: { expected: string }
    rubric?: Array<{ description: string }>
  }
  learningOutcome?: string
  project?: { successCriteria: string; learnerBuild: string }
  focusConcept?: string
  knowledgePoints?: string[]
}

const p0Lessons = (p0 as { lessons: LessonRecord[] }).lessons
const p2Lessons = (p2 as { lessons: LessonRecord[] }).lessons

const mustFind = (lessons: LessonRecord[], id: string): LessonRecord => {
  const lesson = lessons.find((l) => l.id === id)
  if (!lesson) throw new Error(`lesson not found: ${id}`)
  return lesson
}
const must = (value: string | undefined, what: string): string => {
  if (value === undefined) throw new Error(`missing field: ${what}`)
  return value
}

const OLD_P0_CLAIM = '忘记引号产生NameError'
const NEW_P0_CLAIM = '忘记引号：中文名字报 SyntaxError，英文名字报 NameError'
const OLD_P2_CLAIM = '有序列表查找同一目标时二分比较次数不超过线性'
const NEW_P2_CLAIM = '平均与最坏情况下，有序列表查找同一目标时二分比较次数不超过线性'

function linearCount(xs: number[], target: number): number {
  let n = 0
  for (const x of xs) {
    n += 1
    if (x === target) return n
  }
  return n
}

function binaryCount(xs: number[], target: number): number {
  let lo = 0
  let hi = xs.length - 1
  let n = 0
  while (lo <= hi) {
    n += 1
    const mid = Math.floor((lo + hi) / 2)
    if (xs[mid] === target) return n
    if (xs[mid] < target) lo = mid + 1
    else hi = mid - 1
  }
  return n
}

describe('AUD-102 P0-U1-L01: 忘记引号的错误类型必须区分中英文名字', () => {
  const lesson = mustFind(p0Lessons, 'P0-U1-L01')
  it('第 5 步、常见错误、失败用例、评分证据四处断言均区分 SyntaxError 与 NameError', () => {
    const step5 = lesson.learningSteps?.find((s) => s.order === 5)
    if (!step5) throw new Error('P0-U1-L01 step 5 missing')
    const failCase = lesson.assessment?.failCases?.find((c) => c.kind === 'negative')
    if (!failCase) throw new Error('P0-U1-L01 negative failCase missing')
    const scoring = lesson.assessment?.scoring?.find((r) => r.criterion === '调试能力')
    if (!scoring) throw new Error('P0-U1-L01 调试能力 scoring missing')
    const symptom = lesson.feedback?.commonMistakes[0]?.symptom
    if (symptom === undefined) throw new Error('P0-U1-L01 commonMistakes[0] missing')
    const fields = [step5.teacherPrompt, symptom, failCase.when, scoring.evidence]
    for (const f of fields) {
      expect(f).toContain('SyntaxError')
      expect(f).toContain('NameError')
      expect(f).toContain(NEW_P0_CLAIM)
    }
  })
  it('mustPass 的否定标准原样保留，不随改动被改写', () => {
    expect(lesson.assessment?.mustPass).toContain(`不能出现：${OLD_P0_CLAIM}。`)
  })
  it('课节内除 mustPass 否定标准外不再有裸露的旧断言', () => {
    const text = JSON.stringify(lesson)
    const withoutMustPass = text.split(`不能出现：${OLD_P0_CLAIM}`).join('')
    expect(withoutMustPass).not.toContain(OLD_P0_CLAIM)
  })
})

describe('AUD-103 P2-U1-L01: 二分比较次数断言必须带平均/最坏条件', () => {
  const lesson = mustFind(p2Lessons, 'P2-U1-L01')
  it('学习成果、项目标准、正向预期、评分标准四处均为带条件的表述', () => {
    const fields = [
      must(lesson.learningOutcome, 'learningOutcome'),
      must(lesson.project?.successCriteria, 'successCriteria'),
      must(lesson.assessment?.positive?.expected, 'positive.expected'),
      must(lesson.assessment?.rubric?.[0]?.description, 'rubric[0].description'),
    ]
    for (const f of fields) expect(f).toBe(`${NEW_P2_CLAIM}。`)
  })
  it('课节内不再有裸露的全称断言', () => {
    const stripped = JSON.stringify(lesson).split(NEW_P2_CLAIM).join('')
    expect(stripped).not.toContain(OLD_P2_CLAIM)
  })
  it('反例真跑：63 本有序书、目标为首元素时线性 1 次、二分 6 次（故全称断言不成立）', () => {
    const books = Array.from({ length: 63 }, (_, i) => i + 1)
    expect(linearCount(books, 1)).toBe(1)
    expect(binaryCount(books, 1)).toBe(6)
  })
  it('带条件后的断言真跑成立：n=1..200 最坏与平均情形下二分均不超过线性', () => {
    for (let n = 1; n <= 200; n += 1) {
      const xs = Array.from({ length: n }, (_, i) => i + 1)
      let worstLinear = 0
      let worstBinary = 0
      let sumLinear = 0
      let sumBinary = 0
      for (const t of xs) {
        const lc = linearCount(xs, t)
        const bc = binaryCount(xs, t)
        worstLinear = Math.max(worstLinear, lc)
        worstBinary = Math.max(worstBinary, bc)
        sumLinear += lc
        sumBinary += bc
      }
      expect(worstBinary).toBeLessThanOrEqual(worstLinear)
      expect(sumBinary / n).toBeLessThanOrEqual(sumLinear / n)
    }
  })
})

describe('AUD-104 P2-U2/U3 focusConcept 与 learnerBuild 实际内容一致', () => {
  const expected: Record<string, { focus: string; keyword: string }> = {
    'P2-U2-L02': { focus: '队列', keyword: 'deque' },
    'P2-U2-L03': { focus: '集合', keyword: 'set' },
    'P2-U2-L04': { focus: '词频字典', keyword: 'Counter' },
    'P2-U2-L05': { focus: '二维数组', keyword: '二维数组' },
    'P2-U2-L06': { focus: '队列', keyword: '队列' },
    'P2-U3-L05': { focus: '分治', keyword: '左右两半递归' },
  }
  for (const [id, { focus, keyword }] of Object.entries(expected)) {
    it(`${id} focusConcept 为 ${focus} 且 learnerBuild 含 ${keyword}`, () => {
      const lesson = mustFind(p2Lessons, id)
      expect(lesson.focusConcept).toBe(focus)
      expect(must(lesson.project?.learnerBuild, 'learnerBuild')).toContain(keyword)
    })
  }
  it('knowledgePoints 不在本批改动范围内（累计口径，另议）', () => {
    const lesson = mustFind(p2Lessons, 'P2-U2-L04')
    expect(lesson.knowledgePoints).toEqual(['栈', '队列'])
  })
})
