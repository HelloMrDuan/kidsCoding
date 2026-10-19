import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EXAMPLE_DEBT_BASELINE } from './lesson-schema'
import { getLessonMaturity, getLessonRelease, trialIntegrations } from './lesson-maturity'
import {
  evaluateLessonRelease,
  releaseEvidence,
  releaseRequirements,
  type GateRecord,
  type LessonReleaseRecord,
  type ReleaseContext,
} from './release-readiness'

const REPO = join(__dirname, '..', '..', '..', '..', '..')
const fileExists = (p: string) => existsSync(join(REPO, p))

const repoCtx: ReleaseContext = { hasTrial: true, hasE2E: true, inExampleDebt: false, hasUnlicensedRequiredAsset: false, fileExists }
const ok = (extra: Partial<GateRecord> = {}): GateRecord => ({
  status: 'pass', reviewer: '审阅人A', reviewerRole: 'independent', date: '2026-10-19',
  evidence: [{ kind: 'file', ref: 'docs/roadmap/teaching-reviews/G0-U1-L01.json' }], ...extra,
})
const ci = { kind: 'ci' as const, ref: 'https://github.com/HelloMrDuan/kidsCoding/actions/runs/39197933515' }
function fullRecord(): LessonReleaseRecord {
  return {
    contentReviewed: ok({ evidence: [{ kind: 'review', ref: 'docs/roadmap/teaching-reviews/G0-U1-L01.json' }] }),
    engineProductionReady: ok(),
    assessmentE2EPassed: ok({ evidence: [ci, { kind: 'file', ref: 'apps/web/tests/e2e/grid-lab.spec.ts' }] }),
    licensedAssetsReady: ok({ evidence: [{ kind: 'file', ref: 'apps/web/src/content/curriculum/asset-licenses-v1.json' }] }),
    progressVerified: ok(),
    minorPrivacyApproved: ok(),
    humanApproved: ok({ reviewer: '负责人', reviewerRole: 'owner', evidence: [{ kind: 'pr', ref: 'https://github.com/HelloMrDuan/kidsCoding/pull/88' }] }),
  }
}

describe('RELEASE-102 seven traceable release gates', () => {
  it('has exactly seven distinct gates and an empty record fails all of them', () => {
    expect(releaseRequirements).toHaveLength(7)
    expect(new Set(releaseRequirements.map(r => r.key)).size).toBe(7)
    const r = evaluateLessonRelease({}, repoCtx)
    expect(r.ready).toBe(false)
    expect(r.missing).toHaveLength(7)
  })

  it('a complete, evidenced record is the only path to ready', () => {
    const r = evaluateLessonRelease(fullRecord(), repoCtx)
    expect(r.gates.filter(g => !g.passed).map(g => [g.key, g.reasons])).toEqual([])
    expect(r.ready).toBe(true)
    for (const meta of releaseRequirements) {
      const broken = { ...fullRecord(), [meta.key]: { status: 'unchecked' } }
      expect(evaluateLessonRelease(broken, repoCtx).ready).toBe(false)
    }
  })

  it('pass without evidence, reviewer or date is rejected', () => {
    for (const bad of [{ evidence: [] }, { reviewer: '' }, { date: undefined }, { date: '昨天' }] as Partial<GateRecord>[]) {
      const rec = { ...fullRecord(), progressVerified: ok(bad) }
      expect(evaluateLessonRelease(rec, repoCtx).gates.find(g => g.key === 'progressVerified')!.passed).toBe(false)
    }
  })

  it('evidence must point at real repo files, this repo CI runs and PRs', () => {
    for (const ref of [
      { kind: 'file' as const, ref: 'docs/roadmap/does-not-exist.json' },
      { kind: 'file' as const, ref: '../../etc/passwd' },
      { kind: 'ci' as const, ref: 'https://example.com/run/1' },
      { kind: 'pr' as const, ref: 'https://github.com/other/repo/pull/1' },
    ]) {
      const rec = { ...fullRecord(), minorPrivacyApproved: ok({ evidence: [ref] }) }
      expect(evaluateLessonRelease(rec, repoCtx).ready).toBe(false)
    }
  })

  it('AI or implementer reviews and non-owner approval never count', () => {
    expect(evaluateLessonRelease({ ...fullRecord(), contentReviewed: ok({ reviewerRole: 'ai', evidence: [{ kind: 'review', ref: 'docs/roadmap/teaching-reviews/G0-U1-L01.json' }] }) }, repoCtx).ready).toBe(false)
    expect(evaluateLessonRelease({ ...fullRecord(), contentReviewed: ok({ reviewerRole: 'implementer', evidence: [{ kind: 'review', ref: 'docs/roadmap/teaching-reviews/G0-U1-L01.json' }] }) }, repoCtx).ready).toBe(false)
    const notOwner = evaluateLessonRelease({ ...fullRecord(), humanApproved: ok({ reviewerRole: 'independent' }) }, repoCtx)
    expect(notOwner.ready).toBe(false)
    expect(notOwner.verified).toBe(true)
  })

  it('owner approval cannot jump ahead of the six earlier gates', () => {
    const rec = { ...fullRecord(), minorPrivacyApproved: { status: 'unchecked' as const } }
    const human = evaluateLessonRelease(rec, repoCtx).gates.find(g => g.key === 'humanApproved')!
    expect(human.passed).toBe(false)
    expect(human.reasons).toContain('前六道门禁未全部通过，不能批准')
  })

  it('repository facts override records: no trial, no E2E, example debt, unlicensed asset', () => {
    for (const ctx of [{ hasTrial: false }, { hasE2E: false }, { inExampleDebt: true }, { hasUnlicensedRequiredAsset: true }]) {
      expect(evaluateLessonRelease(fullRecord(), { ...repoCtx, ...ctx }).ready).toBe(false)
    }
    const noCi = { ...fullRecord(), assessmentE2EPassed: ok({ evidence: [{ kind: 'file', ref: 'apps/web/tests/e2e/grid-lab.spec.ts' }] }) }
    expect(evaluateLessonRelease(noCi, repoCtx).ready).toBe(false)
  })

  it('the real evidence ledger is valid, covers every trial lesson and publishes nothing', () => {
    const keys = new Set<string>(releaseRequirements.map(r => r.key))
    expect(Object.keys(releaseEvidence).sort()).toEqual(Object.keys(trialIntegrations).sort())
    for (const [id, record] of Object.entries(releaseEvidence)) {
      for (const [gate, rec] of Object.entries(record)) {
        expect(keys.has(gate), `${id}.${gate}`).toBe(true)
        for (const e of rec!.evidence ?? []) expect(fileExists(e.ref) || /^https:/.test(e.ref), `${id}.${gate} ${e.ref}`).toBe(true)
      }
      const decision = getLessonRelease(id)
      expect(decision.ready).toBe(false)
      expect(getLessonMaturity(id)!.level).toBeLessThanOrEqual(3)
      expect(getLessonMaturity(id)!.published).toBe(false)
      if (EXAMPLE_DEBT_BASELINE.includes(id)) {
        expect(decision.gates.find(g => g.key === 'assessmentE2EPassed')!.reasons).toContain('仍在正反例欠账名单中')
      }
    }
  })
})
