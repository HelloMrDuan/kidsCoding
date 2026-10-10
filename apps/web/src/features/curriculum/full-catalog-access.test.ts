import { describe, expect, it } from 'vitest'
import catalog from '@/content/curriculum/full-catalog-v1.json'
import detailed from '@/content/curriculum/track-g0-detailed-lessons-v1.json'
import foundation from '@/content/curriculum/foundation-guides-v1.json'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import {
  getCatalogLesson, getCatalogStatistics, getCatalogTrack, getLessonContentStage,
  getLessonGuide, getPublicCatalogTracks, getPublicCatalogUnit, getUnitProject,
} from './full-catalog-access'

describe('curriculum content and read-only discovery contract', () => {
  it('keeps all 432 catalog lessons separate from the 12 live curriculum entries', () => {
    const stats = getCatalogStatistics()
    expect(stats).toEqual({
      tracks: 18, units: 72, lessons: 432, detailedNewLessons: 24,
      existingFoundationGuides: 12, unitProjectBlueprints: 72,
      existingLaunchLessonEntries: 12,
    })
    expect(launchLessons).toHaveLength(12)
    expect(getPublicCatalogTracks()).toHaveLength(18)
    expect(getCatalogTrack('unknown')).toBeNull()
    expect(getCatalogLesson('not-a-lesson')).toBeNull()
  })

  it('has 24 unique first-path detailed scripts with concrete evidence and stable IDs', () => {
    const expectedIds = catalog.tracks[0].units.flatMap(unit => unit.lessons.map(lesson => lesson.id))
    expect(detailed.lessons.map(lesson => lesson.id)).toEqual(expectedIds)
    for (const lesson of detailed.lessons) {
      expect(lesson.teachingSteps).toHaveLength(5)
      expect(lesson.commonMistakes).toHaveLength(3)
      expect(lesson.hints).toHaveLength(3)
      expect(lesson.assessment.rubric.reduce((score, criterion) => score + criterion.weight, 0)).toBe(100)
      expect(lesson.assessment.negativeCases).toHaveLength(3)
      expect(lesson.playable).toBe(false)
      expect(lesson.engineVerified).toBe(false)
      expect(lesson.review.publicationStatus).toBe('content_ready_not_playable')
      expect(getLessonContentStage(lesson.id)).toBe('detailed')
      const normalized = getLessonGuide(lesson.id)
      expect(normalized?.steps).toHaveLength(5)
      expect(normalized?.isPlayable).toBe(false)
    }
  })

  it('preserves prior foundation guide IDs without treating them as automatically verified', () => {
    expect(foundation.lessons.map(lesson => lesson.id)).toEqual(launchLessons.map(lesson => lesson.id))
    for (const lesson of foundation.lessons) {
      expect(getLessonContentStage(lesson.id)).toBe('foundation')
      expect(getLessonGuide(lesson.id)?.steps).toHaveLength(6)
      expect(getLessonGuide(lesson.id)?.isPlayable).toBe(false)
    }
  })

  it('only returns safe metadata for public discovery', () => {
    const track = getCatalogTrack('G0')
    expect(track).not.toBeNull()
    const firstUnit = getPublicCatalogUnit(track!.units[0])
    expect(firstUnit.lessons).toHaveLength(6)
    expect(firstUnit.lessons.every(lesson => lesson.playable === false)).toBe(true)
    expect(JSON.stringify(firstUnit)).not.toContain('negativeCases')
    expect(JSON.stringify(firstUnit)).not.toContain('teacherPrompt')
    expect(getCatalogLesson('G0-U1-L01')?.lesson.id).toBe('G0-U1-L01')
    expect(getUnitProject('G0-U1')?.rubric.reduce((score, item) => score + item.points, 0)).toBe(100)
    expect(getUnitProject('unknown')).toBeNull()
    expect(getLessonGuide('not-a-lesson')).toBeNull()
  })
})
