const FOUNDATION_LESSON_FEEDBACK = {
  'lesson-01-forest-hello': {
    initial: '先让小狐狸准备好出场，再把动作积木接上去。',
    progress: '现在，角色已经会走上舞台了。',
    retry: '先看看开始积木是不是放在最前面，再把移动积木接上去。',
  },
  'lesson-02-forest-greeting': {
    initial: '先让小狐狸出场，再在后面接上一句欢迎的话。',
    progress: '现在，角色已经会边出场边打招呼了。',
    retry: '先确认是先出场，再把说话积木接在后面。',
  },
  'lesson-03-forest-story': {
    initial: '先让小狐狸出场，再把欢迎的话按顺序接上去。',
    progress: '很好，你马上就要做出一个完整作品了。',
    retry: '先看看动作和对白的顺序对不对，再把缺少的积木接完整。',
  },
  'lesson-04-meadow-scene': {
    initial: '先看看森林和草地两个画面，再把出发动作接起来。',
    progress: '现在，故事已经会换到新场景了。',
    retry: '先确认出发动作已经接好，再把切换场景放到后面。',
  },
  'lesson-05-meadow-order': {
    initial: '先安排出发，再安排到达，到了草地后再往前走一次。',
    progress: '现在，故事不只会转场，还会在新场景里继续往前走了。',
    retry: '先看看是不是先出发、再转场，最后才接上“再做一次”。',
  },
  'lesson-06-meadow-story': {
    initial: '先让小动物出发，再转到草地，到了草地后再走一步，最后再说一句旅行感受。',
    progress: '很好，你马上就要做出一个完整作品了。',
    retry: '先看看出发、转场、再做一次和收尾的话是不是按顺序接好了。',
  },
  'lesson-07-garden-click': {
    initial: '先放好“被点击时”，再试试让角色回应你的点击。',
    progress: '现在，角色已经会回应点击了。',
    retry: '先确认“被点击时”在最前面，再点一下看看角色是不是只会在点击后才动。',
  },
  'lesson-08-garden-dialogue': {
    initial: '先让角色在点击后动起来，再接上一句回应的话。',
    progress: '现在，角色已经会先动再说了。',
    retry: '先看看是不是先动起来，再接上一句回应的话。',
  },
  'lesson-09-garden-story': {
    initial: '先把点击开关放好，再接上动作、回应的话，最后让它再做一次。',
    progress: '很好，你马上就要做出一个完整作品了。',
    retry: '先确认“被点击时”在最前面，再把动作、回应和“再做一次”按顺序接好。',
  },
  'lesson-10-second-friend': {
    initial: '小狐狸和小熊各有自己的起点。先观察、预测，再用积木分别指挥它们去野餐。',
    progress: '继续观察两条轨道：移动只给当前操作的朋友，切换后才轮到小熊。',
    retry: '看看舞台的实际位置，再打开分层提示。先移动小狐狸，再切换并移动小熊。',
  },
  'lesson-11-duo-rehearsal': {
    initial: '两位朋友准备出发，只有小熊说出发对白。先猜谁会开口，再亲自验证说话积木的角色归属。',
    progress: '继续观察实际位置和对白：小熊说话，狐狸不会跟着说。',
    retry: '看看是谁开口，再打开分层提示；把小熊的说话积木放在切换之后。',
  },
  'lesson-12-graduation-show': {
    initial: '先让两个朋友先后出场，再让他们会合、找到礼物，最后一起再向礼物靠近一步。',
    progress: '很好，你马上就要做出真正完整的启蒙毕业作品了。',
    retry: '先看看两个朋友是不是已经会合，再把庆祝话和“再做一次”接到最后。',
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
