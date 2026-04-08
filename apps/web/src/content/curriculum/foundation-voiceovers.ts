import type { LaunchLessonDefinition } from '@/features/domain/types'

export const foundationVoiceovers: Record<string, string[]> = {
  'lesson-01-forest-hello': [
    '先看看今天的小狐狸。',
    '先放开始积木。',
    '确认开始积木在最前面。',
    '再接上移动积木。',
    '点一下，看看小狐狸会不会出场。',
  ],
  'lesson-02-forest-greeting': [
    '先让小狐狸出场。',
    '认识说一句话积木。',
    '再接上一句欢迎话。',
    '把顺序排成先出场再说话。',
    '选一句你喜欢的话。',
  ],
  'lesson-03-forest-story': [
    '先看看今天的小故事。',
    '先让小狐狸出场。',
    '再让小狐狸说一句话。',
    '把顺序排完整。',
    '点一下，回看第一个完整故事。',
  ],
  'lesson-04-meadow-scene': [
    '先看看森林和草地。',
    '先接好森林里的出发动作。',
    '认识切换场景积木。',
    '再把故事切到草地。',
    '点一下，看看是不是成功转场。',
  ],
  'lesson-05-meadow-order': [
    '先回想上节的转场。',
    '先安排出发。',
    '再安排到达草地。',
    '最后接上一句旅行感受。',
    '再看一遍顺序对不对。',
  ],
  'lesson-06-meadow-story': [
    '先看看今天的旅行故事。',
    '先让小动物出发。',
    '再把故事切到新场景。',
    '给旅行加一句收尾的话。',
    '点一下，回看旅行故事。',
  ],
  'lesson-07-garden-click': [
    '先认识新的点击规则。',
    '认识被点击时积木。',
    '先放好点击开关。',
    '再接上移动积木。',
    '点一下，看看蝴蝶会不会飞起来。',
  ],
  'lesson-08-garden-dialogue': [
    '先回想点一下后会发生什么。',
    '先放好点击开关。',
    '让角色先动起来。',
    '再接上一句回应的话。',
    '点一下，看看完整互动。',
  ],
  'lesson-09-garden-story': [
    '先看看今天的互动表演。',
    '先搭好互动开关。',
    '点一下，角色先动起来。',
    '再加上一句回应的话。',
    '点一下，回看互动故事。',
  ],
  'lesson-10-second-friend': [
    '先看看今天的新朋友。',
    '先让第一位朋友准备好。',
    '第二位朋友也要有自己的开始。',
    '再接上第二位朋友的动作。',
    '点一下，看看两个朋友都准备好了没有。',
  ],
  'lesson-11-duo-rehearsal': [
    '先回看两位朋友都在舞台上。',
    '先安排第一位朋友行动。',
    '再安排第二位朋友跟上。',
    '再接上一句合作的话。',
    '点一下，回看两个朋友一起配合。',
  ],
  'lesson-12-graduation-show': [
    '先看看今天的毕业故事。',
    '先让第一位朋友出场。',
    '再让第二位朋友跟着出场。',
    '找到礼物后，再说一句庆祝话。',
    '点一下，回看启蒙毕业作品。',
  ],
}

export function applyFoundationVoiceovers(lessons: LaunchLessonDefinition[]) {
  for (const lesson of lessons) {
    const voiceovers = foundationVoiceovers[lesson.id]

    if (!voiceovers) {
      continue
    }

    const withVoiceovers = (steps: LaunchLessonDefinition['steps']) =>
      steps.map((step, index) => ({
        ...step,
        voiceover: voiceovers[index] ?? step.voiceover,
      }))

    let currentSteps = withVoiceovers(lesson.steps)

    Object.defineProperty(lesson, 'steps', {
      configurable: true,
      enumerable: true,
      get() {
        return currentSteps
      },
      set(nextSteps: LaunchLessonDefinition['steps']) {
        currentSteps = withVoiceovers(nextSteps)
      },
    })
  }
}
