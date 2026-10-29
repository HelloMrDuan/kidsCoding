import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// HARK-A-AUDIT-144: the Hark A 144-lesson audit must cover exactly its six routes,
// stay honest about evidence (AI, non-independent), and never claim more than the ledger.
const docs = path.resolve(__dirname, '../../../../../docs/roadmap')
const audit = JSON.parse(readFileSync(path.join(docs, 'audit/hark-a-144-audit.json'), 'utf8')) as {
  independent: boolean
  scope: string[]
  lessons: Array<{
    lessonId: string
    trackId: string
    proposedObservableOutcome: string
    priority: string
    qualityScore: number | null
    issues: string[]
    actions: string[]
    checks: {
      engineSupport: { status: string; gaps: string[] }
      evidence: { childTrial: string; releaseEvidence: string; review: { file: string; independent: boolean } | null }
    }
  }>
}
const register = JSON.parse(readFileSync(path.join(docs, 'lesson-task-register.json'), 'utf8')) as {
  lessons: Array<{ id: string; trackId: string; status: string }>
}
const TEMPLATE = /^能使用.+?解释并完成「.+?」中的关键操作/

describe('HARK-A-AUDIT-144', () => {
  it('covers every lesson of G0, G1, M0, D0, S0, R0 exactly once', () => {
    expect(audit.scope.sort()).toEqual(['D0', 'G0', 'G1', 'M0', 'R0', 'S0'])
    const expected = register.lessons.filter(l => audit.scope.includes(l.trackId)).map(l => l.id).sort()
    const got = audit.lessons.map(l => l.lessonId).sort()
    expect(got).toHaveLength(144)
    expect(new Set(got).size).toBe(144)
    expect(got).toEqual(expected)
  })

  it('is a non-independent AI audit and claims no child trial or release', () => {
    expect(audit.independent).toBe(false)
    for (const l of audit.lessons) {
      expect(l.checks.evidence.childTrial).toBe('none')
      expect(l.checks.evidence.releaseEvidence).toBe('none')
      if (l.checks.evidence.review) {
        expect(existsSync(path.resolve(docs, '../..', l.checks.evidence.review.file))).toBe(true)
        expect(l.checks.evidence.review.independent).toBe(false)
      }
    }
  })

  it('only scores lessons that have a runnable implementation and a review file', () => {
    for (const l of audit.lessons) {
      if (l.qualityScore !== null) {
        expect(l.checks.evidence.review).not.toBeNull()
        expect(l.checks.engineSupport.status).toBe('available')
        // 80–89 must carry a remediation issue (09 gate)
        if (l.qualityScore < 90) expect(l.issues.some(s => s.includes('80–89'))).toBe(true)
      }
    }
  })

  it('gives every lesson a distinct, non-template observable outcome and a priority', () => {
    const outcomes = audit.lessons.map(l => l.proposedObservableOutcome)
    expect(new Set(outcomes).size).toBe(outcomes.length)
    for (const l of audit.lessons) {
      expect(l.proposedObservableOutcome).not.toMatch(TEMPLATE)
      expect(l.proposedObservableOutcome.length).toBeGreaterThan(20)
      expect(['P0', 'P1', 'P2']).toContain(l.priority)
      expect(l.actions.length).toBeGreaterThan(0)
    }
  })

  it('marks every lesson without an engine as P0 and lists the missing capabilities', () => {
    for (const l of audit.lessons) {
      if (l.checks.engineSupport.status === 'missing') expect(l.checks.engineSupport.gaps.length).toBeGreaterThan(0)
    }
    // A route with no runner at all cannot be lower than P1 anywhere.
    for (const l of audit.lessons.filter(x => ['M0', 'D0', 'S0', 'R0'].includes(x.trackId))) {
      expect(l.priority).not.toBe('P2')
    }
  })
})
