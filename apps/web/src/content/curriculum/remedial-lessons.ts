import type { RemedialLessonDefinition } from '@/features/domain/types'
import { getKidsBlockLabel, quoteBlock } from '@/features/lessons/blockly/block-labels'

/**
 * Tier-3 remedials (TQ-008). Each one reviews exactly the concept of the unit that routes to it
 * (see features/lessons/remedial-routing.ts) and has one small hands-on practice.
 */
export const remedialLessons: RemedialLessonDefinition[] = [
  {
    id: 'remedial-start-sequence',
    title: '先学会“开始”和顺序',
    focus: '程序从开始积木出发，下面的积木一块接一块按顺序做。',
    returnToLessonId: 'lesson-01-forest-hello',
    returnToStepId: 'step-1',
    steps: [],
    keyPoints: [
      '“开始时”放在最上面，按“运行”后程序才出发。',
      '下面的积木从上往下，一块做完再做下一块。',
      `想让小狐狸先出场再说话，就把${quoteBlock('move_right')}放在“说一句话”上面。`,
    ],
    practice: {
      kind: 'order',
      prompt: '按顺序点一点：小狐狸先听到开始口令，再向右走 100 步走上舞台，最后打招呼。',
      cards: [
        { type: 'when_start', label: getKidsBlockLabel('when_start') },
        { type: 'move_right', label: getKidsBlockLabel('move_right') },
        { type: 'say_line', label: getKidsBlockLabel('say_line') },
      ],
      displayOrder: [2, 0, 1],
      success: '排好啦！开始 → 移动 → 说话，小狐狸会先出场再打招呼。',
    },
  },
  {
    id: 'remedial-scene-switch',
    title: '先学会按顺序换场景',
    focus: '先在森林出发，再用“切换场景”把故事带到草地。',
    returnToLessonId: 'lesson-04-meadow-scene',
    returnToStepId: 'step-1',
    steps: [],
    keyPoints: [
      '“切换场景”放在哪里，故事就在哪里换到草地。',
      '先在森林走 100 步，再切换，小狐狸才是“从森林出发”。',
      `${quoteBlock('repeat_twice')}会把移动再做一次，要放在移动后面。`,
    ],
    practice: {
      kind: 'order',
      prompt: '按顺序点一点：先听到开始口令，在森林走 100 步，再换到草地。',
      cards: [
        { type: 'when_start', label: getKidsBlockLabel('when_start') },
        { type: 'move_right', label: getKidsBlockLabel('move_right') },
        { type: 'switch_scene', label: getKidsBlockLabel('switch_scene') },
      ],
      displayOrder: [1, 2, 0],
      success: '排好啦！先在森林走 100 步，再切换场景，故事就来到草地了。',
    },
  },
  {
    id: 'remedial-click-trigger',
    title: '先学会点击触发',
    focus: '用“被点击时”开头的程序，要等你点到蝴蝶才开始。',
    returnToLessonId: 'lesson-07-garden-click',
    returnToStepId: 'step-1',
    steps: [],
    keyPoints: [
      '“被点击时”开头的程序，按启动后会先等着。',
      '只有你点到蝴蝶，下面的积木才开始做。',
    ],
    practice: {
      kind: 'click',
      prompt: '先按“启动”，再看看蝴蝶会不会自己飞；然后亲手点一下蝴蝶。',
      success: '你点到它，它才飞起来！这就是“被点击时”。',
    },
  },
]
