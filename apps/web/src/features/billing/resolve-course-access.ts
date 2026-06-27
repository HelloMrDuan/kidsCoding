export type CourseAccessResult = 'allowed' | 'locked'

export function resolveCourseAccess({
  lessonPhase,
  hasLaunchPack,
}: {
  lessonPhase: 'trial' | 'course'
  hasLaunchPack: boolean
}): CourseAccessResult {
  if (lessonPhase === 'trial') {
    return 'allowed'
  }

  if (lessonPhase === 'course') {
    return hasLaunchPack ? 'allowed' : 'locked'
  }

  // Unknown phases never grant access to paid content.
  return 'locked'
}
