import { describe, expect, it } from 'vitest'
import {
  emptyDraft,
  getCachedDraft,
  markEdited,
  parseDraft,
  restoreDefaultCode,
  saveDraft,
  serializeDraft,
  type L06Draft,
} from './a1-u1-l06-draft'

const V1 = 'def classify(color, weight):\n    return "苹果"'
const V2 = 'def classify(color, weight):\n    return "香蕉"'

describe('A1-U1-L06 draft persistence', () => {
  it('returns clean defaults for missing, corrupt, or wrong-version stored text', () => {
    expect(parseDraft(null, V1, V2)).toEqual(emptyDraft(V1, V2))
    expect(parseDraft('not json at all', V1, V2)).toEqual(emptyDraft(V1, V2))
    expect(parseDraft(JSON.stringify({ version: 2, ruleV1: 'x' }), V1, V2)).toEqual(emptyDraft(V1, V2))
  })

  it('restores rule texts, predictions, and contamination flags from stored text', () => {
    const draft: L06Draft = {
      ...emptyDraft(V1, V2),
      ruleV1: 'edited v1',
      predictions: { 'v1:S1': '苹果', 'v2:S2': '香蕉' },
      contaminated: { v1: true, v2: false },
    }
    const restored = parseDraft(serializeDraft(draft), V1, V2)
    expect(restored.ruleV1).toBe('edited v1')
    expect(restored.predictions).toEqual({ 'v1:S1': '苹果', 'v2:S2': '香蕉' })
    expect(restored.contaminated).toEqual({ v1: true, v2: false })
  })

  it('keeps contamination after refresh: a stored spent flag comes back spent', () => {
    const spent = markEdited(emptyDraft(V1, V2), 'v2')
    const afterRefresh = parseDraft(serializeDraft(spent), V1, V2)
    expect(afterRefresh.contaminated).toEqual({ v1: false, v2: true })
  })

  it('restoring default code resets the text but never restores eligibility', () => {
    const spent = markEdited({ ...emptyDraft(V1, V2), ruleV2: 'edited v2' }, 'v2')
    const restored = restoreDefaultCode(spent, 'v2', V2)
    expect(restored.ruleV2).toBe(V2)
    expect(restored.contaminated).toEqual({ v1: false, v2: true })
    const afterRefresh = parseDraft(serializeDraft(restored), V1, V2)
    expect(afterRefresh.contaminated.v2).toBe(true)
  })

  it('marking one rule edited leaves the other rule clean', () => {
    const draft = markEdited(emptyDraft(V1, V2), 'v1')
    expect(draft.contaminated).toEqual({ v1: true, v2: false })
  })

  it('cached snapshot returns the same object for unchanged stored text', () => {
    const raw = serializeDraft(markEdited(emptyDraft(V1, V2), 'v1'))
    expect(getCachedDraft(raw, V1, V2)).toBe(getCachedDraft(raw, V1, V2))
    expect(getCachedDraft(null, V1, V2)).toEqual(emptyDraft(V1, V2))
  })

  it('saveDraft reports false without a browser window instead of throwing', () => {
    expect(saveDraft(emptyDraft(V1, V2))).toBe(false)
  })
})
