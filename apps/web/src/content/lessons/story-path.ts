import type { LessonDefinition } from '@/features/domain/types'

export const storyPathLessons: LessonDefinition[] = [
  {
    id: 'move-character',
    title: '让角色动起来',
    goal: '让主角从左边走到右边',
    recommendedLevel: 'starter',
    rewardCardId: 'theme-scout-cat',
    steps: [
      {
        id: 'step-1',
        title: '放入开始积木',
        instruction: '先给动画一个开始按钮。',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '让角色向右移动',
        instruction: '把“向右移动”接在“开始时”后面。',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
    ],
  },
]
