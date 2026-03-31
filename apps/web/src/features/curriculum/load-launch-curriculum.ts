import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { remedialLessons } from '@/content/curriculum/remedial-lessons'

export async function loadLaunchCurriculum() {
  return {
    lessons: launchLessons,
    remedials: remedialLessons,
    templates: launchTemplates,
  }
}
