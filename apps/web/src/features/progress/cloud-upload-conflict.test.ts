import { describe, expect, it } from 'vitest'
import { findUploadConflicts } from './cloud-upload-conflict'
import type { CloudPythonDraft } from './cloud-python-drafts'
import type { LocalPractice } from './local-practice'

const local = (lessonId: LocalPractice['lessonId'], savedAt: string): LocalPractice => ({
  lessonId,
  title: lessonId,
  source: 'print(1)',
  passed: false,
  savedAt,
})

const cloud = (lessonId: CloudPythonDraft['lessonId'], updatedAt: string): CloudPythonDraft => ({
  lessonId,
  source: 'print(2)',
  updatedAt,
})

describe('UX-302 upload must not silently overwrite newer cloud drafts', () => {
  it('flags a cloud copy strictly newer than local', () => {
    const conflicts = findUploadConflicts(
      [local('P0-U1-L02', '2026-10-27T08:00:00.000Z')],
      [cloud('P0-U1-L02', '2026-10-27T09:00:00.000Z')],
    )
    expect(conflicts).toEqual([
      {
        lessonId: 'P0-U1-L02',
        localSavedAt: '2026-10-27T08:00:00.000Z',
        cloudUpdatedAt: '2026-10-27T09:00:00.000Z',
      },
    ])
  })

  it('does not flag local-newer, equal or cloud-missing drafts', () => {
    expect(findUploadConflicts(
      [local('P0-U1-L02', '2026-10-27T09:00:00.000Z')],
      [cloud('P0-U1-L02', '2026-10-27T08:00:00.000Z')],
    )).toEqual([])
    expect(findUploadConflicts(
      [local('P0-U1-L02', '2026-10-27T09:00:00.000Z')],
      [cloud('P0-U1-L02', '2026-10-27T09:00:00.000Z')],
    )).toEqual([])
    expect(findUploadConflicts(
      [local('P0-U1-L02', '2026-10-27T09:00:00.000Z')],
      [cloud('P0-U1-L03', '2026-10-27T10:00:00.000Z')],
    )).toEqual([])
  })

  it('reports only the conflicted lessons', () => {
    const conflicts = findUploadConflicts(
      [
        local('P0-U1-L02', '2026-10-27T08:00:00.000Z'),
        local('P0-U1-L03', '2026-10-27T10:00:00.000Z'),
      ],
      [
        cloud('P0-U1-L02', '2026-10-27T09:00:00.000Z'),
        cloud('P0-U1-L03', '2026-10-27T09:00:00.000Z'),
      ],
    )
    expect(conflicts.map((item) => item.lessonId)).toEqual(['P0-U1-L02'])
  })
})
