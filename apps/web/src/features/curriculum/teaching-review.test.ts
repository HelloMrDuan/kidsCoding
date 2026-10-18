import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { createReviewTemplate, evaluateReview, hardVetoes, renderReviewMarkdown, reviewDimensions, type TeachingReview } from './teaching-review'

const reviewDir = path.resolve(__dirname, '../../../../../docs/roadmap/teaching-reviews')
const lessonRegister = JSON.parse(readFileSync(path.resolve(__dirname, '../../../../../docs/roadmap/lesson-task-register.json'), 'utf8')) as { lessons: Array<{ id: string }> }
const knownLessonIds = new Set([...lessonRegister.lessons.map((l) => l.id), ...launchLessons.map((l) => l.id)])

function fullMarks(): TeachingReview {
  const review = createReviewTemplate('G0-U1-L01')
  review.reviewedCommit = '1586e277a56c4523ac52335e2f7a0af7978e7a84'
  review.reviewedAt = '2026-10-18'
  review.reviewer = '教研复核人'
  review.independent = true
  for (const d of reviewDimensions) review.scores[d.key] = { score: d.max, evidence: [`evidence/${d.key}.md`] }
  for (const v of hardVetoes) review.vetoes[v.key] = { status: 'pass' }
  review.runEvidence = {
    normalRun: '运行后小狐狸走到 100',
    failureCase: '缺开始积木：程序不运行并提示',
    hintLayers: ['观察', '概念', '具体做法'],
    practiceA: '建立事件',
    practiceB: '改变步数',
    equivalentSolutions: ['移动+移动', '移动+再做一次'],
    saveReopen: '保存→重开→运行→修改→再运行通过',
    e2eSpecs: ['tests/e2e/blockly-first-run.spec.ts'],
    screenshots: [],
  }
  return review
}

describe('TQ-001 teaching review scoring', () => {
  it('six dimensions add up to 100 and there are nine hard vetoes (09 §2)', () => {
    expect(reviewDimensions.reduce((s, d) => s + d.max, 0)).toBe(100)
    expect(hardVetoes).toHaveLength(9)
  })

  it('a complete, independent human review at ≥90 with all vetoes passed is a quality candidate, never L5', () => {
    const verdict = evaluateReview(fullMarks())
    expect(verdict).toMatchObject({ valid: true, total: 100, band: 'candidate', qualityCandidate: true, maxMaturitySupported: 4 })
  })

  it('bands: 80–89 polish, <80 redo', () => {
    const r = fullMarks()
    r.scores.practice.score = 12 // 87
    expect(evaluateReview(r)).toMatchObject({ total: 87, band: 'polish', qualityCandidate: false })
    r.scores.creation.score = 0 // 72
    expect(evaluateReview(r)).toMatchObject({ total: 72, band: 'redo', qualityCandidate: false })
  })

  it('any failed or unchecked hard veto blocks the candidate verdict regardless of score', () => {
    const failed = fullMarks()
    failed.vetoes['fake-execution'] = { status: 'fail', note: '舞台是预制动画' }
    expect(evaluateReview(failed)).toMatchObject({ total: 100, qualityCandidate: false, failedVetoes: ['fake-execution'] })
    const unchecked = fullMarks()
    unchecked.vetoes['minor-privacy-risk'] = { status: 'unchecked' }
    expect(evaluateReview(unchecked).qualityCandidate).toBe(false)
    const noNote = fullMarks()
    noNote.vetoes['fake-project'] = { status: 'fail' }
    expect(evaluateReview(noNote).valid).toBe(false)
  })

  it('AI or non-independent review can never certify quality', () => {
    const ai = fullMarks()
    ai.reviewerKind = 'ai'
    expect(evaluateReview(ai).qualityCandidate).toBe(false)
    const self = fullMarks()
    self.independent = false
    expect(evaluateReview(self).qualityCandidate).toBe(false)
  })

  it('points without evidence, out-of-range scores and a missing commit make the sheet invalid', () => {
    const r = fullMarks()
    r.scores.story = { score: 10, evidence: [] }
    r.scores.knowledge.score = 21
    r.reviewedCommit = 'main'
    const verdict = evaluateReview(r)
    expect(verdict.valid).toBe(false)
    expect(verdict.problems.join('\n')).toMatch(/没有证据[\s\S]*0–20|0–20[\s\S]*没有证据/)
    expect(verdict.problems.join('\n')).toContain('commit SHA')
  })

  it('missing run evidence (second practice, failure case, save/reopen) blocks the candidate verdict', () => {
    const r = fullMarks()
    r.runEvidence.practiceB = null
    r.runEvidence.saveReopen = null
    const verdict = evaluateReview(r)
    expect(verdict.qualityCandidate).toBe(false)
    expect(verdict.reasons.join()).toContain('两项目标不同的亲手练习')
    expect(verdict.reasons.join()).toContain('保存重开验证')
  })

  it('renders a PR-ready markdown report with every dimension, veto and the verdict', () => {
    const md = renderReviewMarkdown(fullMarks())
    for (const d of reviewDimensions) expect(md).toContain(d.label)
    for (const v of hardVetoes) expect(md).toContain(v.label)
    expect(md).toContain('**100/100**')
    expect(md).toContain('优质课程候选')
  })
})

describe('TQ-001 review records in docs/roadmap/teaching-reviews', () => {
  const files = readdirSync(reviewDir).filter((f) => f.endsWith('.json'))

  it('the committed fill-in template matches the tool and is an empty, non-candidate sheet', () => {
    const template = JSON.parse(readFileSync(path.join(reviewDir, '_template.json'), 'utf8'))
    expect(template).toEqual(createReviewTemplate('填写课程ID'))
    const verdict = evaluateReview(template)
    expect(verdict.total).toBe(0)
    expect(verdict.qualityCandidate).toBe(false)
  })

  it('every filled review is valid, named after a real lesson ID, and reproduces its own verdict', () => {
    for (const file of files.filter((f) => f !== '_template.json')) {
      const review = JSON.parse(readFileSync(path.join(reviewDir, file), 'utf8')) as TeachingReview
      expect(file, file).toBe(`${review.lessonId}.json`)
      expect(knownLessonIds.has(review.lessonId), `${file}: 未知课程 ID`).toBe(true)
      const verdict = evaluateReview(review)
      expect(verdict.problems, file).toEqual([])
      if (verdict.qualityCandidate) expect(review.maturityLevel, `${file}: L5 需负责人批准`).toBeLessThan(5)
    }
  })
})
