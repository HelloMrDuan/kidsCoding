import type {
  LaunchLessonDefinition,
  ProjectTemplateDefinition,
} from '@/features/domain/types'

import { getKidsBlockLabel, quoteBlock } from '@/features/lessons/blockly/block-labels'

import { applyFoundationVoiceovers } from './foundation-voiceovers'

/** TQ-009: copy quotes block names from the same labels the blocks show. */
const MOVE = quoteBlock('move_right')
const REPEAT = quoteBlock('repeat_twice')
const MOVE_NAME = getKidsBlockLabel('move_right')
const REPEAT_NAME = getKidsBlockLabel('repeat_twice')

/** TQ-003: one source for the duo lessons' three hint layers (classroom feedback + duo stage). */
export const duoLessonHints = {
  'lesson-10-second-friend': [
  '看看两条轨道：谁走过了头？谁还在起点？',
  '每个角色有自己的位置。移动积木只交给当前操作的朋友，不会让大家一起走。',
  '先开始 → 小狐狸移动 → 切换到另一位朋友 → 小熊移动。删掉多余移动，在两次移动中间插入切换。',
],
  'lesson-11-duo-rehearsal': [
  '看看谁头上出现了对白：小熊说出目标的话了吗？',
  '每个角色有自己的对白。说话和移动一样，只作用于当前操作的朋友。',
  '先让狐狸移动，再切换并移动小熊，把“说一句话”接在切换之后。作品步骤可以给狐狸另加问候。',
],
  'lesson-12-graduation-show': [
  '看看小熊的距离：只走 100 步，离 200 步的礼物还差多远？',
  `${REPEAT}只重复当前角色的移动，再走 100 步；狐狸的位置不会跟着改变。`,
  `开始 → 狐狸移动 → 切换 → 小熊移动 → ${REPEAT}。也可以用第二块小熊移动到达 200 步。`,
],
} as const satisfies Record<string, readonly [string, string, string]>

function buildHintLayers(
  repeatGoal: string,
  showBlock: string,
  remedialCopy: string,
  /** TQ-008: the remedial that teaches this lesson's unit concept (see remedial-routing.ts). */
  remedialLessonId = 'remedial-click-trigger',
) {
  return [
    { id: 'repeat-goal', mode: 'repeat_goal' as const, copy: repeatGoal },
    { id: 'show-block', mode: 'show_block' as const, copy: showBlock },
    {
      id: 'offer-remedial',
      mode: 'offer_remedial' as const,
      copy: remedialCopy,
      remedialLessonId,
    },
  ]
}

