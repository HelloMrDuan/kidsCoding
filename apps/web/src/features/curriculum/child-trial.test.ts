import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  CHILD_TESTING_CLAIMS,
  CONSENT_FORM,
  OBSERVATION_SHEET,
  childTrials,
  validTrialsFor,
  validateChildTrial,
  type ChildTrialRecord,
} from './child-trial'
import { trialIntegrations } from './lesson-maturity'

const WEB = join(__dirname, '..', '..', '..')
const REPO = join(WEB, '..', '..')
const known = Object.keys(trialIntegrations)

function sample(): ChildTrialRecord {
  return {
    trialId: 'T2026-001', date: '2026-11-01', childCode: 'C01', age: 6, setting: 'home', device: '平板 Chrome',
    consent: { guardianConsent: true, consentDate: '2026-10-30', form: CONSENT_FORM, recordingAllowed: false },
    observer: { name: '观察员A', role: 'parent' },
    lessons: [{ lessonId: 'G0-U1-L01', completed: true, minutes: 18, hintsUsed: 2, stuckPoints: ['第 2 关方向积木'] }],
    issues: [],
    reviewer: { name: '负责人', role: 'owner', date: '2026-11-02' },
  }
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap(n => (statSync(join(dir, n)).isDirectory() ? walk(join(dir, n)) : [join(dir, n)]))
}

describe('RELEASE-103 child trial records', () => {
  it('a consented, anonymised, age-appropriate, human-reviewed record is valid', () => {
    expect(validateChildTrial(sample(), known)).toEqual([])
  })

  it('rejects missing or late guardian consent and unregistered consent forms', () => {
    for (const consent of [
      { ...sample().consent, guardianConsent: false },
      { ...sample().consent, consentDate: '2026-11-05' },
      { ...sample().consent, form: 'docs/other.md' },
    ]) expect(validateChildTrial({ ...sample(), consent }, known).length).toBeGreaterThan(0)
  })

  it('rejects personal data: real names, schools, photos, non-anonymous codes', () => {
    expect(validateChildTrial({ ...sample(), childCode: '小明' }, known).length).toBeGreaterThan(0)
    expect(validateChildTrial({ ...sample(), school: '某小学' } as unknown as ChildTrialRecord, known).some(p => p.detail.includes('school'))).toBe(true)
    const withPhoto = { ...sample(), lessons: [{ ...sample().lessons[0], photo: 'a.jpg' }] } as unknown as ChildTrialRecord
    expect(validateChildTrial(withPhoto, known).some(p => p.detail.includes('photo'))).toBe(true)
  })

  it('rejects children outside the lesson age band and lessons that are not playable', () => {
    expect(validateChildTrial({ ...sample(), age: 10 }, known).some(p => p.detail.includes('适龄'))).toBe(true)
    expect(validateChildTrial({ ...sample(), age: 10, lessons: [{ ...sample().lessons[0], lessonId: 'P0-U1-L01' }] }, known)).toEqual([])
    expect(validateChildTrial({ ...sample(), lessons: [{ ...sample().lessons[0], lessonId: 'G0-U3-L01' }] }, known).length).toBeGreaterThan(0)
  })

  it('AI or implementer review, missing observer, or absurd durations do not count', () => {
    expect(validateChildTrial({ ...sample(), reviewer: { ...sample().reviewer, role: 'ai' } }, known).length).toBeGreaterThan(0)
    expect(validateChildTrial({ ...sample(), reviewer: { ...sample().reviewer, role: 'implementer' } }, known).length).toBeGreaterThan(0)
    expect(validateChildTrial({ ...sample(), observer: { name: '', role: 'parent' } }, known).length).toBeGreaterThan(0)
    expect(validateChildTrial({ ...sample(), lessons: [{ ...sample().lessons[0], minutes: 240 }] }, known).length).toBeGreaterThan(0)
  })

  it('every filed trial is valid, and the plan, consent form and sheet exist', () => {
    for (const trial of childTrials) expect(validateChildTrial(trial, known), trial.trialId).toEqual([])
    expect(new Set(childTrials.map(t => t.trialId)).size).toBe(childTrials.length)
    for (const doc of [CONSENT_FORM, OBSERVATION_SHEET, 'docs/roadmap/child-trials/README.md', 'docs/roadmap/child-trials/_template.json']) {
      expect(existsSync(join(REPO, doc)), doc).toBe(true)
    }
  })

  it('no product copy claims child testing while no valid trial exists', () => {
    const anyValid = known.some(id => validTrialsFor(id, known).length > 0)
    if (anyValid) return
    const files = [...walk(join(WEB, 'src')), ...walk(join(WEB, 'public'))]
      .filter(f => /\.(tsx?|json|md|html)$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.endsWith('child-trial.ts'))
    const offenders = files.filter(f => CHILD_TESTING_CLAIMS.test(readFileSync(f, 'utf8')))
    expect(offenders).toEqual([])
  })

  it('a filled template passes validation', () => {
    const template = JSON.parse(readFileSync(join(REPO, 'docs/roadmap/child-trials/_template.json'), 'utf8')) as ChildTrialRecord
    expect(template.consent.form).toBe(CONSENT_FORM)
    expect(validateChildTrial({ ...template, ...sample() }, known)).toEqual([])
  })
})
