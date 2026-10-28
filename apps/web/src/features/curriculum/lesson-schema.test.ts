import { describe, expect, it } from 'vitest'
import { EXAMPLE_DEBT_BASELINE, validateCurriculumSnapshot, type CurriculumSnapshot, type SchemaErrorCode } from './lesson-schema'
import { readCurriculumSnapshot } from './lesson-schema-snapshot'

const real = readCurriculumSnapshot()
const clone = (): CurriculumSnapshot => structuredClone(real)
const codes = (s: CurriculumSnapshot) => validateCurriculumSnapshot(s).map(e => e.code)
function expectOnly(s: CurriculumSnapshot, code: SchemaErrorCode) {
  const errors = validateCurriculumSnapshot(s)
  expect(errors.length, JSON.stringify(errors)).toBeGreaterThan(0)
  expect(new Set(errors.map(e => e.code))).toEqual(new Set([code]))
}

describe('SYS-105 curriculum schema gate', () => {
  it('the real repository passes', () => {
    expect(validateCurriculumSnapshot(real)).toEqual([])
  })

  it('reads the real content, not an empty snapshot', () => {
    expect(real.catalogLessonIds.length).toBe(432)
    expect(real.detailedLessons.length).toBeGreaterThanOrEqual(192)
    expect(real.trials.length).toBe(32)
    expect(real.steps.length).toBe(57) // G0-U1-L01 to L06 each gained a creative-remake step, +5 steps each for G0-U2-L01..L03 event lessons (Hark A); +3 steps each for G2-U1-L01..L04 (Hark B)
    expect(real.publicAssets).toContain('v2/hero-studio.webp')
  })

  it('fails on duplicate lesson, trial or step IDs', () => {
    const a = clone(); a.detailedLessons.push({ ...a.detailedLessons[0] }); expectOnly(a, 'duplicate_id')
    const b = clone(); b.catalogLessonIds.push(b.catalogLessonIds[5]); expectOnly(b, 'duplicate_id')
    const c = clone(); c.steps.push({ ...c.steps[0] }); expectOnly(c, 'duplicate_id')
  })

  it('fails when a trial points at a lesson that does not exist', () => {
    const s = clone(); s.trials.push({ ...s.trials[0], id: 'G9-U9-L99' }); s.exampleDebt.push('G9-U9-L99')
    expect(codes(s)).toContain('unknown_lesson')
  })

  it('fails when a lesson is playable without a runner, route, e2e or engine capability', () => {
    const a = clone(); a.detailedLessons.find(l => l.id === 'G0-U3-L01')!.playable = true; expectOnly(a, 'no_runner')
    const b = clone(); b.trials[0] = { ...b.trials[0], route: '/learn/ghost-lab/x' }; expectOnly(b, 'missing_route')
    const c = clone(); c.trials[0] = { ...c.trials[0], e2eSpec: 'tests/e2e/ghost.spec.ts' }; expectOnly(c, 'missing_e2e')
    const d = clone(); d.engineCapabilities = d.engineCapabilities.filter(cap => cap !== 'path_obstacles'); expectOnly(d, 'missing_engine_capability')
  })

  it('fails on an asset without an original/authorized licence', () => {
    const a = clone(); a.publicAssets.push('v2/stolen-cartoon.png'); expectOnly(a, 'unlicensed_asset')
    const b = clone(); b.assetLicenses[0] = { ...b.assetLicenses[0], license: 'unknown' }; expectOnly(b, 'unlicensed_asset')
    const c = clone(); c.assetLicenses.push({ path: 'v2/missing.webp', license: 'original', source: 'x' }); expectOnly(c, 'license_entry_without_file')
    const d = clone(); const asset = d.lessonAssets.find(x => x.requiredBeforePublish)!; d.publishedLessonIds.push(asset.lessonId)
    expect(codes(d)).toContain('publish_with_unlicensed_asset')
  })

  it('fails when a step lacks a right or a wrong example, or a new trial has none', () => {
    const a = clone(); a.steps[3] = { ...a.steps[3], negativeExamples: 0 }; expectOnly(a, 'missing_examples')
    const b = clone(); b.steps[7] = { ...b.steps[7], positiveExamples: 0 }; expectOnly(b, 'missing_examples')
    const c = clone(); c.trials.push({ id: 'G0-U3-L01', engine: 'blockly', route: '/learn/grid-lab/G0-U3-L01', e2eSpec: 'tests/e2e/grid-lab.spec.ts' })
    expect(codes(c)).toContain('missing_examples')
  })

  it('the example-debt list can only shrink', () => {
    const s = clone(); s.trials.push({ id: 'G0-U3-L01', engine: 'blockly', route: '/learn/grid-lab/G0-U3-L01', e2eSpec: 'tests/e2e/grid-lab.spec.ts' }); s.exampleDebt.push('G0-U3-L01')
    expect(codes(s)).toContain('example_debt_changed')
    expect(EXAMPLE_DEBT_BASELINE.length).toBeLessThanOrEqual(19)
    const p = clone(); p.publishedLessonIds.push('P0-U1-L01'); expect(validateCurriculumSnapshot(p)).toContainEqual(expect.objectContaining({ code: 'missing_examples', id: 'P0-U1-L01' }))
  })
})