function step(
  id: string,
  title: string,
  instruction: string,
  allowedBlocks: string[],
  requiredBlockTypes: string[],
) {
  return { id, title, instruction, allowedBlocks, requiredBlockTypes }
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
    templateId: 'forest-meetup-stage',
    title: '小狐狸出场',
    goal: '让小狐狸向右走 100 步，完成第一次出场。',
    recommendedLevel: 'starter',
    steps: [
      step('step-1', '认识今天的主角', '先看看今天的小狐狸，等会儿我们要让它自己走上舞台。', ['when_start'], ['when_start']),
      step('step-2', '认识开始积木', '先放“开始时”，告诉小狐狸什么时候准备出场。', ['when_start'], ['when_start']),
      step('step-3', '让舞台准备好', '确认“开始时”放在最前面，舞台就准备好了。', ['when_start'], ['when_start']),
      step('step-4', '接上移动积木', `把${MOVE}接在后面，让小狐狸向右走 100 步、走上舞台。`, ['when_start', 'move_right'], ['when_start', 'move_right']),
      step('step-5', '回看第一次出场', '点一下运行，看看小狐狸是不是向右走了 100 步，顺利出场了。', ['when_start', 'move_right'], ['when_start', 'move_right']),
    ],
    rewardCardId: 'theme-forest-fox',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 1,
    hintLayers: buildHintLayers(
      '先让小狐狸准备好出场，再接动作积木。',
      `把“开始时”放在最前面，再把${MOVE}接上去。`,
      '先看一个很短的示意，再回来试一次。',
      'remedial-start-sequence',
    ),
    parentAdvice: '请孩子演示一下，小狐狸是怎么向右走 100 步出场的。',
  },
  {
    id: 'lesson-02-forest-greeting',
    templateId: 'forest-meetup-stage',
    title: '小狐狸打招呼',
    goal: '让小狐狸出场后说一句欢迎的话。',
    recommendedLevel: 'starter',
    steps: [
      step('step-1', '先回顾小狐狸出场', `先接好“开始时”和${MOVE}，让小狐狸先走上舞台。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right']),
      step('step-2', '认识说话积木', '这块“说一句话”积木会让小狐狸在出场后开口打招呼。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right']),
      step('step-3', '出场后接一句欢迎话', '把“说一句话”接在移动后面，让小狐狸先出场，再打招呼。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
      step('step-4', '调整顺序更自然', '确认顺序是先出场，再说话，这样故事会更自然。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
      step('step-5', '换一句自己的话', '在“选一句对白”里挑一句你喜欢的话，再运行：小狐狸先出场，再说出你选的那句。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
    ],
    rewardCardId: 'theme-forest-rabbit',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 2,
    hintLayers: buildHintLayers(
      '先让小狐狸出场，再在后面接上一句欢迎话。',
      `顺序要是“开始时 → ${MOVE_NAME} → 说一句话”。`,
      '先看一下“先出场，再说话”的小示意。',
      'remedial-start-sequence',
    ),
    parentAdvice: '让孩子给你演示一下，小狐狸是先出场，还是先说话，再一起从预设对白里换一句试试。',
  },
  {
    id: 'lesson-03-forest-story',
    title: '森林里的第一次见面',
    goal: '把动作和对白连起来，完成第一个完整小故事。',
    recommendedLevel: 'starter',
    steps: [
      step('step-1', '看看今天要完成什么', '今天我们要把小狐狸的第一次见面做成一个完整小故事。', ['when_start'], ['when_start']),
      step('step-2', '先让小狐狸出场', `先接好“开始时”和${MOVE}，让小狐狸走上舞台。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right']),
      step('step-3', '再让小狐狸打招呼', '在移动后面接一块“说一句话”，让小狐狸出场后打招呼。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
      step('step-4', '调整顺序让故事完整', '确认小狐狸是先出场，再说话，这样故事会更自然。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
      step('step-5', '回看第一个完整小故事', '点一下运行，看看小狐狸是不是已经做出了第一个完整故事。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
    ],
    rewardCardId: 'growth-first-project',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 3,
    hintLayers: buildHintLayers(
      '先让小狐狸出场，再让它开口打招呼。',
      `顺序要是“开始时 → ${MOVE_NAME} → 说一句话”。`,
      '先看一下顺序示意，再回来把故事接完整。',
      'remedial-start-sequence',
    ),
    templateId: 'forest-meetup-stage',
    parentAdvice: '和孩子一起回看第一个作品，问问他先看到什么、又听到了什么。',
  },
  {
    id: 'lesson-04-meadow-scene',
    title: '从森林走到草地',
    goal: '学会把故事从一个场景切换到另一个场景。',
    recommendedLevel: 'starter',
    steps: [
      step('step-1', '先看看两个画面', '先认识森林和草地两个画面，等会儿我们要让故事换一个地方。', ['when_start'], ['when_start']),
      step('step-2', '先把森林里的开场接好', `先接好“开始时”和${MOVE}，让小狐狸从森林里出发。`, ['when_start', 'move_right'], ['when_start', 'move_right']),
      step('step-3', '认识切换场景积木', '这块“切换场景”积木可以让故事从森林换到草地。', ['when_start', 'move_right', 'switch_scene'], ['when_start', 'move_right']),
      step('step-4', '接上草地场景', '把“切换场景”接在后面，让故事真的来到草地。', ['when_start', 'move_right', 'switch_scene'], ['when_start', 'move_right', 'switch_scene']),
      step('step-5', '回看第一次转场', '点一下运行，看看故事是不是已经从森林走到草地了。', ['when_start', 'move_right', 'switch_scene'], ['when_start', 'move_right', 'switch_scene']),
    ],
    rewardCardId: 'theme-meadow-bird',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 4,
    hintLayers: buildHintLayers(
      '先把森林里的开场接好，再把场景切到草地。',
      `顺序是“开始时 → ${MOVE_NAME} → 切换场景”。`,
      '先看一下故事怎么从森林走到草地，再回来试一次。',
      'remedial-scene-switch',
    ),
    templateId: 'meadow-journey-stage',
    parentAdvice: '请孩子指给你看，是哪一块积木让故事从森林换到了草地，小狐狸是走完 100 步才换的吗？',
  },
  {
    id: 'lesson-05-meadow-order',
    title: '旅行要按顺序发生',
    goal: '让故事按顺序发生：先在森林出发，再到草地，到了草地再走 100 步。',
    recommendedLevel: 'starter',
    steps: [
      step('step-1', '回顾上节的转场', '先看一眼故事怎么从森林走到草地，今天我们要让它更有先后顺序。', ['when_start'], ['when_start']),
      step('step-2', '先安排出发', `先让小狐狸从森林里出发：接好“开始时”和${MOVE}。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right']),
      step('step-3', '再安排到达', '接上“切换场景”，让小狐狸来到草地。', ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene']),
      step('step-4', '到草地后再走 100 步', `在“切换场景”后面接${REPEAT}，它会把移动再做一次，让小狐狸到草地后再走 100 步。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice']),
      step('step-5', '顺序排完整', '再运行一次，看看是不是先出发、再到草地、再走 100 步，一共走了 200 步。', ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice']),
    ],
    rewardCardId: 'growth-meadow-order',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 5,
    hintLayers: buildHintLayers(
      '先安排出发，再安排到达，到了草地后再走 100 步。',
      `顺序要是“开始时 → ${MOVE_NAME} → 切换场景 → ${REPEAT_NAME}”。`,
      '先看一下顺序示意，再回来把旅行接完整。',
      'remedial-scene-switch',
    ),
    templateId: 'meadow-journey-stage',
    parentAdvice: '让孩子按顺序说一遍：先从森林出发，再到草地，最后又走了 100 步。问问孩子：那块重复积木重复的是哪个动作？',
  },
  {
    id: 'lesson-06-meadow-story',
    title: '小动物旅行记',
    goal: '把动作、转场和对白连起来，完成第二个完整小故事。',
    recommendedLevel: 'starter',
    steps: [
      step('step-1', '看看今天的旅行故事', '今天我们要把出发、转场和旅行感受接起来，做成第二个完整小故事。', ['when_start'], ['when_start']),
      step('step-2', '让小狐狸先出发', `先接好“开始时”和${MOVE}，让小狐狸从森林里出发。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right']),
      step('step-3', '让故事走到新场景', '把“切换场景”接上去，让故事来到草地。', ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene']),
      step('step-4', '到草地后再走 100 步，再说一句感受', `先接${REPEAT}，再接一块“说一句话”说出旅行感受，让故事更像真的完成了一次小旅行。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line']),
      step('step-5', '回看我的旅行故事', '点一下运行，看看小狐狸是不是已经出发、转场、又走了 100 步，还说出了旅行感受。', ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line']),
    ],
    rewardCardId: 'theme-meadow-story',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 6,
    hintLayers: buildHintLayers(
      '先让小狐狸出发，再转到草地，到了草地后再走 100 步，最后再说一句旅行感受。',
      `把出发、转场、${REPEAT}和收尾的“说一句话”都接好，旅行故事就完整了。`,
      '先看一下完整旅行故事的顺序，再回来把自己的故事接完。',
      'remedial-scene-switch',
    ),
    templateId: 'meadow-journey-stage',
    parentAdvice: '和孩子一起回看旅行故事，问问孩子小狐狸先在哪里、后来到了哪里、到了草地后又做了什么。',
  },
  {
    id: 'lesson-07-garden-click',
    templateId: 'garden-interaction-stage',
    title: '点一下，蝴蝶飞起来',
    goal: '学会让蝴蝶在被点击时做出反应：点到它，它才向右飞 100 步。',
    recommendedLevel: 'foundation',
    steps: [
      step('step-1', '认识今天的新规则', '今天蝴蝶不会一开始就自己动，要等你点到它，它才会回应你。', ['when_clicked'], ['when_clicked']),
      step('step-2', '先让蝴蝶回应一次点击', `先把“被点击时”放在最前面，再接上${MOVE}，让蝴蝶被点到后向右飞 100 步。`, ['when_clicked', 'move_right'], ['when_clicked', 'move_right']),
      step('step-3', '再确认只有点到时才会动', '点一下蝴蝶，再看看它是不是只有被点到后才开始飞。', ['when_clicked', 'move_right'], ['when_clicked', 'move_right']),
      step('step-4', '把点击和飞起来接完整', `确认顺序是“被点击时”在前面，${MOVE}在后面。`, ['when_clicked', 'move_right'], ['when_clicked', 'move_right']),
      step('step-5', '试试点一下会发生什么', '点一下蝴蝶，看看它是不是已经会立刻飞起来了。', ['when_clicked', 'move_right'], ['when_clicked', 'move_right']),
    ],
    rewardCardId: 'theme-garden-butterfly',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 7,
    hintLayers: buildHintLayers(
      '先放好“被点击时”，再让蝴蝶做动作。',
      `把“被点击时”放在最前面，再把${MOVE}接在后面。`,
      '先看一下点到蝴蝶后才会开始动作的小示意。',
      'remedial-click-trigger',
    ),
    parentAdvice: '请孩子演示一下点哪里会发生变化，再说说蝴蝶为什么会飞起来。',
  },
  {
    id: 'lesson-08-garden-dialogue',
    templateId: 'garden-interaction-stage',
    title: '点一下，再说一句话',
    goal: '让蝴蝶在点击后先飞起来，再说一句话回应你。',
    recommendedLevel: 'foundation',
    steps: [
      step('step-1', '回顾上节的互动动作', '先想一想：点一下蝴蝶后，它是不是先飞起来了？今天我们要让它再说一句话。', ['when_clicked'], ['when_clicked']),
      step('step-2', '先准备点击开关', '先把“被点击时”放在最前面，让蝴蝶准备好回应点击。', ['when_clicked'], ['when_clicked']),
      step('step-3', '点一下先动起来', `把${MOVE}接在后面，让蝴蝶被点到后先向右飞 100 步。`, ['when_clicked', 'move_right', 'say_line'], ['when_clicked', 'move_right']),
      step('step-4', '再接一句回应的话', '在移动后面接一块“说一句话”，让蝴蝶先飞再说。', ['when_clicked', 'move_right', 'say_line'], ['when_clicked', 'move_right', 'say_line']),
      step('step-5', '回看完整互动', '点一下蝴蝶，看看它是不是已经会先飞起来，再说一句话了。', ['when_clicked', 'move_right', 'say_line'], ['when_clicked', 'move_right', 'say_line']),
    ],
    rewardCardId: 'growth-garden-response',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 8,
    hintLayers: buildHintLayers(
      '先让蝴蝶在点击后飞起来，再接一句回应的话。',
      `顺序要是“被点击时 → ${MOVE_NAME} → 说一句话”。`,
      '先看一下“点一下，先飞再说”的小示意。',
      'remedial-click-trigger',
    ),
    parentAdvice: '和孩子一起试试不同的点法，看看蝴蝶会不会都做出相同反应。',
  },
  {
    id: 'lesson-09-garden-story',
    title: '花园里的互动表演',
    goal: '完成一个点一下就会有反应的互动故事。',
    recommendedLevel: 'foundation',
    steps: [
      step('step-1', '看看今天要完成什么', '今天我们要做一段完整的互动表演，让蝴蝶在花园里回应你的点击。', ['when_clicked'], ['when_clicked']),
      step('step-2', '先搭好互动开关', '先把“被点击时”放在最前面，告诉蝴蝶什么时候开始表演。', ['when_clicked'], ['when_clicked']),
      step('step-3', '点一下，蝴蝶先飞起来', `接上${MOVE}，让蝴蝶被点到后先向右飞 100 步。`, ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], ['when_clicked', 'move_right']),
      step('step-4', '再加上一句回应的话', '在移动后面接一块“说一句话”，让互动故事更完整。', ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], ['when_clicked', 'move_right', 'say_line']),
      step('step-5', '再飞一次，让互动更明显', `接上${REPEAT}，让蝴蝶被点一下后一共飞两次、飞 200 步。回应的话可以在飞完第一次后说，也可以飞完两次再说。`, ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], ['when_clicked', 'move_right', 'say_line', 'repeat_twice']),
    ],
    rewardCardId: 'theme-garden-story',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 9,
    hintLayers: buildHintLayers(
      '先把点击开关放好，再接动作、回应的话，最后让它再飞 100 步。',
      `可以是“被点击时 → ${MOVE_NAME} → 说一句话 → ${REPEAT_NAME}”，也可以是“被点击时 → ${MOVE_NAME} → ${REPEAT_NAME} → 说一句话”。`,
      '先看一下完整互动故事的顺序，再回来把自己的表演接完。',
      'remedial-click-trigger',
    ),
    templateId: 'garden-interaction-stage',
    parentAdvice: '请孩子给你演示一遍互动故事，再告诉你点哪里会触发变化，蝴蝶后来又多做了一次什么动作。',
  },
  {
    id: 'lesson-10-second-friend',
    title: '第二位朋友上场',
    goal: '让小狐狸先走 100 步，再切换到第二位朋友小熊，让它独立走 100 步，一起去野餐。',
    recommendedLevel: 'foundation',
    steps: [
      step('step-1', '观察起点，猜谁会移动', '两位朋友要分别走到野餐旗。观察两条轨道的 0 步起点，先猜切换后的移动给谁，再添加“开始时”并运行。', ['when_start'], ['when_start']),
      step('step-2', '只让小狐狸走', `接一块${MOVE}并运行。小狐狸要走 100 步，小熊要留在 0 步。你看见谁动了？`, ['when_start', 'move_right'], ['when_start', 'move_right']),
      step('step-3', '把操作权交给小熊', '在小狐狸的移动后接“切换到另一位朋友”，再接一块移动。运行时看操作标识，小熊走 100 步，小狐狸的位置保持不变。', ['when_start', 'move_right', 'switch_character'], ['when_start', 'move_right', 'switch_character', 'move_right']),
      step('step-4', '故意漏切换，再修好', '先亲自拼开始与两次移动，不放切换，运行观察错误。再清空，重新拼好两位朋友各走 100 步的程序。需要时逐层打开提示。', ['when_start', 'move_right', 'switch_character'], ['when_start', 'move_right', 'switch_character', 'move_right']),
      step('step-5', '制作野餐作品，讲讲原因', '保留两位朋友各走 100 步，或在切换前给小狐狸加一句问候。运行你的版本，再解释为什么两个角色不会一起运动。', ['when_start', 'move_right', 'switch_character', 'say_line'], ['when_start', 'move_right', 'switch_character', 'move_right']),
    ],
    rewardCardId: 'theme-duo-bear',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 10,
    hintLayers: buildHintLayers(...duoLessonHints['lesson-10-second-friend']),
    templateId: 'forest-graduation-show',
    parentAdvice: '请孩子演示漏切换时狐狸走 200 步、小熊不动，再修好为各走 100 步，并解释动作为什么只给当前角色。这里记录客户端练习，不代表认证掌握度。',
  },
  {
    id: 'lesson-11-duo-rehearsal',
    title: '两个朋友一起出发',
    goal: '让两个角色按顺序各走 100 步，再让小熊独立说“我们一起出发吧！”，做出可修改的出发排练作品。',
    recommendedLevel: 'foundation',
    steps: [
      step('step-1', '观察与预测：谁会开口', '两位朋友从各自 0 步起点准备出发。猜一猜切换到小熊后，说话积木让谁开口；添加开始并运行观察起点。', ['when_start'], ['when_start']),
      step('step-2', '回顾独立移动', '让小狐狸走 100 步，再切换并让小熊走 100 步。这一步先不说话，观察两条轨道各自的位置。', ['when_start', 'move_right', 'switch_character'], ['when_start', 'move_right', 'switch_character', 'move_right']),
      step('step-3', '只让小熊说出发对白', '在切换之后加入一块“说一句话”。运行观察：小熊说“我们一起出发吧！”，小狐狸的对白留空。两位朋友仍各走 100 步。', ['when_start', 'move_right', 'switch_character', 'say_line'], ['when_start', 'move_right', 'switch_character', 'move_right', 'say_line']),
      step('step-4', '把对白交错朋友，再修好', '先清空重拼，故意把说话放在切换前，再切换并移动小熊。运行观察狐狸开口而小熊沉默；再把说话移到切换之后并验证。', ['when_start', 'move_right', 'switch_character', 'say_line'], ['when_start', 'move_right', 'switch_character', 'move_right', 'say_line']),
      step('step-5', '改造排练，解释对白归属', '保留小熊出发对白，或者在切换前另加狐狸问候。运行你的版本，解释为什么小熊说话时狐狸不会跟着说，完成后重开修改作品。', ['when_start', 'move_right', 'switch_character', 'say_line'], ['when_start', 'move_right', 'switch_character', 'move_right', 'say_line']),
    ],
    rewardCardId: 'growth-duo-teamwork',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 11,
    hintLayers: buildHintLayers(...duoLessonHints['lesson-11-duo-rehearsal']),
    templateId: 'forest-graduation-show',
    parentAdvice: '请孩子演示对白放在切换前后的区别，再解释小熊的对白为什么不会让狐狸开口。完成作品可以在本机重开、修改和保存；这是练习，不是认证成绩。',
  },
  {
    id: 'lesson-12-graduation-show',
    title: '一起找到小礼物',
    goal: '完成启蒙毕业作品：小狐狸独立走 100 步，小熊走 200 步；两个目标都到位才找到礼物。',
    recommendedLevel: 'foundation',
    steps: [
      step('step-1', '观察起点，预测谁会再走', '两个朋友都在 0 步。狐狸守住 100 步路标，小熊去 200 步找礼物。预测切换后重复移动会交给谁，再用开始积木观察起点。', ['when_start', 'move_right', 'switch_character', 'repeat_twice', 'say_line'], ['when_start']),
      step('step-2', '狐狸先守住路标', '第一次动手：让狐狸走 100 步，小熊留在起点。运行后比较两条轨道。', ['when_start', 'move_right', 'switch_character', 'repeat_twice', 'say_line'], ['when_start', 'move_right']),
      step('step-3', '小熊再走一次寻找礼物', `第二次动手：切换到小熊，让它走 100 步后接${REPEAT}，走到 200 步。狐狸仍停在 100 步。也可以接两块小熊移动。`, ['when_start', 'move_right', 'switch_character', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_character', 'move_right', 'repeat_twice']),
      step('step-4', '少走一次，观察并修复', '先故意只让小熊走 100 步，运行并观察礼物为什么没有出现；再给小熊补上一次移动，重新验证。', ['when_start', 'move_right', 'switch_character', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_character', 'move_right', 'repeat_twice']),
      step('step-5', '改造并讲述毕业作品', '选择重复或两块移动方案，可以另加狐狸问候、小熊庆祝。运行后解释为什么重复只影响小熊，完成并保存可重开的本机作品。', ['when_start', 'move_right', 'switch_character', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_character', 'move_right', 'repeat_twice', 'say_line']),
    ],
    rewardCardId: 'commemorative-foundation-graduate',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 12,
    hintLayers: buildHintLayers(...duoLessonHints['lesson-12-graduation-show']),
    templateId: 'forest-graduation-show',
    parentAdvice: '请孩子演示重开作品，解释狐狸为什么停在 100 步、小熊怎样走到 200 步，并比较两种方案。',
  },
]

applyFoundationVoiceovers(launchLessons)
