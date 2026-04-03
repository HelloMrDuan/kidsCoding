import type {
  LaunchLessonDefinition,
  ProjectTemplateDefinition,
} from '@/features/domain/types'

import { applyFoundationVoiceovers } from './foundation-voiceovers'

const foundationHintLayers = {
  lesson01: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先让小狐狸准备好出场，再接动作积木。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '把“开始时”放在最前面，再把“向右移动”接上去。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一个很短的示意，再回来试一次。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson02: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先让小狐狸准备好，再把说话积木接上去。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '试试把“说一句话”接在“开始时”的后面。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一下“先开始、再说话”的小示意。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson03: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先让小狐狸出场，再让它开口打招呼。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '确认顺序是“开始时 → 向右移动 → 说一句话”。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一个顺序示意，再回来把故事排完整。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson04: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先看看森林和草地两个画面，再把出发动作接起来。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '先接好“开始时 → 向右移动”，再把“切换场景”放在后面。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一下故事怎么从森林走到草地，再回来试一次。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson05: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先安排出发，再安排到达，最后再说一句旅行感受。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '确认顺序是“开始时 → 向右移动 → 切换场景 → 说一句话”。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一个顺序示意，再回来把旅行排完整。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson06: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先让小动物出发，再转到草地，最后给旅行收个尾。',
    },
    {
      id: 'show_block',
      mode: 'show_block' as const,
      copy: '把出发、转场和收尾的话都接好，旅行故事就完整了。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一下完整旅行故事的顺序，再回来把自己的故事接完。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson07: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先放好“被点击时”，再试试让角色回应你的点击。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '先把“被点击时”放最前面，再把动作积木接在后面。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一下点到角色后才会开始动作的小示意。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson08: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先让角色在点击后动起来，再接上一句回应的话。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '确认顺序是“被点击时 → 向右移动 → 说一句话”。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一下“点一下，先动再说”的小示意。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  lesson09: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '先把点击开关放好，再接上动作和一句回应的话。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '确认顺序是“被点击时 → 向右移动 → 说一句话”。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先看一下完整互动故事的顺序，再回来把自己的表演接完。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
  later: [
    {
      id: 'repeat-goal',
      mode: 'repeat_goal' as const,
      copy: '再听一遍目标，先完成眼前这一步。',
    },
    {
      id: 'show-block',
      mode: 'show_block' as const,
      copy: '看看高亮积木，把它放到正确位置。',
    },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: '先学一个小补课，再回来继续。',
      remedialLessonId: 'remedial-click-trigger',
    },
  ],
}

export const launchTemplates: ProjectTemplateDefinition[] = [
  {
    id: 'forest-meetup-stage',
    name: '森林见面会舞台',
    starterScene: 'forest',
    starterCharacters: ['fox', 'rabbit'],
  },
  {
    id: 'meadow-journey-stage',
    name: '草地旅行舞台',
    starterScene: 'meadow',
    starterCharacters: ['fox', 'bird'],
  },
  {
    id: 'garden-interaction-stage',
    name: '花园互动舞台',
    starterScene: 'garden',
    starterCharacters: ['butterfly', 'frog'],
  },
  {
    id: 'forest-graduation-show',
    name: '动物朋友毕业演出',
    starterScene: 'forest-stage',
    starterCharacters: ['fox', 'bear'],
  },
]

