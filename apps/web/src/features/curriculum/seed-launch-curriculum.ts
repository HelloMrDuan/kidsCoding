import { launchLessons, launchTemplates } from '@/content/curriculum/launch-lessons'
import { remedialLessons } from '@/content/curriculum/remedial-lessons'
import type { LaunchCurriculum } from '@/features/domain/types'

function buildAudioAssets(): LaunchCurriculum['audioAssets'] {
  return [
    ...launchLessons.map((lesson) => ({
      id: `${lesson.id}-voice-guide`,
      lessonId: lesson.id,
      usageType: '璇剧▼寮曞璇煶',
      provider: '鏍稿績璇剧▼鐪熶汉閰嶉煶',
    })),
    ...remedialLessons.map((lesson) => ({
      id: `${lesson.id}-voice-review`,
      lessonId: lesson.id,
      usageType: '琛ヨ鍥為【璇煶',
      provider: 'AI 璇煶鎻愮ず',
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
