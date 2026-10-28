import { describe, expect, it } from 'vitest'

import { buildParentGrowthReport } from './build-parent-growth-report'

const titles = new Map([
  ['G0-U1-L01', '小狐狸认识按钮'],
  ['G0-U1-L02', '小狐狸认识舞台'],
  ['lesson-01-forest-hello', '小狐狸出场'],
])

describe('buildParentGrowthReport', () => {
  it('only counts completed records and groups their registered concepts', () => {
    const report = buildParentGrowthReport({
      progressRecords: [
        { lesson_id: 'G0-U1-L01', status: 'completed', stars: 3 },
        { lesson_id: 'G0-U1-L02', status: 'in_progress', stars: 1 },
        { lesson_id: 'lesson-01-forest-hello', status: 'completed' },
      ],
      snapshotLessonIds: new Set(['G0-U1-L01']),
      lessonTitles: titles,
    })

    expect(report.completedCourseCount).toBe(2)
    const concepts = report.knowledgeGroups.map((group) => group.concept)
    expect(concepts).toContain('指令')
    expect(concepts).toContain('顺序')
    const instructionGroup = report.knowledgeGroups.find(
      (group) => group.concept === '指令',
    )
    expect(instructionGroup?.courses.map((course) => course.lessonId)).toEqual([
      'G0-U1-L01',
    ])
    expect(instructionGroup?.courses[0].stars).toBe(3)
    expect(instructionGroup?.courses[0].hasWork).toBe(true)
    expect(report.unregisteredLessons).toEqual([])
  })

  it('excludes in-progress lessons from every knowledge group', () => {
    const report = buildParentGrowthReport({
      progressRecords: [
        { lesson_id: 'G0-U1-L02', status: 'in_progress' },
      ],
      snapshotLessonIds: new Set(),
      lessonTitles: titles,
    })

    expect(report.completedCourseCount).toBe(0)
    expect(report.knowledgeGroups).toEqual([])
    expect(report.unregisteredLessons).toEqual([])
  })

  it('puts unknown completed lessons in the unregistered list, never inventing tags', () => {
    const report = buildParentGrowthReport({
      progressRecords: [
        { lesson_id: 'no-such-lesson', status: 'completed' },
      ],
      snapshotLessonIds: new Set(),
      lessonTitles: titles,
    })

    expect(report.completedCourseCount).toBe(1)
    expect(report.knowledgeGroups).toEqual([])
    expect(report.unregisteredLessons.map((lesson) => lesson.lessonId)).toEqual([
      'no-such-lesson',
    ])
    expect(report.unregisteredLessons[0].lessonTitle).toBe('no-such-lesson')
  })

  it('marks work links only for lessons that actually have a snapshot', () => {
    const report = buildParentGrowthReport({
      progressRecords: [
        { lesson_id: 'lesson-01-forest-hello', status: 'completed' },
      ],
      snapshotLessonIds: new Set(),
      lessonTitles: titles,
    })

    const sequenceGroup = report.knowledgeGroups.find(
      (group) => group.concept === '顺序',
    )
    expect(sequenceGroup?.courses[0].hasWork).toBe(false)
  })

  it('counts a duplicated completed record once', () => {
    const report = buildParentGrowthReport({
      progressRecords: [
        { lesson_id: 'G0-U1-L01', status: 'completed', stars: 2 },
        { lesson_id: 'G0-U1-L01', status: 'completed', stars: 3 },
      ],
      snapshotLessonIds: new Set(),
      lessonTitles: titles,
    })

    expect(report.completedCourseCount).toBe(1)
    const instructionGroup = report.knowledgeGroups.find(
      (group) => group.concept === '指令',
    )
    expect(instructionGroup?.courses).toHaveLength(1)
    expect(instructionGroup?.courses[0].stars).toBe(2)
  })

  it('returns empty groups for no records', () => {
    const report = buildParentGrowthReport({
      progressRecords: [],
      snapshotLessonIds: new Set(),
      lessonTitles: titles,
    })

    expect(report).toEqual({
      completedCourseCount: 0,
      knowledgeGroups: [],
      unregisteredLessons: [],
    })
  })
})
