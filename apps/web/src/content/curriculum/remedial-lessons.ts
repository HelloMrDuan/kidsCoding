import type { RemedialLessonDefinition } from '@/features/domain/types'

export const remedialLessons: RemedialLessonDefinition[] = [
  {
    id: 'remedial-click-trigger',
    title: '先学会点击触发',
    focus: '理解点击后角色做动作',
    returnToLessonId: 'course-07-click-trigger',
    returnToStepId: 'step-1',
    steps: [],
  },
  {
    id: 'remedial-scene-switch',
    title: '先学会切换场景',
    focus: '理解不同场景之间的切换',
    returnToLessonId: 'course-05-scene-change',
    returnToStepId: 'step-1',
    steps: [],
  },
]
