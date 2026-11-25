import { redirect } from 'next/navigation'

import { FOREST_HELLO_STUDIO_ROUTE } from '@/features/lessons/launch-lesson-routes'

/**
 * Compat redirect for the historical 《小狐狸出场》 URL.
 *
 * PR #573 review: the old three-column page must no longer be a second
 * classroom for this lesson. Bookmarks and old in-app links keep working —
 * they land on the one official V3 workspace. The redirect is temporary
 * (307) so the destination is never cached as permanent browser state.
 *
 * Only this one lesson gets a static route here; `[lessonId]` continues to
 * serve lesson-02…12 untouched.
 */
export default function LegacyForestHelloRedirect() {
  redirect(FOREST_HELLO_STUDIO_ROUTE)
}
