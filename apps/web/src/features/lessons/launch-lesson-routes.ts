/**
 * Launch-lesson product routes.
 *
 * PR #573 review: 《小狐狸出场》 has exactly one official product entry — its
 * V3 studio workspace. Every product surface (home / learning map / cards /
 * completion / remedial / project continue / nav) must resolve this lesson to
 * that route, and its historical URL stays reachable as a compat redirect.
 *
 * OPS-056: the other eleven launch lessons (lesson-02…12) now also have one
 * official entry each — the shared V3 launch studio route
 * `/studio/blockly/launch/<lessonId>`. Their historical `/learn/lesson/<id>`
 * URLs 308 there. Any id that is not a registered launch lesson keeps the
 * original classroom URL. This module is still the single place that knows
 * the difference, so no caller has to special-case a lesson id.
 */
import { isLaunchV3LessonId, launchV3Route } from './launch-v3/launch-v3-lessons'

export const FOREST_HELLO_LESSON_ID = 'lesson-01-forest-hello'
export const FOREST_HELLO_STUDIO_ROUTE = '/studio/blockly/lesson-01-forest-hello'
export const FOREST_HELLO_LEGACY_ROUTE = '/learn/lesson/lesson-01-forest-hello'

/** Product route for one launch lesson (lesson-01 → its V3 route, lesson-02…12 → the launch V3 route). */
export function launchLessonHref(lessonId: string): string {
  if (lessonId === FOREST_HELLO_LESSON_ID) return FOREST_HELLO_STUDIO_ROUTE
  if (isLaunchV3LessonId(lessonId)) return launchV3Route(lessonId)
  return `/learn/lesson/${lessonId}`
}
