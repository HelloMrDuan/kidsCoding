import type { LaunchLessonDefinition } from '@/features/domain/types'

type ProjectContinueAction = {
  href: string
  label: string
}

const FALLBACK_ACTION: ProjectContinueAction = {
  href: '/learn/map',
  label: '回到学习地图',
}

export function resolveProjectContinueAction(
  lessons: LaunchLessonDefinition[],
  lessonId: string,
): ProjectContinueAction {
  const sortedLessons = [...lessons].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  )
  const currentIndex = sortedLessons.findIndex((lesson) => lesson.id === lessonId)

  if (currentIndex === -1) {
    return FALLBACK_ACTION
  }

  const currentLesson = sortedLessons[currentIndex]

  if (currentLesson?.id === 'lesson-12-graduation-show') {
    return {
      href: '/parent/purchase',
      label: '看看高阶创作阶段',
    }
  }

  const nextLesson = sortedLessons[currentIndex + 1]

  if (!nextLesson) {
    return FALLBACK_ACTION
  }

  return {
    href: `/learn/lesson/${nextLesson.id}`,
    label: currentLesson.sortOrder % 3 === 0 ? '进入下一单元' : '继续下一课',
  }
}
