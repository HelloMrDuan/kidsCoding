import { describe, expect, it } from 'vitest'

import { launchLessons } from '@/content/curriculum/launch-lessons'
import { remedialLessons } from '@/content/curriculum/remedial-lessons'

import { getRemedialIdForLesson } from './remedial-routing'

const forest = ['lesson-01-forest-hello', 'lesson-02-forest-greeting', 'lesson-03-forest-story']
const meadow = ['lesson-04-meadow-scene', 'lesson-05-meadow-order', 'lesson-06-meadow-story']
const garden = ['lesson-07-garden-click', 'lesson-08-garden-dialogue', 'lesson-09-garden-story']
const duo = ['lesson-10-second-friend', 'lesson-11-duo-rehearsal', 'lesson-12-graduation-show']

describe('tier-3 remedial routing (TQ-008)', () => {
  it('forest lessons go to the start-event / sequence remedial', () => {
    for (const id of forest) expect(getRemedialIdForLesson(id), id).toBe('remedial-start-sequence')
  })

  it('meadow lessons go to the ordered scene-switch remedial', () => {
    for (const id of meadow) expect(getRemedialIdForLesson(id), id).toBe('remedial-scene-switch')
  })

  it('only garden click lessons go to the click-trigger remedial', () => {
    for (const id of garden) expect(getRemedialIdForLesson(id), id).toBe('remedial-click-trigger')
    for (const id of [...forest, ...meadow]) expect(getRemedialIdForLesson(id, 'remedial-click-trigger'), id).not.toBe('remedial-click-trigger')
  })

  it('a stale hint-layer remedial id cannot override the unit routing for lessons 1–9', () => {
    expect(getRemedialIdForLesson('lesson-01-forest-hello', 'remedial-click-trigger')).toBe('remedial-start-sequence')
  })

  it('duo lessons go to the character-switch remedial (TQ-015), overriding any stale fallback', () => {
    for (const id of duo) expect(getRemedialIdForLesson(id), id).toBe('remedial-switch-character')
    expect(getRemedialIdForLesson('lesson-10-second-friend', 'remedial-click-trigger')).toBe('remedial-switch-character')
    expect(getRemedialIdForLesson('unknown')).toBeUndefined()
  })

  it('every routed remedial exists, returns to a real lesson and has key points plus a practice', () => {
    const lessonIds = new Set(launchLessons.map((lesson) => lesson.id))
    for (const id of [...forest, ...meadow, ...garden, ...duo]) {
      const remedial = remedialLessons.find((item) => item.id === getRemedialIdForLesson(id))
      expect(remedial, id).toBeDefined()
      expect(lessonIds.has(remedial!.returnToLessonId), remedial!.id).toBe(true)
      expect(remedial!.keyPoints?.length ?? 0).toBeGreaterThanOrEqual(2)
      expect(remedial!.practice).toBeDefined()
    }
  })

  it('order practices list a valid permutation and start with the start block', () => {
    for (const remedial of remedialLessons) {
      const practice = remedial.practice
      if (practice?.kind !== 'order') continue
      expect([...practice.displayOrder].sort()).toEqual(practice.cards.map((_, index) => index))
      expect(practice.cards[0].type).toBe('when_start')
      expect(practice.displayOrder[0]).not.toBe(0)
    }
  })

  it('lesson content hint layers agree with the routing for lessons 1–12', () => {
    for (const lesson of launchLessons.filter((item) => [...forest, ...meadow, ...garden, ...duo].includes(item.id))) {
      expect(lesson.hintLayers[2].remedialLessonId, lesson.id).toBe(getRemedialIdForLesson(lesson.id))
    }
  })

  it('the switch practice is the interactive switch kind, not an ordering drill', () => {
    const remedial = remedialLessons.find((item) => item.id === 'remedial-switch-character')
    expect(remedial?.practice?.kind).toBe('switch')
    expect(remedial?.returnToLessonId).toBe('lesson-10-second-friend')
  })
})
