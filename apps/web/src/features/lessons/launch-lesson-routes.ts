/**
 * Launch-lesson product routes.
 *
 * PR #573 review: 《小狐狸出场》 has exactly one official product entry — its
 * V3 studio workspace. Every product surface (home / learning map / cards /
 * completion / remedial / project continue / nav) must resolve this lesson to
 * that route, and its historical URL stays reachable as a compat redirect.
 *
 * The other eleven launch lessons are untouched: they keep their original
 * three-column classroom URL. This module is the single place that knows the
 * difference, so no caller has to special-case the lesson id.
 */

export const FOREST_HELLO_LESSON_ID = 'lesson-01-forest-hello'
export const FOREST_HELLO_STUDIO_ROUTE = '/studio/blockly/lesson-01-forest-hello'
export const FOREST_HELLO_LEGACY_ROUTE = '/learn/lesson/lesson-01-forest-hello'

/** Product route for one launch lesson (lesson-01 → V3, others unchanged). */
export function launchLessonHref(lessonId: string): string {
  return lessonId === FOREST_HELLO_LESSON_ID
    ? FOREST_HELLO_STUDIO_ROUTE
    : `/learn/lesson/${lessonId}`
}
