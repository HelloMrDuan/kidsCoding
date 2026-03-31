import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { remedialLessons } from '@/content/curriculum/remedial-lessons'

export async function loadLaunchCurriculum() {
  return {
    lessons: launchLessons,
    remedials: remedialLessons,
    templates: launchTemplates,
    audioAssets: [
      ...launchLessons.map((lesson) => ({
        id: `${lesson.id}-voice-guide`,
        lessonId: lesson.id,
        usageType: '课程引导语音',
        provider: '核心课程真人配音',
      })),
      ...remedialLessons.map((lesson) => ({
        id: `${lesson.id}-voice-review`,
        lessonId: lesson.id,
        usageType: '补课回顾语音',
        provider: 'AI 语音提示',
      })),
    ],
  }
}