export const launchLessons: LaunchLessonDefinition[] = [
  {
    id: 'lesson-01-forest-hello',
    title: '小狐狸出场',
    goal: '让小狐狸自己走上舞台，完成第一次出场。',
    recommendedLevel: 'starter',
    steps: [
      {
        id: 'step-1',
        title: '认识今天的主角',
        instruction: '先看一看今天的小狐狸，等会儿我们要让它自己走上舞台。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '认识开始积木',
        instruction: '先放“开始时”，告诉小狐狸什么时候开始行动。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-3',
        title: '让舞台准备好',
        instruction: '确认“开始时”放在最前面，这样舞台就准备好了。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-4',
        title: '接上移动积木',
        instruction: '把“向右移动”接在后面，让小狐狸自己走起来。',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
      {
        id: 'step-5',
        title: '回看第一次出场',
        instruction: '点一下运行，看看小狐狸是不是已经顺利走上舞台。',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
    ],
    rewardCardId: 'theme-forest-fox',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 1,
    hintLayers: foundationHintLayers.lesson01,
    parentAdvice: '请孩子演示一下小狐狸是怎么从舞台一边走到另一边的。',
  },
  {
    id: 'lesson-02-forest-greeting',
    title: '小狐狸打招呼',
    goal: '让小狐狸开口说一句欢迎的话。',
    recommendedLevel: 'starter',
    steps: [
      {
        id: 'step-1',
        title: '回顾上节的小成果',
        instruction: '先看一眼小狐狸出场，等会儿我们要让它开口打招呼。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '认识说话积木',
        instruction: '这块“说一句话”积木可以让小狐狸开口说话。',
        allowedBlocks: ['when_start', 'say_line'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-3',
        title: '先让小狐狸准备出场',
        instruction: '先放好“开始时”，告诉小狐狸什么时候准备说话。',
        allowedBlocks: ['when_start', 'say_line'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-4',
        title: '接上说话积木',
        instruction: '把“说一句话”接在后面，让小狐狸打一个招呼。',
        allowedBlocks: ['when_start', 'say_line'],
        requiredBlockTypes: ['when_start', 'say_line'],
      },
      {
        id: 'step-5',
        title: '换一句自己的话',
        instruction: '从预设对白里选一句你喜欢的话，让小狐狸再打一次招呼。',
        allowedBlocks: ['when_start', 'say_line'],
        requiredBlockTypes: ['when_start', 'say_line'],
      },
    ],
    rewardCardId: 'theme-forest-rabbit',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 2,
    hintLayers: foundationHintLayers.lesson02,
    parentAdvice: '让孩子给你演示一下小狐狸说了什么，并试着换一句自己的对白。',
  },
  {
    id: 'lesson-03-forest-story',
    title: '森林里的第一次见面',
    goal: '把动作和对白连起来，完成第一个完整小故事。',
    recommendedLevel: 'starter',
    steps: [
      {
        id: 'step-1',
        title: '看看今天要完成什么',
        instruction: '今天我们不只是练一个动作，而是要把小狐狸的第一次见面做成一个完整小故事。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '先让角色出场',
        instruction: '先接好“开始时”和“向右移动”，让小狐狸走上舞台。',
        allowedBlocks: ['when_start', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
      {
        id: 'step-3',
        title: '再让角色打招呼',
        instruction: '在移动后面接上一句欢迎的话，让故事继续往前走。',
        allowedBlocks: ['when_start', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right', 'say_line'],
      },
      {
        id: 'step-4',
        title: '调整顺序，故事才完整',
        instruction: '确认小狐狸先出场、再说话，这样第一次见面的感觉会更自然。',
        allowedBlocks: ['when_start', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right', 'say_line'],
      },
      {
        id: 'step-5',
        title: '回看我的第一个完整小故事',
        instruction: '点一下运行，看看小狐狸是不是已经做出了一个完整的小故事。',
        allowedBlocks: ['when_start', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right', 'say_line'],
      },
    ],
    rewardCardId: 'growth-first-project',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 3,
    hintLayers: foundationHintLayers.lesson03,
    templateId: 'forest-meetup-stage',
    parentAdvice: '和孩子一起回看第一个作品，问问他先看到了什么、又听到了什么。',
  },
  {
    id: 'lesson-04-meadow-scene',
    title: '从森林走到草地',
    goal: '学会把故事从一个场景切到另一个场景。',
    recommendedLevel: 'starter',
    steps: [
      {
        id: 'step-1',
        title: '先看看两个画面',
        instruction: '先认识森林和草地两个画面，等会儿我们要让故事从一个地方走到另一个地方。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '先把森林里的开场接好',
        instruction: '先接好“开始时”和“向右移动”，让小动物从森林里出发。',
        allowedBlocks: ['when_start', 'move_right'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
      {
        id: 'step-3',
        title: '认识切换场景积木',
        instruction: '这块“切换场景”积木可以让故事从森林走到草地。',
        allowedBlocks: ['when_start', 'move_right', 'switch_scene'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
      {
        id: 'step-4',
        title: '接上草地场景',
        instruction: '把“切换场景”接在后面，让故事真的来到草地。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_scene'],
        requiredBlockTypes: ['when_start', 'move_right', 'switch_scene'],
      },
      {
        id: 'step-5',
        title: '回看第一次转场',
        instruction: '点一下运行，看看故事是不是已经从森林顺利走到了草地。',
        allowedBlocks: ['when_start', 'move_right', 'switch_scene'],
        requiredBlockTypes: ['when_start', 'move_right', 'switch_scene'],
      },
    ],
    rewardCardId: 'theme-meadow-bird',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 4,
    hintLayers: foundationHintLayers.lesson04,
    parentAdvice: '请孩子给你指出故事是在哪一步从森林走到了草地。',
  },
  {
    id: 'lesson-05-meadow-order',
    title: '旅行要按顺序发生',
    goal: '让故事按顺序先出发、再转场、最后说出旅行感受。',
    recommendedLevel: 'starter',
    steps: [
      {
        id: 'step-1',
        title: '回顾上节的转场',
        instruction: '先看一眼故事怎么从森林来到草地，今天我们要让这段旅行更有先后顺序。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '先安排出发',
        instruction: '先让小动物从森林里出发，把第一段动作接好。',
        allowedBlocks: ['when_start', 'move_right', 'switch_scene', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
      {
        id: 'step-3',
        title: '再安排到达',
        instruction: '接上切换场景，让小动物来到草地，故事就有了第二段。',
        allowedBlocks: ['when_start', 'move_right', 'switch_scene', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right', 'switch_scene'],
      },
      {
        id: 'step-4',
        title: '最后说出旅行感受',
        instruction: '在转场后面接上一句旅行感受，让故事更像真的完成了一段旅程。',
        allowedBlocks: ['when_start', 'move_right', 'switch_scene', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right', 'switch_scene', 'say_line'],
      },
      {
        id: 'step-5',
        title: '顺序排完整',
        instruction: '再运行一次，看看是不是先出发、再到草地、最后才说出旅行感受。',
        allowedBlocks: ['when_start', 'move_right', 'switch_scene', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right', 'switch_scene', 'say_line'],
      },
    ],
    rewardCardId: 'growth-meadow-order',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 5,
    hintLayers: foundationHintLayers.lesson05,
    parentAdvice: '让孩子按顺序说一遍：先发生了什么，再发生了什么。',
  },
  {
    id: 'lesson-06-meadow-story',
    title: '小动物旅行记',
    goal: '把动作、转场和对白连起来，完成第二个完整小故事。',
    recommendedLevel: 'starter',
    steps: [
      {
        id: 'step-1',
        title: '看看今天的旅行故事',
        instruction: '今天我们要把森林出发、草地到达和旅行感受连起来，做成第二个完整小故事。',
        allowedBlocks: ['when_start'],
        requiredBlockTypes: ['when_start'],
      },
      {
        id: 'step-2',
        title: '让小动物先出发',
        instruction: '先接好开始和移动，让小动物从森林里出发。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_scene'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
      {
        id: 'step-3',
        title: '让故事走到新场景',
        instruction: '把切换场景接上去，让故事真的来到草地。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_scene'],
        requiredBlockTypes: ['when_start', 'move_right', 'switch_scene'],
      },
      {
        id: 'step-4',
        title: '给旅行加一句收尾的话',
        instruction: '在转场后面接上一句旅行感受，让故事像真的走完了一段旅程。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_scene'],
        requiredBlockTypes: ['when_start', 'move_right', 'say_line'],
      },
      {
        id: 'step-5',
        title: '回看我的旅行故事',
        instruction: '点一下运行，看看小动物是不是已经完成了从森林到草地的小旅行故事。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_scene'],
        requiredBlockTypes: ['when_start', 'move_right', 'say_line', 'switch_scene'],
      },
    ],
    rewardCardId: 'theme-meadow-story',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 6,
    hintLayers: foundationHintLayers.lesson06,
    templateId: 'meadow-journey-stage',
    parentAdvice: '和孩子一起回看旅行故事，问问他小动物先在哪里、后来又到了哪里。',
  },
  {
    id: 'lesson-07-garden-click',
    title: '点一下，蝴蝶飞起来',
    goal: '学会用点击触发角色做出反应。',
    recommendedLevel: 'foundation',
    steps: [
      {
        id: 'step-1',
        title: '认识今天的新规则',
        instruction: '今天蝴蝶不会一开始就自己动，要等你点到它，它才会回应你。',
        allowedBlocks: ['when_clicked'],
        requiredBlockTypes: ['when_clicked'],
      },
      {
        id: 'step-2',
        title: '认识被点击时积木',
        instruction: '这块“被点击时”积木是在告诉蝴蝶：只有被点到时才开始行动。',
        allowedBlocks: ['when_clicked'],
        requiredBlockTypes: ['when_clicked'],
      },
      {
        id: 'step-3',
        title: '先把点击开关放好',
        instruction: '先把“被点击时”放在最前面，让蝴蝶准备好回应你的点击。',
        allowedBlocks: ['when_clicked'],
        requiredBlockTypes: ['when_clicked'],
      },
      {
        id: 'step-4',
        title: '接上移动积木',
        instruction: '接上移动积木，让蝴蝶被点到后飞起来。',
        allowedBlocks: ['when_clicked', 'move_right'],
        requiredBlockTypes: ['when_clicked', 'move_right'],
      },
      {
        id: 'step-5',
        title: '试试点一下会发生什么',
        instruction: '点一下蝴蝶，看看它是不是已经会立刻飞起来了。',
        allowedBlocks: ['when_clicked', 'move_right'],
        requiredBlockTypes: ['when_clicked', 'move_right'],
      },
    ],
    rewardCardId: 'theme-garden-butterfly',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 7,
    hintLayers: foundationHintLayers.lesson07,
    parentAdvice: '请孩子演示一下点哪里会发生变化，再说说为什么会动起来。',
  },
  {
    id: 'lesson-08-garden-dialogue',
    title: '点一下，再说一句话',
    goal: '让角色在点击后先动再说，用动作和一句话回应你。',
    recommendedLevel: 'foundation',
    steps: [
      {
        id: 'step-1',
        title: '回顾上节的互动动作',
        instruction: '先想一想：上节课点一下蝴蝶后，它是不是先飞起来了？今天我们要让它再说一句话。',
        allowedBlocks: ['when_clicked'],
        requiredBlockTypes: ['when_clicked'],
      },
      {
        id: 'step-2',
        title: '先准备点击开关',
        instruction: '先把“被点击时”放在最前面，让蝴蝶准备好回应点击。',
        allowedBlocks: ['when_clicked'],
        requiredBlockTypes: ['when_clicked'],
      },
      {
        id: 'step-3',
        title: '点一下先动起来',
        instruction: '把“向右移动”接在后面，让蝴蝶先飞起来。',
        allowedBlocks: ['when_clicked', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_clicked', 'move_right'],
      },
      {
        id: 'step-4',
        title: '再接一句回应的话',
        instruction: '在动作后面接上一句回应的话，让蝴蝶点一下后先动再说。',
        allowedBlocks: ['when_clicked', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_clicked', 'move_right', 'say_line'],
      },
      {
        id: 'step-5',
        title: '回看完整互动',
        instruction: '点一下蝴蝶，看看它是不是已经会先动起来，再说一句话。',
        allowedBlocks: ['when_clicked', 'say_line', 'move_right'],
        requiredBlockTypes: ['when_clicked', 'say_line', 'move_right'],
      },
    ],
    rewardCardId: 'growth-garden-response',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 8,
    hintLayers: foundationHintLayers.lesson08,
    parentAdvice: '和孩子一起试试不同的点法，看角色每次都会不会做出相同反应。',
  },
  {
    id: 'lesson-09-garden-story',
    title: '花园里的互动表演',
    goal: '完成一个点一下就会有反应的互动故事。',
    recommendedLevel: 'foundation',
    steps: [
      {
        id: 'step-1',
        title: '看看今天要完成什么',
        instruction: '今天我们要做一段完整的互动表演，让角色在花园里对你的点击做出回应。',
        allowedBlocks: ['when_clicked'],
        requiredBlockTypes: ['when_clicked'],
      },
      {
        id: 'step-2',
        title: '先搭好互动开关',
        instruction: '先把“被点击时”放在最前面，告诉角色什么时候开始表演。',
        allowedBlocks: ['when_clicked'],
        requiredBlockTypes: ['when_clicked'],
      },
      {
        id: 'step-3',
        title: '点一下，角色先动起来',
        instruction: '接上动作积木，让角色在被点到后先动起来。',
        allowedBlocks: ['when_clicked', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_clicked', 'move_right'],
      },
      {
        id: 'step-4',
        title: '再加上一句回应的话',
        instruction: '在动作后面接上一句回应的话，让互动故事更完整。',
        allowedBlocks: ['when_clicked', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_clicked', 'move_right', 'say_line'],
      },
      {
        id: 'step-5',
        title: '回看我的互动故事',
        instruction: '点一下角色，看看花园里的互动表演是不是已经会回应你的点击了。',
        allowedBlocks: ['when_clicked', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_clicked', 'move_right', 'say_line'],
      },
    ],
    rewardCardId: 'theme-garden-story',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 9,
    hintLayers: foundationHintLayers.lesson09,
    templateId: 'garden-interaction-stage',
    parentAdvice: '请孩子给你演示一遍互动故事，再让他告诉你点哪里才会触发变化、角色会怎么回应。',
  },
  {
    id: 'lesson-10-second-friend',
    title: '第二位朋友上场',
    goal: '让第二位动物朋友加入演出。',
    recommendedLevel: 'foundation',
    steps: [
      {
        id: 'step-1',
        title: '先安排第一位朋友',
        instruction: '先用开始积木安排第一位角色的出场动作。',
        allowedBlocks: ['when_start', 'move_right', 'say_line'],
        requiredBlockTypes: ['when_start', 'move_right'],
      },
      {
        id: 'step-2',
        title: '再让第二位朋友上场',
        instruction: '给第二位角色也接上动作或对白，让舞台不再只有一个角色。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_character'],
        requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
      },
    ],
    rewardCardId: 'theme-duo-bear',
    phase: 'trial',
    mode: 'template',
    sortOrder: 10,
    hintLayers: foundationHintLayers.later,
    templateId: 'forest-graduation-show',
    parentAdvice: '请孩子告诉你哪一位朋友先上场，第二位朋友又是在什么时候加入的。',
  },
  {
    id: 'lesson-11-duo-rehearsal',
    title: '两个朋友一起配合',
    goal: '让双角色完成动作和对白配合。',
    recommendedLevel: 'foundation',
    steps: [
      {
        id: 'step-1',
        title: '安排第一段配合',
        instruction: '先让第一位角色说话或动作，再让第二位角色接住这一段。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_character', 'repeat_twice'],
        requiredBlockTypes: ['when_start', 'say_line', 'switch_character'],
      },
      {
        id: 'step-2',
        title: '加上一点重复节奏',
        instruction: '如果想让演出更热闹，可以用重复积木让动作出现两次。',
        allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_character', 'repeat_twice'],
        requiredBlockTypes: ['when_start', 'switch_character', 'repeat_twice'],
      },
    ],
    rewardCardId: 'growth-duo-teamwork',
    phase: 'trial',
    mode: 'template',
    sortOrder: 11,
    hintLayers: foundationHintLayers.later,
    templateId: 'forest-graduation-show',
    parentAdvice: '和孩子一起观察两位朋友是谁先说话、谁后动作，鼓励他调整顺序再试一次。',
  },
  {
    id: 'lesson-12-graduation-show',
    title: '动物朋友毕业演出',
    goal: '完成一个双角色互动故事，作为启蒙毕业作品。',
    recommendedLevel: 'foundation',
    steps: [
      {
        id: 'step-1',
        title: '完成毕业故事',
        instruction: '把双角色出场、对白、动作和点击互动组合成完整演出。',
        allowedBlocks: [
          'when_start',
          'when_clicked',
          'move_right',
          'say_line',
          'switch_character',
          'repeat_twice',
        ],
        requiredBlockTypes: [
          'when_start',
          'when_clicked',
          'say_line',
          'switch_character',
        ],
      },
    ],
    rewardCardId: 'commemorative-foundation-graduate',
    phase: 'trial',
    mode: 'template',
    sortOrder: 12,
    hintLayers: foundationHintLayers.later,
    templateId: 'forest-graduation-show',
    parentAdvice: '和孩子一起回看毕业作品，问一问哪一位朋友先出场、哪里有互动变化。',
  },
]

applyFoundationVoiceovers(launchLessons)

const lesson10 = launchLessons.find((lesson) => lesson.id === 'lesson-10-second-friend')

if (lesson10) {
  lesson10.title = '第二位朋友上场'
  lesson10.goal = '让第二位动物朋友也拥有自己的开始和出场动作。'
  lesson10.steps = [
    {
      id: 'step-1',
      title: '看看今天的新朋友',
      instruction: '今天不是换掉原来的角色，而是要让第二位动物朋友也来到舞台上。',
      allowedBlocks: ['when_start'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-2',
      title: '先让第一位朋友准备好',
      instruction: '先用熟悉的开始和动作，安排第一位朋友站上舞台。',
      allowedBlocks: ['when_start', 'move_right'],
      requiredBlockTypes: ['when_start', 'move_right'],
    },
    {
      id: 'step-3',
      title: '认识第二位朋友的开始',
      instruction: '第二位朋友也要有自己的开始积木，这样它才知道什么时候上场。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'switch_character'],
    },
    {
      id: 'step-4',
      title: '接上第二位朋友的动作',
      instruction: '给第二位朋友接一个动作，让它也真的走上舞台。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
    {
      id: 'step-5',
      title: '回看两个朋友都准备好了',
      instruction: '点一下运行，看看两位朋友是不是都已经站上了舞台。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
  ]
  lesson10.parentAdvice = '请孩子告诉你哪一位朋友先准备好，第二位朋友又是怎么上场的。'
}

const lesson11 = launchLessons.find((lesson) => lesson.id === 'lesson-11-duo-rehearsal')

if (lesson11) {
  lesson11.title = '两个朋友一起出发'
  lesson11.goal = '让两个角色按顺序配合行动，像在一起完成一件小事。'
  lesson11.steps = [
    {
      id: 'step-1',
      title: '回顾两位朋友都在舞台上',
      instruction: '先看看两位朋友是不是都已经准备好了，再继续安排他们一起行动。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
    {
      id: 'step-2',
      title: '先安排第一位朋友行动',
      instruction: '先让第一位朋友做出一个动作，带着故事往前走。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right'],
    },
    {
      id: 'step-3',
      title: '再安排第二位朋友跟上',
      instruction: '切换到第二位朋友，再让它接着行动，这样故事就会更像合作。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
    {
      id: 'step-4',
      title: '看看顺序是不是刚刚好',
      instruction: '确认是第一位朋友先动、第二位朋友再跟上，这样画面会更自然。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
    {
      id: 'step-5',
      title: '回看两个朋友一起行动',
      instruction: '点一下运行，看看两位朋友是不是已经会按顺序一起行动了。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
  ]
  lesson11.parentAdvice = '和孩子一起看看是谁先出发、谁后跟上，鼓励他调整顺序再试一次。'
}

const lesson12 = launchLessons.find((lesson) => lesson.id === 'lesson-12-graduation-show')

if (lesson12) {
  lesson12.title = '一起找到小礼物'
  lesson12.goal = '完成启蒙毕业作品，让两个角色先后出场，最后一起找到目标。'
  lesson12.steps = [
    {
      id: 'step-1',
      title: '看看今天的毕业故事',
      instruction: '今天我们要把两位朋友的动作接成一个完整故事，一起找到舞台上的小礼物。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start'],
    },
    {
      id: 'step-2',
      title: '让第一位朋友先出场',
      instruction: '先安排第一位朋友走上舞台，带着故事开始。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right'],
    },
    {
      id: 'step-3',
      title: '让第二位朋友跟着出场',
      instruction: '切换到第二位朋友，再让它也走上舞台，和第一位朋友汇合。',
      allowedBlocks: ['when_start', 'move_right', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
    {
      id: 'step-4',
      title: '让两个朋友一起找到目标',
      instruction: '把两位朋友的动作顺序接完整，让他们一起靠近小礼物。',
      allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
    {
      id: 'step-5',
      title: '回看我的启蒙毕业作品',
      instruction: '点一下运行，看看两位朋友是不是已经一起找到小礼物，完成了毕业故事。',
      allowedBlocks: ['when_start', 'move_right', 'say_line', 'switch_character'],
      requiredBlockTypes: ['when_start', 'move_right', 'switch_character'],
    },
  ]
  lesson12.parentAdvice = '和孩子一起回看毕业作品，问一问哪位朋友先出场，他们又是怎样一起找到小礼物的。'
}
