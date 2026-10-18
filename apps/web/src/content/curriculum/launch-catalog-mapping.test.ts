import { describe, expect, it } from 'vitest'

import { getCatalogLesson, getCatalogStatistics } from '@/features/curriculum/full-catalog-access'

import { launchLessons } from './launch-lessons'
import {
  catalogLessonsCompletedByLaunch,
  getLaunchCatalogLink,
  getLaunchLessonsForCatalogLesson,
  launchCatalogMapping,
} from './launch-catalog-mapping'

describe('SYS-101 launch lessons ↔ G0/G1 catalog mapping', () => {
  it('maps every one of the 12 launch lessons exactly once and keeps their original IDs', () => {
    const launchIds = launchLessons.map((lesson) => lesson.id)
    expect(launchIds).toHaveLength(12)
    expect(launchCatalogMapping.map((entry) => entry.launchLessonId).sort()).toEqual([...launchIds].sort())
    expect(launchIds[0]).toBe('lesson-01-forest-hello')
    expect(launchIds.every((id) => /^lesson-\d{2}-/.test(id))).toBe(true)
  })

  it('does not add launch lessons to the 432 catalog', () => {
    expect(getCatalogStatistics().lessons).toBe(432)
    for (const lesson of launchLessons) expect(getCatalogLesson(lesson.id)).toBeNull()
  })

  it('only links to real G0/G1 catalog lessons with a reason and shared concepts', () => {
    for (const entry of launchCatalogMapping) {
      expect(['replaces', 'bridges', 'distinct']).toContain(entry.relation)
      expect(entry.rationale.length).toBeGreaterThan(10)
      if (entry.relation === 'distinct') {
        expect(entry.catalogLessonIds).toHaveLength(0)
        continue
      }
      expect(entry.catalogLessonIds.length).toBeGreaterThan(0)
      expect(entry.sharedConcepts.length).toBeGreaterThan(0)
      for (const id of entry.catalogLessonIds) {
        const found = getCatalogLesson(id)
        expect(found, id).not.toBeNull()
        expect(['G0', 'G1']).toContain(found?.track.id)
      }
    }
  })

  it('never lets launch progress complete catalog lessons through a bridge', () => {
    const allLaunch = launchLessons.map((lesson) => lesson.id)
    const bridgedTargets = launchCatalogMapping
      .filter((entry) => entry.relation === 'bridges')
      .flatMap((entry) => entry.catalogLessonIds)
    const completed = catalogLessonsCompletedByLaunch(allLaunch)
    for (const id of bridgedTargets) expect(completed).not.toContain(id)
    expect(completed).toEqual([])
  })

  it('answers lookups both ways', () => {
    expect(getLaunchCatalogLink('lesson-10-second-friend')?.catalogLessonIds).toContain('G0-U2-L04')
    expect(getLaunchLessonsForCatalogLesson('G0-U2-L04').map((entry) => entry.launchLessonId)).toEqual([
      'lesson-10-second-friend',
      'lesson-11-duo-rehearsal',
    ])
    expect(getLaunchCatalogLink('missing')).toBeNull()
    expect(getLaunchLessonsForCatalogLesson('P0-U1-L01')).toEqual([])
  })
})
