import type { LaunchLessonDefinition } from '@/features/domain/types'

export const foundationVoiceovers: Record<string, string[]> = {
  'lesson-01-forest-hello': [
    '先放开始积木，认识今天的小狐狸。',
    '再接上移动积木，让小狐狸走上舞台。',
    '猜一猜，接两块移动积木，小狐狸会停在哪里。',
    '先看看少了开始积木会怎样，再修好它。',
  ],
  'lesson-02-forest-greeting': [
    '先让小狐狸出场。',
    '出场后接一句欢迎话，选一句你喜欢的。',
    '猜一猜，没有移动积木，小狐狸会在哪里说话。',
    '先看看先说话会怎样，再把顺序修好。',
  ],
  'lesson-03-forest-story': [
    '先让小狐狸走到小兔子身边。',
    '走到了，再打招呼。',
    '把说话挪到半路，和上一关比一比。',
    '找找故事顺序哪里乱了，再修好它。',
  ],
  'lesson-04-meadow-scene': [
    '先认识森林和草地，让小狐狸在森林出发。',
    '走完一百步，再把故事切到草地。',
    '猜一猜，在森林多走一段，什么时候到草地。',
    '先看看太早换场景会怎样，再修好它。',
  ],
  'lesson-05-meadow-order': [
    '先回想出发和到达草地。',
    '到草地后，用重复积木再走一百步。',
    '猜一猜，不换场景，小狐狸会停在哪里。',
    '先看看重复积木放在最前面会怎样，再修好它。',
  ],
  'lesson-06-meadow-story': [
    '先拼出上节课的旅行路线。',
    '到草地后，再说一句旅行感受。',
    '在森林里先说话，比一比说的话一样吗。',
    '先看看太晚换场景会怎样，再修好它。',
  ],
  'lesson-07-garden-click': [
    '先认识新的点击规则。',
    '先让蝴蝶回应一次点击。',
    '猜一猜，接两块飞的积木，蝴蝶会停在哪里。',
    '先看看用开始积木会怎样，再换成被点击时修好它。',
  ],
  'lesson-08-garden-dialogue': [
    '先回想：点一下，蝴蝶就飞。',
    '让蝴蝶先飞，再回应你。',
    '换成开始积木，比一比有什么不一样。',
    '先看看蝴蝶先说话会怎样，再把顺序修好。',
  ],
  'lesson-09-garden-story': [
    '先搭好互动开关，点一下就飞。',
    '飞一段就回应你，再飞一段。',
    '飞完两段再回应，比一比哪里不一样。',
    '先看看回应说得太早会怎样，再修好它。',
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
