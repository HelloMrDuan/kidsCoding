import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { remedialLessons } from '@/content/curriculum/remedial-lessons'
import type { LaunchCurriculum } from '@/features/domain/types'

function buildAudioAssets(): LaunchCurriculum['audioAssets'] {
  return [
    ...launchLessons.map((lesson) => ({
      id: `${lesson.id}-voice-guide`,
      lessonId: lesson.id,
      usageType: '主课引导语音',
      provider: '课程配音素材',
    })),
    ...remedialLessons.map((lesson) => ({
      id: `${lesson.id}-voice-review`,
      lessonId: lesson.id,
      usageType: '补课回顾语音',
      provider: 'AI 语音草稿',
    })),
  ]
}

export function createSeedLaunchCurriculum(): LaunchCurriculum {
  return {
    lessons: launchLessons,
    remedials: remedialLessons,
    templates: launchTemplates,
    audioAssets: buildAudioAssets(),
  }
}
