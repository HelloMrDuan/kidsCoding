// Single source of truth for launch lesson IDs used in E2E tests.
// Keep this file aligned with src/content/curriculum/launch-lessons.ts.
// Do not hardcode lesson IDs in individual spec files.

export const FIRST_LAUNCH_LESSON_ID = 'lesson-01-forest-hello'
export const SECOND_LAUNCH_LESSON_ID = 'lesson-02-forest-greeting'
export const GRADUATION_LESSON_ID = 'lesson-12-graduation-show'

// All launch lesson IDs in sortOrder, useful for list assertions.
export const LAUNCH_LESSON_IDS = [
  'lesson-01-forest-hello',
  'lesson-02-forest-greeting',
  'lesson-03-forest-story',
  'lesson-04-meadow-scene',
  'lesson-05-meadow-order',
  'lesson-06-meadow-story',
  'lesson-07-garden-click',
  'lesson-08-garden-dialogue',
  'lesson-09-garden-story',
  'lesson-10-second-friend',
  'lesson-11-duo-rehearsal',
  'lesson-12-graduation-show',
] as const
