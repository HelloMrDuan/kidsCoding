import { describe, expect, it } from 'vitest'
import catalog from './full-catalog-v1.json'
import blueprint from './unit-capstone-blueprints-v1.json'
import guides from './foundation-guides-v1.json'
import { launchLessons } from './launch-lessons'

describe('expanded curriculum content assets', () => {
  it('has unique ids and 18 tracks of four six-lesson units', () => {
    expect(catalog.tracks).toHaveLength(18)
    const ids = new Set<string>()
    for (const track of catalog.tracks) {
      expect(track.units).toHaveLength(4)
      for (const unit of track.units) {
        expect(unit.lessons).toHaveLength(6)
        for (const lesson of unit.lessons) {
          expect(ids.has(lesson.id)).toBe(false)
          ids.add(lesson.id)
          expect(lesson.title.trim().length).toBeGreaterThan(2)
          expect(lesson.status).toBe('outline_not_playable')
        }
      }
    }
    expect(ids.size).toBe(432)
  })
  it('keeps the existing twelve lesson ids aligned with detailed foundation guides', () => {
    expect(guides.lessons).toHaveLength(12)
    expect(new Set(guides.lessons.map(lesson => lesson.id)).size).toBe(12)
    expect(guides.lessons.map(lesson => lesson.id)).toEqual(launchLessons.map(lesson => lesson.id))
    for (const lesson of guides.lessons) {
      expect(lesson.instructionSequence).toHaveLength(6)
      expect(lesson.tieredHints).toHaveLength(3)
      expect(lesson.commonErrors.length).toBeGreaterThanOrEqual(3)
      expect(lesson.publicationStatus).toBe('content_ready_engine_unverified')
    }
  })
})

describe('unit capstone blueprints', () => {
  it('covers each of the 72 units exactly once', () => {
    const ids = catalog.tracks.flatMap(track => track.units.map(unit => unit.id))
    expect(blueprint.projects).toHaveLength(72)
    expect(new Set(blueprint.projects.map(project => project.unitId))).toEqual(new Set(ids))
    for (const project of blueprint.projects) {
      expect(project.missionSequence).toHaveLength(5)
      expect(project.rubric.reduce((sum, item) => sum + item.points, 0)).toBe(100)
      expect(project.publicationStatus).toBe('project_blueprint_not_playable')
    }
  })
})
