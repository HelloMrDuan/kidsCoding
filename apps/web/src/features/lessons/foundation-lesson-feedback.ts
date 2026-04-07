const FOUNDATION_LESSON_FEEDBACK = {
  'lesson-01-forest-hello': {
    initial: '先让小狐狸准备好出场，再把动作积木接上去。',
    progress: '现在，角色已经会走上舞台了。',
    retry: '先看看开始积木是不是放在最前面，再把移动积木接上去。',
  },
  'lesson-02-forest-greeting': {
    initial: '先让小狐狸准备出场，再接上一句欢迎的话。',
    progress: '现在，角色已经会开口打招呼了。',
    retry: '先让小狐狸准备出场，再把说话积木接在后面。',
  },
  'lesson-03-forest-story': {
    initial: '先让小狐狸出场，再把欢迎的话按顺序接上去。',
    progress: '很好，你马上就要做出一个完整作品了。',
    retry: '先看看动作和对话的顺序对不对，再把缺少的积木接完整。',
  },
  'lesson-04-meadow-scene': {
    initial: '先看看森林和草地两个画面，再把出发动作接起来。',
    progress: '现在，故事已经会换到新场景了。',
    retry: '先确认出发动作已经接好，再把切换场景放到后面。',
  },
  'lesson-05-meadow-order': {
    initial: '先安排出发，再安排到达，最后再说一句旅行感受。',
    progress: '现在，故事已经有先后顺序了。',
    retry: '先看看是不是先出发、再转场、最后才说旅行感受。',
  },
  'lesson-06-meadow-story': {
    initial: '先让小动物出发，再转到草地，最后给旅行收个尾。',
    progress: '很好，你马上就要做出一个完整作品了。',
    retry: '先看看出发、转场和收尾的话是不是按顺序接好了。',
  },
  'lesson-07-garden-click': {
    initial: '先放好“被点击时”，再试试让角色回应你的点击。',
    progress: '现在，角色已经会回应点击了。',
    retry: '先确认“被点击时”放在最前面，再把动作积木接在后面。',
  },
  'lesson-08-garden-dialogue': {
    initial: '先让角色在点击后动起来，再接上一句回应的话。',
    progress: '现在，角色已经会先动再说了。',
    retry: '先看看是不是先动起来，再接上一句回应的话。',
  },
  'lesson-09-garden-story': {
    initial: '先把点击开关放好，再接上动作和一句回应的话。',
    progress: '很好，你马上就要做出一个完整作品了。',
    retry: '先确认“被点击时”放在最前面，再把动作和一句回应的话接上去。',
  },
  'lesson-10-second-friend': {
    initial: '先让第一位朋友准备好，再给第二位朋友放上自己的开始和动作。',
    progress: '现在，第二位朋友已经上场了。',
    retry: '先看看第二位朋友是不是也有自己的开始积木，再把动作接上去。',
  },
  'lesson-11-duo-rehearsal': {
    initial: '先安排第一位朋友先行动，再让第二位朋友按顺序跟上来。',
    progress: '现在，两个朋友已经开始配合了。',
    retry: '先看看是不是先让第一位朋友开始，再让第二位朋友接上自己的动作。',
  },
  'lesson-12-graduation-show': {
    initial: '先让两个朋友先后出场，再让他们一起把小礼物找到。',
    progress: '很好，你马上就要做出启蒙毕业作品了。',
    retry: '先看看每个角色是不是都有自己的开始和动作顺序，再把找到礼物的收尾接上去。',
  },
} as const

const DEFAULT_FEEDBACK = {
  initial: '先把第一块积木放上去，角色就会开始准备登场。',
  progress: '很好，这一步已经完成了。继续往下，你的作品会更完整。',
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
