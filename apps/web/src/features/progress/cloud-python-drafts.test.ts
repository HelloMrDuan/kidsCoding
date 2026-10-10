import { describe, expect, it } from 'vitest'
import { parseCloudPythonDraft, validatePythonDraftPayload } from './cloud-python-drafts'

describe('Python cloud draft validation', () => {
  it('allows only supported lesson IDs and extracts only code', () => {
    expect(validatePythonDraftPayload({
      lessonId: 'P0-U1-L02', source: 'print(1)', userId: 'other-user', passed: true,
    })).toEqual({ lessonId: 'P0-U1-L02', source: 'print(1)' })
    expect(validatePythonDraftPayload({ lessonId: 'P0-U1-L03', source: '' })).toEqual({ lessonId: 'P0-U1-L03', source: '' })
    expect(validatePythonDraftPayload({ lessonId: 'P0-U1-L04', source: 'return int(left)' })).toMatchObject({lessonId:'P0-U1-L04'})
    expect(validatePythonDraftPayload({ lessonId: 'P0-U1-L05', source: 'return name.strip()' })).toMatchObject({lessonId:'P0-U1-L05'})
  })
  it('rejects unknown lessons, bad types, oversized drafts, and invalid JSON shapes', () => {
    for (const value of [
      null, [], 'hi', { lessonId: 'P0-U1-L01', source: 'x' },
      { lessonId: 'P0-U1-L02', source: 5 },
      { lessonId: 'P0-U1-L03', source: 'a'.repeat(5001) },
    ]) expect(validatePythonDraftPayload(value)).toBeNull()
  })
  it('checks cloud timestamps and strips untrusted progress metadata', () => {
    expect(parseCloudPythonDraft({
      lessonId: 'P0-U1-L02', source: 'print(2)', updatedAt: '2026-10-10T11:00:00.000Z', passed: true,
    })).toEqual({
      lessonId: 'P0-U1-L02', source: 'print(2)', updatedAt: '2026-10-10T11:00:00.000Z',
    })
    expect(parseCloudPythonDraft({
      lessonId: 'P0-U1-L02', source: 'ok', updatedAt: 'not-a-date',
    })).toBeNull()
  })
})
