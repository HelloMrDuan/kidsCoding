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
    '到草地后，用重复积木再走一百步。',
    '点一下，看看是不是又走了一百步。',
  ],
  'lesson-06-meadow-story': [
    '先看看今天的旅行故事。',
    '先让小狐狸出发。',
    '再把故事切到新场景。',
    '到草地后，再走一百步，再说一句感受。',
    '点一下，回看旅行故事。',
  ],
  'lesson-07-garden-click': [
    '先认识新的点击规则。',
    '先让蝴蝶回应一次点击。',
    '再看看是不是点到才会动。',
    '把点击和飞起来接完整。',
    '点一下，看看蝴蝶会不会飞起来。',
  ],
  'lesson-08-garden-dialogue': [
    '先回想点一下后会发生什么。',
    '先放好点击开关。',
    '让蝴蝶先飞起来。',
    '再接上一句回应的话。',
    '点一下，看看完整互动。',
  ],
  'lesson-09-garden-story': [
    '先看看今天的互动表演。',
    '先搭好互动开关。',
    '点一下，蝴蝶先飞起来。',
    '再加上一句回应的话。',
    '最后用重复积木再飞一次，让互动更明显。',
  ],
  'lesson-10-second-friend': [
    '看看两位朋友的起点，猜一猜切换后谁会走。',
    '先让小狐狸走，小熊留在原地。',
    '把操作权交给小熊，再让小熊走。',
    '故意漏掉切换，观察谁走过了头，再修好。',
    '运行你的野餐作品，讲讲为什么只动一个角色。',
  ],
  'lesson-11-duo-rehearsal': [
    '看看两个起点，猜切换后谁会说话。',
    '先让狐狸走，再切换并让小熊走，各走一百步。',
    '把说话交给小熊，看看狐狸有没有跟着说。',
    '故意把对白放在切换前，观察后再修好。',
    '改造你的排练作品，讲讲对白交给了谁。',
  ],
  'lesson-12-graduation-show': [
    '看看两个起点，猜猜切换后谁会再走。',
    '让狐狸走一百步，小熊留在起点。',
    '切换后让小熊一共走到两百步，狐狸不再移动。',
    '故意让小熊少走一次，观察礼物，再修好。',
    '选择你的寻宝方案，演示并解释重复交给了谁。',
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
