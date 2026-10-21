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
/** Lessons 07–09: the butterfly flies, so its blocks say “向右飞 100 步” / “重复：再飞 100 步”. */
const FLY = quoteBlock('move_right', 'fly')
const FLY_NAME = getKidsBlockLabel('move_right', 'fly')
const FLY_REPEAT = quoteBlock('repeat_twice', 'fly')

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
  '先让狐狸移动，再切换并移动小熊，把“说一句话”接在切换之后。最后的作品关可以给狐狸另加问候。',
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
      // TQ-011: the three “只放开始时” steps (same goal, re-run) are merged into one.
      step('step-1', '认识小狐狸和开始积木', '先看看今天的小狐狸。放一块“开始时”，按运行看看：只有“开始时”，小狐狸会走吗？', ['when_start'], ['when_start']),
      step('step-2', '接上移动积木', `把${MOVE}接在“开始时”下面，让小狐狸向右走 100 步、走上舞台。`, ['when_start', 'move_right'], ['when_start', 'move_right']),
      // TQ-011: second practice with a different goal (practice-steps.ts) — change the distance, predict the stop.
      step('step-3', '新练习：走到小兔子身边', `小兔子在更远的地方等小狐狸。先猜一猜接两块${MOVE}小狐狸会停在哪里，再接上第二块，按运行看看。`, ['when_start', 'move_right'], ['when_start', 'move_right', 'move_right']),
      // TQ-010: designed mistake step (mistake-steps.ts) — a pre-built program without “开始时”.
      step('step-4', '少了开始？找错再修好', `积木区有一段少了“开始时”的程序。先运行看看小狐狸会不会出场，再把“开始时”放到${MOVE}上面修好它。`, ['when_start', 'move_right'], ['when_start', 'move_right']),
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
    parentAdvice: '请孩子演示一下，小狐狸是怎么向右走 100 步出场的；再问问：接两块移动积木，小狐狸会停在哪里？',
  },
  {
    id: 'lesson-02-forest-greeting',
    templateId: 'forest-meetup-stage',
    title: '小狐狸打招呼',
    goal: '让小狐狸出场后说一句欢迎的话。',
    recommendedLevel: 'starter',
    steps: [
      // TQ-011: “回顾出场” and “认识说话积木” had the same goal; merged.
      step('step-1', '先让小狐狸出场', `先接好“开始时”和${MOVE}，让小狐狸走上舞台。等会儿我们要用“说一句话”让它打招呼。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right']),
      // TQ-011: the preset line choice (old 第 5 关, same program as the mistake fix) now lives in the main build.
      step('step-2', '出场后说一句欢迎话', '把“说一句话”接在移动后面，在“选一句对白”里挑一句你喜欢的话，再运行：小狐狸先出场，再说出你选的那句。', ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
      // TQ-011: second practice — no move block, predict where the fox talks.
      step('step-3', '新练习：站在原地打招呼', '这次小狐狸不走路。先猜一猜它会在哪里说话，再点「清空积木重拼」，只拼“开始时”和“说一句话”，按运行看看。', ['when_start', 'move_right', 'say_line'], ['when_start', 'say_line']),
      // TQ-010: designed mistake step — the pre-built program speaks before walking.
      step('step-4', '先说后走？找错再修好', `积木区摆了一段顺序反了的程序：小狐狸会先说话再出场。先运行看看，再把“说一句话”挪到${MOVE}后面。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
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
    goal: '让小狐狸走到小兔子身边再打招呼，完成第一次见面的完整小故事。',
    recommendedLevel: 'starter',
    steps: [
      // TQ-011: lesson 3 no longer repeats lesson 2 block for block — the fox walks all the way to the rabbit.
      step('step-1', '先走到小兔子身边', `接好“开始时”和两块${MOVE}，让小狐狸走 200 步，来到小兔子身边。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'move_right']),
      step('step-2', '走到了，再打招呼', `在第二块${MOVE}后面接“说一句话”：小狐狸走到小兔子身边，再打招呼。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'move_right', 'say_line']),
      // TQ-011: second practice — same blocks in another order, compare the result.
      step('step-3', '新练习：边走边打招呼', `把“说一句话”挪到两块${MOVE}中间，按运行，再和上一关比一比哪里不一样。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line', 'move_right']),
      // TQ-010: designed mistake step — the story greets before the fox walks to the rabbit.
      step('step-4', '故事顺序乱了？找错再修好', `积木区摆了一段顺序乱了的小故事：小狐狸还没走到小兔子身边就先打招呼。先运行看看，再把“说一句话”挪到两块${MOVE}后面。`, ['when_start', 'move_right', 'say_line'], ['when_start', 'move_right', 'move_right', 'say_line']),
    ],
    rewardCardId: 'growth-first-project',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 3,
    hintLayers: buildHintLayers(
      '先让小狐狸走到小兔子身边，再让它开口打招呼。',
      `走到小兔子身边要两块${MOVE}，“说一句话”接在最后。`,
      '先看一下顺序示意，再回来把故事接完整。',
      'remedial-start-sequence',
    ),
    templateId: 'forest-meetup-stage',
    parentAdvice: '和孩子一起回看第一次见面的故事，问问他：小狐狸走到哪里才打招呼？把说话挪到半路，故事有什么不一样？',
  },
  {
    id: 'lesson-04-meadow-scene',
    title: '从森林走到草地',
    goal: '学会把故事从一个场景切换到另一个场景。',
    recommendedLevel: 'starter',
    steps: [
      // TQ-011: “看看两个画面 / 森林开场 / 认识切换场景” were the same program; merged.
      step('step-1', '先在森林出发', `今天的故事有森林和草地两个画面。先接好“开始时”和${MOVE}，让小狐狸在森林里出发。`, ['when_start', 'move_right'], ['when_start', 'move_right']),
      step('step-2', '走完换到草地', `把“切换场景”接在${MOVE}后面：小狐狸在森林走 100 步，故事再来到草地。`, ['when_start', 'move_right', 'switch_scene'], ['when_start', 'move_right', 'switch_scene']),
      // TQ-011: second practice — walk further before the switch, predict where the scene changes.
      step('step-3', '新练习：在森林多走一会儿', `这次在“切换场景”上面放两块${MOVE}。先猜一猜小狐狸在森林里走多少步才到草地，再拼好、按运行看看。`, ['when_start', 'move_right', 'switch_scene'], ['when_start', 'move_right', 'move_right', 'switch_scene']),
      // TQ-010: designed mistake step — the pre-built program switches scene before walking.
      step('step-4', '先换场景？找错再修好', `积木区摆了一段顺序反了的程序：还没出发就换到草地。先运行看看，再把“切换场景”挪到${MOVE}后面。`, ['when_start', 'move_right', 'switch_scene'], ['when_start', 'move_right', 'switch_scene']),
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
    parentAdvice: '请孩子指给你看，是哪一块积木让故事从森林换到了草地；把它往后挪，小狐狸会在森林里多走多远？',
  },
  {
    id: 'lesson-05-meadow-order',
    title: '旅行要按顺序发生',
    goal: '让故事按顺序发生：先在森林出发，再到草地，到了草地再走 100 步。',
    recommendedLevel: 'starter',
    steps: [
      // TQ-011: the review steps are merged into one warm-up.
      step('step-1', '回顾出发和到达', `接好“开始时”、${MOVE}和“切换场景”：小狐狸在森林走 100 步，再来到草地。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice'], ['when_start', 'move_right', 'switch_scene']),
      step('step-2', '到草地后再走 100 步', `在“切换场景”后面接${REPEAT}，它会把移动再做一次，让小狐狸到草地后再走 100 步。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice']),
      // TQ-011: second practice — no scene switch, predict where the repeat takes the fox.
      step('step-3', '新练习：不换场景，走到小鸟身边', `这次不去草地：点「清空积木重拼」，拼成“开始时 → ${MOVE_NAME} → ${REPEAT_NAME}”。先猜一猜小狐狸停在哪里，再按运行看看。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice'], ['when_start', 'move_right', 'repeat_twice']),
      // TQ-010: designed mistake step — the repeat block sits before any move.
      step('step-4', '重复放早了？找错再修好', `积木区摆了一段${REPEAT}放在最前面的程序。先运行看看小狐狸会不会走，再把它挪到“切换场景”后面，让小狐狸一共走 200 步。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice']),
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
    goal: '把出发、转场、再走 100 步和一句话连成旅行故事，再比一比在森林和草地说话有什么不同，完成第二个完整小故事。',
    recommendedLevel: 'starter',
    steps: [
      // TQ-011: the three warm-up steps rebuilt lesson 5 one block at a time; merged into one review.
      step('step-1', '回顾旅行路线', `先拼出上节课的旅行：“开始时 → ${MOVE_NAME} → 切换场景 → ${REPEAT_NAME}”。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice']),
      step('step-2', '到草地后说一句感受', '在最后接一块“说一句话”：小狐狸到草地走完 200 步，再说出旅行感受。', ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line']),
      // TQ-011: second practice — speak in the forest instead, compare what the fox says.
      step('step-3', '新练习：在森林里先说一句', '把“说一句话”挪到“切换场景”前面，按运行，再和上一关比一比：小狐狸说的话一样吗？', ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice']),
      // TQ-010: designed mistake step — the scene switch comes after both moves.
      step('step-4', '换场景太晚？找错再修好', `积木区摆了一段“切换场景”放晚了的程序。先运行看看小狐狸在哪里走过头，再把“切换场景”挪到${MOVE}和${REPEAT}中间。`, ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'], ['when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line']),
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
    parentAdvice: '和孩子一起回看旅行故事，问问孩子：小狐狸在森林里说话和到草地再说话，说的话一样吗？',
  },
  {
    id: 'lesson-07-garden-click',
    templateId: 'garden-interaction-stage',
    title: '点一下，蝴蝶飞起来',
    goal: '学会让蝴蝶在被点击时做出反应：点到它，它才向右飞 100 步。',
    recommendedLevel: 'foundation',
    steps: [
      step('step-1', '认识今天的新规则', '今天蝴蝶不会一开始就自己动，要等你点到它，它才会回应你。先放“被点击时”，启动后点一下蝴蝶。', ['when_clicked'], ['when_clicked']),
      step('step-2', '让蝴蝶回应一次点击', `先把“被点击时”放在最前面，再接上${FLY}，让蝴蝶被点到后向右飞 100 步。`, ['when_clicked', 'move_right'], ['when_clicked', 'move_right']),
      // TQ-011: second practice (replaces two re-runs of the same click program) — predict the stop.
      step('step-3', '新练习：点一下，飞到小青蛙身边', `小青蛙在更远的地方。先猜一猜接两块${FLY}蝴蝶会停在哪里，再接上第二块，启动后点一下蝴蝶看看。`, ['when_clicked', 'move_right'], ['when_clicked', 'move_right', 'move_right']),
      // TQ-010: designed mistake step — “开始时” makes the butterfly fly without a click.
      step('step-4', '没点就飞？找错再修好', '积木区摆了一段用“开始时”开头的程序。先启动看看：没点蝴蝶，它会不会自己飞？再把开头换成“被点击时”，点一下蝴蝶验证。', ['when_start', 'when_clicked', 'move_right'], ['when_clicked', 'move_right']),
    ],
    rewardCardId: 'theme-garden-butterfly',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 7,
    hintLayers: buildHintLayers(
      '先放好“被点击时”，再让蝴蝶做动作。',
      `把“被点击时”放在最前面，再把${FLY}接在后面。`,
      '先看一下点到蝴蝶后才会开始动作的小示意。',
      'remedial-click-trigger',
    ),
    parentAdvice: '请孩子演示一下点哪里会发生变化，再说说蝴蝶为什么会飞起来。',
  },
  {
    id: 'lesson-08-garden-dialogue',
    templateId: 'garden-interaction-stage',
    title: '点一下，再说一句话',
    goal: '让蝴蝶在点击后先飞起来，再说一句话回应你；再比一比“开始时”和“被点击时”有什么不同。',
    recommendedLevel: 'foundation',
    steps: [
      // TQ-011: “回顾 / 准备点击开关 / 点一下先动起来” merged into one warm-up.
      step('step-1', '回顾：点一下就飞', `先把“被点击时”放在最前面，再接${FLY}：点一下蝴蝶，它向右飞 100 步。`, ['when_clicked', 'move_right', 'say_line'], ['when_clicked', 'move_right']),
      step('step-2', '飞完再回应你', `在${FLY}后面接一块“说一句话”：点一下蝴蝶，它先飞，再回应你。`, ['when_clicked', 'move_right', 'say_line'], ['when_clicked', 'move_right', 'say_line']),
      // TQ-011: second practice — swap the start event and compare (lesson 8 no longer just moves lesson 2 under a click).
      step('step-3', '新练习：换成“开始时”比一比', `点「清空积木重拼」，把开头换成“开始时”：拼成“开始时 → ${FLY_NAME} → 说一句话”，按运行，再和上一关比一比。`, ['when_start', 'when_clicked', 'move_right', 'say_line'], ['when_start', 'move_right', 'say_line']),
      // TQ-010: designed mistake step — the butterfly speaks before it flies.
      step('step-4', '先说后飞？找错再修好', `积木区摆了一段蝴蝶先说话再飞的程序。启动并点一下蝴蝶看看，再把“说一句话”挪到${FLY}后面。`, ['when_clicked', 'move_right', 'say_line'], ['when_clicked', 'move_right', 'say_line']),
    ],
    rewardCardId: 'growth-garden-response',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 8,
    hintLayers: buildHintLayers(
      '先让蝴蝶在点击后飞起来，再接一句回应的话。',
      `顺序要是“被点击时 → ${FLY_NAME} → 说一句话”。`,
      '先看一下“点一下，先飞再说”的小示意。',
      'remedial-click-trigger',
    ),
    // TQ-011: the old “试试不同的点法” had no matching ability in the classroom.
    parentAdvice: '请孩子演示“开始时”和“被点击时”的区别：哪一个会等你点蝴蝶？蝴蝶说的话有什么不同？',
  },
  {
    id: 'lesson-09-garden-story',
    title: '花园里的互动表演',
    goal: '完成一个点一下就会有反应的互动故事。',
    recommendedLevel: 'foundation',
    steps: [
      // TQ-011: “看看今天 / 搭好互动开关 / 先飞起来” merged into one warm-up.
      step('step-1', '搭好互动开关，点一下就飞', `先把“被点击时”放在最前面，再接${FLY}，告诉蝴蝶什么时候开始表演。`, ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], ['when_clicked', 'move_right']),
      step('step-2', '飞一段，回应你，再飞一段', `在${FLY}后面接“说一句话”，再接${FLY_REPEAT}：点一下蝴蝶，它飞 100 步就回应你，再接着飞 100 步。`, ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], ['when_clicked', 'move_right', 'say_line', 'repeat_twice']),
      // TQ-011: second practice — reply after both flights, compare when the butterfly answers.
      step('step-3', '新练习：飞完两段再回应', `把“说一句话”挪到${FLY_REPEAT}后面，启动并点一下蝴蝶，再和上一关比一比哪里不一样。`, ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], ['when_clicked', 'move_right', 'repeat_twice', 'say_line']),
      // TQ-010: designed mistake step — the reply comes before the butterfly flies twice.
      step('step-4', '回应太早？找错再修好', `积木区摆了一段蝴蝶先说话、再飞两次的程序。启动并点一下蝴蝶看看；再把“说一句话”挪到飞的积木后面，让蝴蝶一共飞两次、飞 200 步，飞完第一次或两次后再回应你。`, ['when_clicked', 'move_right', 'say_line', 'repeat_twice'], ['when_clicked', 'move_right', 'say_line', 'repeat_twice']),
    ],
    rewardCardId: 'theme-garden-story',
    phase: 'trial',
    mode: 'guided',
    sortOrder: 9,
    hintLayers: buildHintLayers(
      '先把点击开关放好，再接飞的积木、回应的话和再飞 100 步。',
      `“被点击时”放在最前面，再接${FLY}、“说一句话”和${FLY_REPEAT}；看看这一关要蝴蝶飞到哪里再回应你。`,
      '先看一下完整互动故事的顺序，再回来把自己的表演接完。',
      'remedial-click-trigger',
    ),
    templateId: 'garden-interaction-stage',
    parentAdvice: '请孩子给你演示一遍互动故事，再告诉你点哪里会触发变化；把“说一句话”挪到最后，蝴蝶回应你的时候有什么不一样？',
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
      step('step-1', '观察与预测：谁会开口', '两位朋友从各自 0 步起点准备出发。猜一猜切换到小熊后，说话积木让谁开口；添加“开始时”并运行，观察起点。', ['when_start'], ['when_start']),
      step('step-2', '回顾独立移动', '让小狐狸走 100 步，再切换并让小熊走 100 步。这一关先不说话，观察两条轨道各自的位置。', ['when_start', 'move_right', 'switch_character'], ['when_start', 'move_right', 'switch_character', 'move_right']),
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
