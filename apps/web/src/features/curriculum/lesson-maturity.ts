import { g0u1GridLessons } from '@/content/curriculum/g0-u1-grid-lessons'
import { g0u2EventLessons } from '@/content/curriculum/g0-u2-event-lessons'
import { g0u3EventLessons } from '@/content/curriculum/g0-u3-event-loop-lessons'
import { g0u3LoopLessons } from '@/content/curriculum/g0-u3-loop-lessons'
import { g2ScratchLessons } from '@/content/curriculum/g2-u1-scratch-lessons'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import { getCatalogLesson, getLessonContentStage } from './full-catalog-access'
import { validTrialsFor } from './child-trial'
import { EXAMPLE_DEBT_BASELINE } from './lesson-schema'
import { evaluateLessonRelease, getLessonReleaseRecord, releaseRequirements, type ReleaseContext } from './release-readiness'

/**
 * SYS-101/SYS-102 — the ONE course maturity source (L0–L5).
 * Catalog list, lesson detail, admin catalog and /api/curriculum/catalog must all read
 * `getLessonMaturity`; never re-derive "playable" from track names or ad-hoc ID lists.
 *
 * L0 大纲规划   catalog outline only
 * L1 详案已备   detailed lesson plan / foundation guide exists (content != engine)
 * L2 引擎原型   a real runner executes this lesson's task (Blockly / Scratch VM / Pyodide)
 * L3 实验可试玩 runner is wired into a routed, E2E-covered trial entry — still NOT published
 * L4 验收通过   every release requirement except owner approval has positive evidence
 * L5 正式发布   all release requirements true, owner approved
 *
 * A level counts only when every lower level also holds (fail closed).
 */
export const maturityLevels = [
  { level: 0, key: 'outline', label: '大纲规划', short: 'L0 大纲' },
  { level: 1, key: 'detailed', label: '详案已备', short: 'L1 详案' },
  { level: 2, key: 'engine', label: '引擎原型', short: 'L2 引擎' },
  { level: 3, key: 'trial', label: '实验可试玩', short: 'L3 试玩' },
  { level: 4, key: 'verified', label: '验收通过', short: 'L4 验收' },
  { level: 5, key: 'published', label: '正式发布', short: 'L5 发布' },
] as const

export type MaturityLevel = (typeof maturityLevels)[number]['level']

export type TrialIntegration = {
  // 'classify' is the A0 classification-and-judgement engine, decided by the
  // main account's general dispatch (2026-10-31): A0 trial entries use it,
  // and no other track may reuse it without the same decision.
  engine: 'blockly' | 'scratch-vm' | 'pyodide' | 'classify'
  /** Route a learner opens; must exist in app/ and be covered by the e2e spec below. */
  route: string
  e2eSpec: string
}

/** Auditable engine evidence: only lessons with a real runner + routed trial + e2e spec. */
export const trialIntegrations: Record<string, TrialIntegration> = {
  'G3-U1-L02': { engine: 'scratch-vm', route: '/learn/scratch-lab/G3-U1-L02', e2eSpec: 'tests/e2e/scratch-vm.spec.ts' },
  // G2 lessons (U1 + U2; one shared spec file) on the restricted G2 Scratch VM lab (scratch-g2-sandbox.html).
  ...Object.fromEntries(
    Object.keys(g2ScratchLessons).map((id) => [
      id,
      { engine: 'scratch-vm', route: `/learn/scratch-lab/${id}`, e2eSpec: 'tests/e2e/scratch-g2-u1.spec.ts' } satisfies TrialIntegration,
    ]),
  ),
  'P0-U1-L01': { engine: 'pyodide', route: '/learn/python-lab/P0-U1-L01', e2eSpec: 'tests/e2e/python-lab.spec.ts' },
  'P0-U1-L02': { engine: 'pyodide', route: '/learn/python-lab/P0-U1-L02', e2eSpec: 'tests/e2e/python-multi.spec.ts' },
  'P0-U1-L03': { engine: 'pyodide', route: '/learn/python-lab/P0-U1-L03', e2eSpec: 'tests/e2e/python-multi.spec.ts' },
  'P0-U1-L04': { engine: 'pyodide', route: '/learn/python-lab/P0-U1-L04', e2eSpec: 'tests/e2e/python-multi.spec.ts' },
  'P0-U1-L05': { engine: 'pyodide', route: '/learn/python-lab/P0-U1-L05', e2eSpec: 'tests/e2e/python-multi.spec.ts' },
  'P0-U1-L06': { engine: 'pyodide', route: '/learn/python-lab/P0-U1-L06', e2eSpec: 'tests/e2e/python-multi.spec.ts' },
  // A0-U1-L01 stage 2: the classify trial (React widget, reason presence only).
  // The 'classify' engine type exists only because the main account decided it
  // (2026-10-31 general dispatch); the widget judges reasons by presence only
  // and never claims to grade reason quality.
  'A0-U1-L01': { engine: 'classify', route: '/learn/classify-lab/A0-U1-L01', e2eSpec: 'tests/e2e/classify-a0-u1.spec.ts' },
  // EDU-104: G0-U1 rewritten lessons on the SYS-106 grid engine.
  ...Object.fromEntries(
    Object.keys(g0u1GridLessons).map((id) => [
      id,
      { engine: 'blockly', route: `/learn/grid-lab/${id}`, e2eSpec: 'tests/e2e/grid-lab.spec.ts' } satisfies TrialIntegration,
    ]),
  ),
  // G0-U3 (Hark A): loop lessons on the grid engine with the SYS-107 repeat block; E2E in grid-lab.spec.ts.
  ...Object.fromEntries(
    Object.keys(g0u3LoopLessons).map((id) => [
      id,
      { engine: 'blockly', route: `/learn/grid-lab/${id}`, e2eSpec: 'tests/e2e/grid-lab.spec.ts' } satisfies TrialIntegration,
    ]),
  ),
  // G0-U2 (Hark A): event lessons on the event-stage engine; their E2E lives in grid-lab.spec.ts (already in CI).
  ...Object.fromEntries(
    [...Object.keys(g0u2EventLessons), ...Object.keys(g0u3EventLessons)].map((id) => [
      id,
      { engine: 'blockly', route: `/learn/event-lab/${id}`, e2eSpec: 'tests/e2e/grid-lab.spec.ts' } satisfies TrialIntegration,
    ]),
  ),
  // 12 standalone launch lessons: Blockly stage at /learn/lesson/<id>, covered by tests/e2e/blockly-*.spec.ts.
  ...Object.fromEntries(
    launchLessons.map((lesson) => [
      lesson.id,
      { engine: 'blockly', route: `/learn/lesson/${lesson.id}`, e2eSpec: 'tests/e2e/blockly-*.spec.ts' } satisfies TrialIntegration,
    ]),
  ),
}

