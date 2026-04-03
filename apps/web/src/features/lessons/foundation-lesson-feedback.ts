const FOUNDATION_LESSON_FEEDBACK = {
  'lesson-01-forest-hello': {
    initial: '先让小狐狸准备好出场，再把动作积木接上去。',
    progress: '太好了，小狐狸已经准备好走上舞台了。',
    retry: '先看看开始积木是不是放在最前面，再把移动积木接上去。',
  },
  'lesson-02-forest-greeting': {
    initial: '先让小狐狸准备出场，再接上一句欢迎的话。',
    progress: '太好了，小狐狸已经会打招呼了。',
    retry: '先让小狐狸准备出场，再把说话积木接在后面。',
  },
  'lesson-03-forest-story': {
    initial: '先让小狐狸出场，再把欢迎的话按顺序接上去。',
    progress: '很好，再往前一步，你的第一个完整小故事就快完成了。',
    retry: '先看看动作和对白的顺序对不对，再把缺少的积木接完整。',
  },
  'lesson-04-meadow-scene': {
    initial: '先看看森林和草地两个画面，再把出发动作接起来。',
    progress: '太好了，故事已经从森林走到草地了。',
    retry: '先确认出发动作已经接好，再把切换场景放到后面。',
  },
  'lesson-05-meadow-order': {
    initial: '先安排出发，再安排到达，最后再说一句旅行感受。',
    progress: '太好了，故事已经开始按顺序往前走了。',
    retry: '先看看是不是先出发、再转场、最后才说旅行感受。',
  },
  'lesson-06-meadow-story': {
    initial: '先让小动物出发，再转到草地，最后给旅行收个尾。',
    progress: '太好了，第二个完整小故事已经快拼好了。',
    retry: '先看看出发、转场和收尾的话是不是按顺序接好了。',
  },
} as const

const DEFAULT_FEEDBACK = {
  initial: '先把第一块积木放上去，角色就会开始准备登场。',
  progress: '很好，这一步完成了。继续往下，作品马上会更像一个完整故事。',
  retry: '还差一点点。先看看角色是不是已经有开始积木，再把需要的动作接上去。',
}

type FoundationLessonFeedbackKind = keyof typeof DEFAULT_FEEDBACK

export function getFoundationLessonFeedback(
  lessonId: string,
  kind: FoundationLessonFeedbackKind,
) {
  return FOUNDATION_LESSON_FEEDBACK[
    lessonId as keyof typeof FOUNDATION_LESSON_FEEDBACK
  ]?.[kind] ?? DEFAULT_FEEDBACK[kind]
}
