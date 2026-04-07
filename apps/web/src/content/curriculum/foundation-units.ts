import type { FoundationRemedialMicroScript } from '@/features/domain/types'

type FoundationUnit = {
  id: string
  title: string
  summary: string
  lessonIds: string[]
  remedialMicroScript: FoundationRemedialMicroScript
}

export const foundationUnits: FoundationUnit[] = [
  {
    id: 'unit-1-forest-meetup',
    title: '森林见面会',
    summary: '让角色动起来并开口说话，做出第一个完整小故事。',
    lessonIds: [
      'lesson-01-forest-hello',
      'lesson-02-forest-greeting',
      'lesson-03-forest-story',
    ],
    remedialMicroScript: {
      title: '课内微补课',
      lines: ['先放开始积木。', '再接动作或说话积木。'],
      demo: '先高亮开始积木，再高亮后面的动作或说话积木。',
    },
  },
  {
    id: 'unit-2-meadow-journey',
    title: '小动物去旅行',
    summary: '学会切换场景和安排顺序，让故事从一个画面走到另一个画面。',
    lessonIds: [
      'lesson-04-meadow-scene',
      'lesson-05-meadow-order',
      'lesson-06-meadow-story',
    ],
    remedialMicroScript: {
      title: '课内微补课',
      lines: ['先让故事在前一个画面开始。', '再接切换场景积木。'],
      demo: '先播放前一个场景的一小段，再高亮切换场景积木。',
    },
  },
  {
    id: 'unit-3-garden-interaction',
    title: '花园互动秀',
    summary: '让角色对点击做出反应，完成第一个互动故事。',
    lessonIds: [
      'lesson-07-garden-click',
      'lesson-08-garden-dialogue',
      'lesson-09-garden-story',
    ],
    remedialMicroScript: {
      title: '课内微补课',
      lines: ['被点击时，不是一开始就会生效。', '要点到角色，它才会开始回应。'],
      demo: '先展示角色静止，再模拟点一下，让角色开始动作。',
    },
  },
  {
    id: 'unit-4-graduation-show',
    title: '动物朋友合作演出',
    summary: '让两个角色按顺序配合行动，完成启蒙毕业作品。',
    lessonIds: [
      'lesson-10-second-friend',
      'lesson-11-duo-rehearsal',
      'lesson-12-graduation-show',
    ],
    remedialMicroScript: {
      title: '课内微补课',
      lines: ['第二个角色也要有自己的开始积木。', '每个角色都要接好自己的动作顺序。'],
      demo: '先高亮第一位朋友的积木线，再高亮第二位朋友的积木线。',
    },
  },
]

export function getFoundationUnitByLessonId(lessonId: string) {
  return foundationUnits.find((unit) => unit.lessonIds.includes(lessonId)) ?? null
}