/** Repository facts a release record cannot override (RELEASE-102). */
export function getReleaseContext(id: string): ReleaseContext {
  const trial = trialIntegrations[id]
  return {
    hasTrial: !!trial,
    hasE2E: !!trial && trial.e2eSpec.length > 0,
    inExampleDebt: EXAMPLE_DEBT_BASELINE.includes(id),
    validChildTrials: validTrialsFor(id, Object.keys(trialIntegrations)).length,
  }
}

/** RELEASE-102: seven traceable gates for one lesson (records + repository facts). */
export function getLessonRelease(id: string) {
  return evaluateLessonRelease(getLessonReleaseRecord(id), getReleaseContext(id))
}

export type LessonMaturity = {
  id: string
  level: MaturityLevel
  key: (typeof maturityLevels)[number]['key']
  label: string
  short: string
  /** L3+: an experimental trial entry may be shown (labelled as 实验, never 正式). */
  trialAvailable: boolean
  trialRoute: string | null
  engine: TrialIntegration['engine'] | null
  /** L5 only. Anything below must never be shown as a published, playable course. */
  published: boolean
  /** Next missing gate, for admin "未发布原因". */
  blockers: string[]
}

function isKnownLesson(id: string) {
  return getCatalogLesson(id) !== null || launchLessons.some((lesson) => lesson.id === id)
}

function hasDetailedPlan(id: string) {
  if (launchLessons.some((lesson) => lesson.id === id)) return true // foundation guide + seeded steps
  return getLessonContentStage(id) !== 'outline'
}

export function getLessonMaturity(id: string): LessonMaturity | null {
  if (!isKnownLesson(id)) return null
  const trial = trialIntegrations[id] ?? null
  const release = getLessonRelease(id)

  const gates: { ok: boolean; blocker: string }[] = [
    { ok: hasDetailedPlan(id), blocker: '缺详细教案' },
    { ok: trial !== null, blocker: '缺真实运行引擎' },
    { ok: trial !== null && trial.route.length > 0 && trial.e2eSpec.length > 0, blocker: '缺可路由的试玩入口和 E2E' },
    { ok: release.ready || release.verified, blocker: '发布验收未完成' },
    { ok: release.ready, blocker: '负责人尚未批准正式发布' },
  ]
  let level = 0
  for (const gate of gates) {
    if (!gate.ok) break
    level += 1
  }
  const meta = maturityLevels[level]
  const blockers = level < 5 ? [gates[level].blocker, ...(level >= 3 ? release.missing.map((m) => m.label) : [])] : []
  return {
    id,
    level: meta.level,
    key: meta.key,
    label: meta.label,
    short: meta.short,
    trialAvailable: level >= 3,
    trialRoute: level >= 3 && trial ? trial.route : null,
    engine: level >= 2 && trial ? trial.engine : null,
    published: level === 5,
    blockers: [...new Set(blockers)],
  }
}

/** Highest level reached by any lesson in a set, plus per-level counts (for track/unit chips). */
export function summarizeMaturity(ids: string[]) {
  const counts = [0, 0, 0, 0, 0, 0]
  let max = 0
  for (const id of ids) {
    const m = getLessonMaturity(id)
    if (!m) continue
    counts[m.level] += 1
    max = Math.max(max, m.level)
  }
  return { max: max as MaturityLevel, counts, trialCount: counts[3] + counts[4] + counts[5], publishedCount: counts[5] }
}

export const releaseRequirementCount = releaseRequirements.length
