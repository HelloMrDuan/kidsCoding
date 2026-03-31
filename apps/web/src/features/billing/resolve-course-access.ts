export function resolveCourseAccess({
  lessonPhase,
  hasLaunchPack,
}: {
  lessonPhase: 'trial' | 'course'
  hasLaunchPack: boolean
}) {
  if (lessonPhase === 'trial') {
    return 'allowed'
  }

  return hasLaunchPack ? 'allowed' : 'locked'
}
