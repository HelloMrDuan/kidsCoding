import { describe, expect, it } from 'vitest'

import {
  buildProjectSnapshotKey,
  normalizeProjectSnapshots,
} from './project-snapshot'

describe('project snapshot helpers', () => {
  it('keeps only the newest snapshot per lesson', () => {
    const snapshots = normalizeProjectSnapshots([
      {
        lessonId: 'trial-03-scene-story',
        updatedAt: '2026-03-31T10:00:00.000Z',
        blocks: [],
      },
      {
        lessonId: 'trial-03-scene-story',
        updatedAt: '2026-03-31T10:01:00.000Z',
        blocks: [{ type: 'move_right' }],
      },
    ])

    expect(snapshots).toHaveLength(1)
    expect(buildProjectSnapshotKey('trial-03-scene-story')).toBe(
      'project:trial-03-scene-story',
    )
    expect(snapshots[0]?.blocks).toEqual([{ type: 'move_right' }])
  })
})
