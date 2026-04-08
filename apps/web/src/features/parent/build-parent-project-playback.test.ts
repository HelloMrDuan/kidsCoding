import { describe, expect, it } from 'vitest'

import { buildParentProjectPlayback } from './build-parent-project-playback'

describe('buildParentProjectPlayback', () => {
  it('maps snapshot blocks and lesson metadata into a playback model', () => {
    const result = buildParentProjectPlayback({
      lessonId: 'trial-03-scene-story',
      updatedAt: '2026-03-31T10:00:00.000Z',
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
      lessonCatalog: [
        {
          id: 'trial-03-scene-story',
          title: '做出第一个完整小故事',
          goal: '完成一个可回放的短故事',
          templateId: 'forest-meetup-stage',
        },
      ],
    })

    expect(result).toEqual({
      lessonId: 'trial-03-scene-story',
      lessonTitle: '做出第一个完整小故事',
      lessonGoal: '完成一个可回放的短故事',
      templateId: 'forest-meetup-stage',
      updatedAt: '2026-03-31T10:00:00.000Z',
      blocks: [{ type: 'when_start' }, { type: 'move_right' }],
    })
  })

  it('falls back to lesson id and default goal when lesson metadata is missing', () => {
    const result = buildParentProjectPlayback({
      lessonId: 'custom-parent-project',
      updatedAt: '2026-03-31T10:00:00.000Z',
      blocks: [],
      lessonCatalog: [],
    })

    expect(result.lessonTitle).toBe('custom-parent-project')
    expect(result.lessonGoal).toBe('可以回看这个作品的积木结构和动作预览。')
  })
})
