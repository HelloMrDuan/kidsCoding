import { describe, expect, it } from 'vitest'
import catalog from '@/content/curriculum/full-catalog-v1.json'
import detailed from '@/content/curriculum/track-g0-detailed-lessons-v1.json'
import g1 from '@/content/curriculum/track-g1-detailed-lessons-v1.json'
import g2 from '@/content/curriculum/track-g2-detailed-lessons-v1.json'
import p0 from '@/content/curriculum/track-p0-detailed-lessons-v1.json'
import g3 from '@/content/curriculum/track-g3-detailed-lessons-v2.json'
import p1 from '@/content/curriculum/track-p1-detailed-lessons-v2.json'
import p2 from '@/content/curriculum/track-p2-detailed-lessons-v2.json'
import advancedAssets from '@/content/curriculum/advanced-asset-requirements-v2.json'
import assets from '@/content/curriculum/priority-asset-requirements-v1.json'
import foundation from '@/content/curriculum/foundation-guides-v1.json'
import { launchLessons } from '@/content/curriculum/launch-lessons'
import {
  getCatalogLesson, getCatalogStatistics, getCatalogTrack, getLessonContentStage,
  getLessonGuide, getPublicCatalogTracks, getPublicCatalogUnit, getUnitProject, getOfflinePythonExample,
} from './full-catalog-access'

describe('curriculum content and read-only discovery contract', () => {
  it('keeps all 432 catalog lessons separate from the 12 live curriculum entries', () => {
    const stats = getCatalogStatistics()
    expect(stats).toEqual({
      tracks: 18, units: 72, lessons: 432, detailedNewLessons: 168,
      detailedTracks: ['G0', 'G1', 'G2', 'G3', 'P0', 'P1', 'P2'], remainingOutlineLessons: 264,
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

describe('G1 Scratch and Python detailed coursework', () => {
  it('provides 72 unique detailed learning scripts tied to the canonical catalog', () => {
    const collections = [g1, g2, p0]
    const ids = collections.flatMap(collection => collection.lessons.map(lesson => lesson.id))
    expect(ids).toHaveLength(72)
    expect(new Set(ids).size).toBe(72)
    for (const collection of collections) {
      const reference = catalog.tracks.find(track => track.id === collection.trackId)
      expect(reference).toBeDefined()
      expect(collection.lessons.map(lesson => lesson.id)).toEqual(reference!.units.flatMap(unit => unit.lessons.map(lesson => lesson.id)))
      for (const lesson of collection.lessons) {
        expect(lesson.learningSteps).toHaveLength(5)
        expect(lesson.feedback.commonMistakes).toHaveLength(3)
        expect(lesson.feedback.tieredHints).toHaveLength(3)
        expect(lesson.assessment.passCases).toHaveLength(1)
        expect(lesson.assessment.failCases).toHaveLength(1)
        expect(lesson.assessment.scoring.reduce((sum, item) => sum + item.weight, 0)).toBe(100)
        expect(lesson.assessment.evaluationType).toBe('teacher_or_real_engine_pending')
        expect(lesson.runtimeVerified).toBe(false)
        expect(lesson.published).toBe(false)
        expect(getLessonGuide(lesson.id)?.steps).toHaveLength(5)
        expect(getLessonContentStage(lesson.id)).toBe('detailed')
      }
    }
  })
  it('requires clear content licensing and never presents missing media as already delivered', () => {
    expect(assets.assets).toHaveLength(216)
    const ids = new Set([...g1.lessons, ...g2.lessons, ...p0.lessons].map(lesson => lesson.id))
    for (const asset of assets.assets) {
      expect(ids.has(asset.lessonId)).toBe(true)
      expect(asset.status).toBe('spec_only')
      expect(asset.requiredBeforePublish).toBe(true)
    }
  })
  it('maps four offline Python reference projects without claiming online execution', () => {
    for (const lessonId of ['P0-U1-L06','P0-U2-L06','P0-U3-L06','P0-U4-L06']) {
      expect(getOfflinePythonExample(lessonId)).toContain('examples/python/p0')
      expect(getLessonGuide(lessonId)?.isPlayable).toBe(false)
    }
    expect(getOfflinePythonExample('G1-U1-L01')).toBeNull()
  })
})

describe('G3/P1/P2 advanced lesson content maturity and resource gates', () => {
  const tracks = [g3, p1, p2]

  it('matches the 72 canonical lesson IDs, 5 actions, and meaningful positive/negative assessment specifications', () => {
    for (const collection of tracks) {
      const original = catalog.tracks.find(track => track.id === collection.trackId)
      expect(original).toBeDefined()
      expect(collection.lessons).toHaveLength(24)
      expect(collection.lessons.map(lesson => lesson.id)).toEqual(
        original!.units.flatMap(unit => unit.lessons.map(lesson => lesson.id)),
      )
      for (const lesson of collection.lessons) {
        expect(lesson.teachingSteps).toHaveLength(5)
        expect(lesson.feedback.hints).toHaveLength(3)
        expect(lesson.assessment.rubric.reduce((sum, item) => sum + item.weight, 0)).toBe(100)
        expect(lesson.assessment.positive.executionStatus).toBe('spec_only')
        expect(lesson.assessment.negative.executionStatus).toBe('spec_only')
        expect(lesson.status).toBe('detailed_not_published')
        expect(getLessonContentStage(lesson.id)).toBe('detailed')
        expect(getLessonGuide(lesson.id)?.steps).toHaveLength(5)
        expect(getLessonGuide(lesson.id)?.isPlayable).toBe(false)
      }
    }
  })

  it('registers 240 assets only as requirements (not licensed or published)', () => {
    expect(advancedAssets.assets).toHaveLength(240)
    const ids = new Set(tracks.flatMap(track => track.lessons.map(lesson => lesson.id)))
    for (const asset of advancedAssets.assets) {
      expect(ids.has(asset.lessonId)).toBe(true)
      expect(asset.license).toBe('not_yet_cleared')
      expect(asset.productionStatus).toBe('requirements_only')
      expect(asset.isPublished).toBe(false)
    }
  })
})
