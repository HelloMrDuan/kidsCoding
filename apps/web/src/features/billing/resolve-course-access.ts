export function resolveCourseAccess({
  lessonPhase,
}: {
  lessonPhase: 'trial' | 'course'
  hasLaunchPack: boolean
}) {
  if (lessonPhase === 'trial') {
    return 'allowed'
  }

  return 'allowed'
}
