import { describe, expect, it } from 'vitest'

import { buildPortfolioWorks } from './portfolio-works'
import type { LocalPractice } from './local-practice'

const practice = (lessonId: LocalPractice['lessonId'], savedAt: string, source = 'print(1)'): LocalPractice => ({
  lessonId, title: `课 ${lessonId}`, source, passed: false, savedAt,
})

describe('UX-301 portfolio works are real saved works only', () => {
  it('nothing saved -> no cards (empty state, no sample images)', () => {
    expect(buildPortfolioWorks({ progress: { projectSnapshots: [], completedLessonIds: [] }, practices: [] })).toEqual([])
  })

  it('Blockly snapshot becomes a card with the real lesson title, time and its own scene cover', () => {
    const [work] = buildPortfolioWorks({
      progress: { projectSnapshots: [{ lessonId: 'lesson-07-garden-click', updatedAt: '2026-10-18T08:00:00.000Z', blocks: [{ type: 'when_clicked' }, { type: 'move_right' }] }], completedLessonIds: ['lesson-07-garden-click'] },
      practices: [],
    })
    expect(work).toMatchObject({ kind: 'blockly', title: '点一下，蝴蝶飞起来', source: 'local', href: '/project/lesson-07-garden-click/complete', localPassed: true })
    expect(work.meta).toContain('2 块积木')
    expect(work.cover).toEqual({ type: 'scene', scene: 'garden', characters: ['butterfly', 'frog'] })
  })

  it('drops empty, unknown or undated snapshots', () => {
    const works = buildPortfolioWorks({
      progress: { projectSnapshots: [
        { lessonId: 'lesson-01-forest-hello', updatedAt: '2026-10-18T08:00:00.000Z', blocks: [] },
        { lessonId: 'not-a-lesson', updatedAt: '2026-10-18T08:00:00.000Z', blocks: [{ type: 'x' }] },
        { lessonId: 'lesson-02-forest-greeting', updatedAt: 'bad', blocks: [{ type: 'x' }] },
      ], completedLessonIds: [] },
      practices: [],
    })
    expect(works).toEqual([])
  })

  it('labels local / local+cloud / cloud-only sources and sorts newest first', () => {
    const works = buildPortfolioWorks({
      progress: { projectSnapshots: [], completedLessonIds: [] },
      practices: [practice('P0-U1-L02', '2026-10-18T09:00:00.000Z', 'a'), practice('P0-U1-L03', '2026-10-18T07:00:00.000Z', 'b')],
      cloudDrafts: [
        { lessonId: 'P0-U1-L02', source: 'a', updatedAt: '2026-10-18T09:00:00.000Z' },
        { lessonId: 'P0-U1-L04', source: 'c', updatedAt: '2026-10-18T08:00:00.000Z' },
      ],
    })
    expect(works.map((w) => [w.lessonId, w.source])).toEqual([
      ['P0-U1-L02', 'local+cloud'],
      ['P0-U1-L04', 'cloud'],
      ['P0-U1-L03', 'local'],
    ])
    expect(works[1].title).toContain('数字和字符串')
    expect(works.every((w) => w.cover.type === 'code')).toBe(true)
  })

  it('a cloud copy with different code is not claimed as synced', () => {
    const [work] = buildPortfolioWorks({
      progress: { projectSnapshots: [], completedLessonIds: [] },
      practices: [practice('P0-U1-L02', '2026-10-18T09:00:00.000Z', 'new')],
      cloudDrafts: [{ lessonId: 'P0-U1-L02', source: 'old', updatedAt: '2026-10-17T09:00:00.000Z' }],
    })
    expect(work.source).toBe('local')
  })
})
