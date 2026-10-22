/**
 * TQ-008: the tier-3 remedial must match what the stuck lesson teaches, not one fixed page.
 * Unit 1 (forest, lessons 01–03): start event + sequence → remedial-start-sequence.
 * Unit 2 (meadow, lessons 04–06): ordered journey with a scene switch → remedial-scene-switch.
 * Unit 3 (garden, lessons 07–09): click event → remedial-click-trigger.
 * Unit 4 (duo, lessons 10–12): character switching → remedial-switch-character (TQ-015).
 * Routing lives in code so a stale remedialLessonId in a (database) hint layer cannot
 * send a forest child to the click page.
 */
const REMEDIAL_BY_LESSON: Record<string, string> = {
  'lesson-01-forest-hello': 'remedial-start-sequence',
  'lesson-02-forest-greeting': 'remedial-start-sequence',
  'lesson-03-forest-story': 'remedial-start-sequence',
  'lesson-04-meadow-scene': 'remedial-scene-switch',
  'lesson-05-meadow-order': 'remedial-scene-switch',
  'lesson-06-meadow-story': 'remedial-scene-switch',
  'lesson-07-garden-click': 'remedial-click-trigger',
  'lesson-08-garden-dialogue': 'remedial-click-trigger',
  'lesson-09-garden-story': 'remedial-click-trigger',
  'lesson-10-second-friend': 'remedial-switch-character',
  'lesson-11-duo-rehearsal': 'remedial-switch-character',
  'lesson-12-graduation-show': 'remedial-switch-character',
}

export function getRemedialIdForLesson(lessonId: string, fallback?: string): string | undefined {
  return REMEDIAL_BY_LESSON[lessonId] ?? fallback
}
