import { describe, expect, it } from 'vitest'

import { completeLaunchLesson } from '@/features/lessons/complete-launch-lesson'
import { launchLessons } from '@/content/curriculum/launch-lessons'

import { defaultGuestProgress } from './local-progress'
import { mergeGuestSnapshot } from './merge-guest-snapshot'
import {
  buildProjectSnapshotKey,
  normalizeProjectSnapshots,
  sanitizeSnapshotBlocks,
} from './project-snapshot'

describe('project snapshot helpers', () => {
  it('keeps only the newest snapshot per lesson', () => {
    const snapshots = normalizeProjectSnapshots([
      {
        lessonId: 'trial-03-scene-story',
        updatedAt: 'Tue 2026-03-31 6:00 PM CST (UTC+08:00)',
        blocks: [],
      },
      {
        lessonId: 'trial-03-scene-story',
        updatedAt: 'Tue 2026-03-31 6:01 PM CST (UTC+08:00)',
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

describe('TQ-012 snapshot blocks with optional line', () => {
  it('reads old snapshots without line unchanged', () => {
    const old = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line' }]
    expect(sanitizeSnapshotBlocks(old)).toEqual(old)
  })

  it('keeps a string line, drops junk fields and malformed entries', () => {
    expect(
      sanitizeSnapshotBlocks([
        { type: 'say_line', line: 'hi-all', extra: 1 },
        { type: 'say_line', line: 42 },
        { type: 'say_line', line: '' },
        { line: 'hello' },
        null,
        'move_right',
        { type: '' },
      ]),
    ).toEqual([{ type: 'say_line', line: 'hi-all' }, { type: 'say_line' }, { type: 'say_line' }])
    expect(sanitizeSnapshotBlocks(undefined)).toEqual([])
    expect(sanitizeSnapshotBlocks({ blocks: [] })).toEqual([])
  })

  it('line survives lesson completion and the bind-account merge shape', () => {
    const lesson = launchLessons[2]
    const blocks = [{ type: 'when_start' }, { type: 'move_right' }, { type: 'say_line', line: 'lets-play' }, { type: 'move_right' }]
    const progress = completeLaunchLesson({
      lesson,
      lessons: launchLessons,
      progress: defaultGuestProgress,
      reward: { stars: 1, badgeIds: [], cardIds: [] },
      blocks,
      updatedAt: '2026-10-21T10:00:00.000Z',
    })
    expect(progress.projectSnapshots[0]?.blocks).toEqual(blocks)
    const merged = mergeGuestSnapshot({
      snapshot: {
        onboarding: { ageBand: '5-7', recommendedLevel: 'starter' },
        progress: {
          ...progress,
          // an old guest snapshot (pre TQ-012) mixed in for another lesson
          projectSnapshots: [...progress.projectSnapshots, { lessonId: 'lesson-01-forest-hello', updatedAt: '2026-10-01', blocks: [{ type: 'when_start' }] }],
        },
      },
    })
    expect(merged.projectSnapshots.map((snapshot) => snapshot.blocks)).toEqual([blocks, [{ type: 'when_start' }]])
  })
})
