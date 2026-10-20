import { getKidsBlockLabel, quoteBlock } from '@/features/lessons/blockly/block-labels'
import type { ProgramBlock } from '@/features/lessons/blockly/observable-run'

/**
 * TQ-011 (= TQ-002e): every Blockly lesson 01–09 has exactly ONE “second practice” step
 * whose GOAL differs from the lesson's main build — not the same program run again,
 * not the same program with one more block.
 *
 * Goal types (what the child does that the main build did not):
 * - change-distance: change how far the character goes and PREDICT where it stops
 *   (or where the scene changes / where it talks) before running.
 * - compare-orders: rebuild the same blocks in another order, run it, then say which
 *   result differs from the previous step.
 * - compare-events: swap the start event (“开始时” ↔ “被点击时”), run it, then say what
 *   is different.
 *
 * The step's program is judged by observable-run.ts like every other step (its reference
 * program is the step's requiredBlockTypes). The panel adds one question with preset
 * answers: a prediction before running (change-distance) or a comparison after a successful
 * run (compare-*). Kept in code (not the lesson payload) so a database copy of the curriculum
 * cannot drop it. Block names in copy come from block-labels.ts, the same source the blocks use.
 */
export type PracticeGoalType = 'change-distance' | 'compare-orders' | 'compare-events'

/** What the lesson's main build step teaches (never equal to a practice goal type). */
export type MainGoalType =
  | 'build-sequence'
  | 'add-say'
  | 'meet-story'
  | 'scene-switch'
  | 'repeat-move'
  | 'travel-story'
  | 'click-event'
  | 'click-reply'
  | 'click-story'

export type PracticeChoice = {
  id: string
  label: string
  correct: boolean
  /** What the child reads after picking this answer (predict: shown after the run). */
  reply: string
}

export type PracticeStepDesign = {
  lessonId: string
  stepId: string
  /** 0-based index of the step inside the lesson (unit-tested against launch-lessons). */
  stepIndex: number
  /** The lesson's main build step this practice differs from. */
  mainStepId: string
  mainGoalType: MainGoalType
  goalType: PracticeGoalType
  /** predict = choose a guess BEFORE running; compare = answer AFTER a successful run. */
  mode: 'predict' | 'compare'
  /** One correct program (equals the step's requiredBlockTypes; tests only). */
  referenceProgram: ProgramBlock[]
  title: string
  /** What to build and what to look at. */
  setup: string
  question: string
  choices: PracticeChoice[]
  /** Tier 1–2 hint for this step (the lesson-level hints describe the main build). */
  hint: string
  /** Shown once the step's conditions are met. */
  done: string
}

const MOVE = quoteBlock('move_right')
const MOVE_NAME = getKidsBlockLabel('move_right')
const REPEAT = quoteBlock('repeat_twice')
const REPEAT_NAME = getKidsBlockLabel('repeat_twice')
const FLY = quoteBlock('move_right', 'fly')
const FLY_NAME = getKidsBlockLabel('move_right', 'fly')
const FLY_REPEAT = quoteBlock('repeat_twice', 'fly')
const FLY_REPEAT_NAME = getKidsBlockLabel('repeat_twice', 'fly')

const p = (...types: string[]): ProgramBlock[] => types.map((type) => ({ type }))

/** How to rebuild in another order (same words as the mistake panel's fix copy). */
const REBUILD = '可以拖动积木，也可以点「清空积木重拼」重新拼。'

export const practiceSteps: readonly PracticeStepDesign[] = [
  {
    lessonId: 'lesson-01-forest-hello',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'build-sequence',
    goalType: 'change-distance',
    mode: 'predict',
    referenceProgram: p('when_start', 'move_right', 'move_right'),
    title: '新练习：走到小兔子身边',
    setup: `这次要走到小兔子身边。先猜一猜：“开始时”下面接两块${MOVE}，小狐狸会停在哪里？猜好了再接上第二块${MOVE}，按“运行”。`,
    question: `接两块${MOVE}，小狐狸会停在哪里？`,
    choices: [
      { id: 'half-way', label: '走 100 步，停在半路', correct: false, reply: '看看舞台：两块积木走了两次，小狐狸已走 200 步，站到了小兔子身边。' },
      { id: 'beside-friend', label: '走 200 步，站到小兔子身边', correct: true, reply: '猜对啦！一块走 100 步，两块就走 200 步。' },
    ],
    hint: `要走 200 步：在“开始时”下面接两块${MOVE}。`,
    done: '小狐狸走了 200 步，来到小兔子身边啦！',
  },
  {
    lessonId: 'lesson-02-forest-greeting',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'add-say',
    goalType: 'change-distance',
    mode: 'predict',
    referenceProgram: p('when_start', 'say_line'),
    title: '新练习：站在原地打招呼',
    setup: `这次小狐狸不走路，就在原地打招呼。先猜一猜：只有“开始时”和“说一句话”，小狐狸会在哪里说话？猜好了点「清空积木重拼」，只拼这两块，再按“运行”。`,
    question: '只有“开始时”和“说一句话”，小狐狸会在哪里说话？',
    choices: [
      { id: 'stay', label: '站在 0 步，原地说话', correct: true, reply: '猜对啦！没有移动积木，小狐狸就不走，站在原地开口。' },
      { id: 'walk-first', label: '先走 100 步再说话', correct: false, reply: '看看舞台：小狐狸已走 0 步，它没有走，就在原地说话。' },
    ],
    hint: `这一关不用${MOVE}：只拼“开始时”和“说一句话”。`,
    done: '小狐狸没有走路，站在原地打了招呼。每块积木只做自己的事！',
  },
  {
    lessonId: 'lesson-03-forest-story',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'meet-story',
    goalType: 'compare-orders',
    mode: 'compare',
    referenceProgram: p('when_start', 'move_right', 'say_line', 'move_right'),
    title: '新练习：边走边打招呼',
    setup: `这次让小狐狸走到半路就打招呼：拼成“开始时 → ${MOVE_NAME} → 说一句话 → ${MOVE_NAME}”，按“运行”，再和上一关比一比。${REBUILD}`,
    question: '和上一关比，哪里不一样？',
    choices: [
      { id: 'say-place', label: '说话的地方不一样：这次走到半路就说了', correct: true, reply: '对！两次都走到小兔子身边（200 步），这次在 100 步就开口了。积木换个顺序，故事就变了。' },
      { id: 'stop-place', label: '停下的地方不一样：这次没走到小兔子身边', correct: false, reply: '再看看舞台：小狐狸已走 200 步，还是站到了小兔子身边。不一样的是它开口的时候。' },
    ],
    hint: `顺序是“开始时 → ${MOVE_NAME} → 说一句话 → ${MOVE_NAME}”：“说一句话”夹在两块移动中间。`,
    done: '你发现啦：同样的积木，换个顺序，小狐狸开口的时候就不一样。',
  },
  {
    lessonId: 'lesson-04-meadow-scene',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'scene-switch',
    goalType: 'change-distance',
    mode: 'predict',
    referenceProgram: p('when_start', 'move_right', 'move_right', 'switch_scene'),
    title: '新练习：在森林多走一会儿',
    setup: `这次小狐狸想在森林里多走一会儿：要拼成“开始时 → ${MOVE_NAME} → ${MOVE_NAME} → 切换场景”。先猜一猜，再拼好、按“运行”。${REBUILD}`,
    question: '小狐狸在森林里走多少步，才换到草地？',
    choices: [
      { id: 'one-hundred', label: '走 100 步就到草地', correct: false, reply: '看看舞台：两块移动都在“切换场景”前面，小狐狸在森林里走了 200 步，才换到草地。' },
      { id: 'two-hundred', label: '走 200 步才到草地', correct: true, reply: '猜对啦！“切换场景”排在两块移动后面，小狐狸在森林走完 200 步才换到草地。' },
    ],
    hint: `两块${MOVE}都放在“切换场景”上面：先在森林走 200 步，再换到草地。`,
    done: '“切换场景”放在哪里，故事就在哪里换画面！',
  },
  {
    lessonId: 'lesson-05-meadow-order',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'repeat-move',
    goalType: 'change-distance',
    mode: 'predict',
    referenceProgram: p('when_start', 'move_right', 'repeat_twice'),
    title: '新练习：不换场景，走到小鸟身边',
    setup: `这次不去草地：要拼成“开始时 → ${MOVE_NAME} → ${REPEAT_NAME}”。先猜一猜小狐狸停在哪里，再点「清空积木重拼」拼好、按“运行”。`,
    question: `${MOVE}后面接${REPEAT}，小狐狸停在哪里？`,
    choices: [
      { id: 'beside-bird', label: '走 200 步，停在草地小鸟身边', correct: true, reply: '猜对啦！重复积木让小狐狸再走 100 步，一共 200 步，还在森林里。' },
      { id: 'stay-100', label: '只走 100 步', correct: false, reply: '看看舞台：重复积木又走了 100 步，小狐狸已走 200 步。' },
    ],
    hint: `这一关不用“切换场景”：${MOVE}后面直接接${REPEAT}。`,
    done: '没有“切换场景”，小狐狸就一直在森林里。重复积木让它多走了 100 步！',
  },
  {
    lessonId: 'lesson-06-meadow-story',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'travel-story',
    goalType: 'compare-orders',
    mode: 'compare',
    referenceProgram: p('when_start', 'move_right', 'say_line', 'switch_scene', 'repeat_twice'),
    title: '新练习：在森林里先说一句',
    setup: `这次让小狐狸出发后在森林里就说话：拼成“开始时 → ${MOVE_NAME} → 说一句话 → 切换场景 → ${REPEAT_NAME}”，按“运行”，再和上一关比一比。${REBUILD}`,
    question: '和上一关比，小狐狸说的话一样吗？',
    choices: [
      { id: 'different-line', label: '不一样：在森林说“你好！”，在草地说“我到草地啦！”', correct: true, reply: '对！“说一句话”放在森林里，小狐狸说“你好！”；放到草地，它就说“我到草地啦！”。' },
      { id: 'same-line', label: '一样，都说“我到草地啦！”', correct: false, reply: '再看看舞台：这次小狐狸在森林里开口，说的是“你好！”。' },
    ],
    hint: `把“说一句话”放在${MOVE}和“切换场景”中间，${REPEAT}放在最后。`,
    done: '你发现啦：同一块“说一句话”，放在不同的地方，故事就不一样。',
  },
  {
    lessonId: 'lesson-07-garden-click',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'click-event',
    goalType: 'change-distance',
    mode: 'predict',
    referenceProgram: p('when_clicked', 'move_right', 'move_right'),
    title: '新练习：点一下，飞到小青蛙身边',
    setup: `小青蛙在更远的地方。先猜一猜：“被点击时”下面接两块${FLY}，点一下蝴蝶，它会停在哪里？猜好了再接上第二块${FLY}，按「启动点击程序」，再点一下蝴蝶。`,
    question: `接两块${FLY}，点一下蝴蝶，它停在哪里？`,
    choices: [
      { id: 'half-way', label: '飞 100 步，停在半路', correct: false, reply: '看看舞台：两块积木飞了两次，小蝴蝶已飞 200 步，来到小青蛙身边。' },
      { id: 'beside-frog', label: '飞 200 步，来到小青蛙身边', correct: true, reply: '猜对啦！点一下，两块积木都会做，一共飞 200 步。' },
    ],
    hint: `要飞 200 步：在“被点击时”下面接两块${FLY}。`,
    done: '点一下，蝴蝶就飞了 200 步，来到小青蛙身边！',
  },
  {
    lessonId: 'lesson-08-garden-dialogue',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'click-reply',
    goalType: 'compare-events',
    mode: 'compare',
    referenceProgram: p('when_start', 'move_right', 'say_line'),
    title: '新练习：换成“开始时”比一比',
    setup: `这次不用“被点击时”，换成“开始时”：点「清空积木重拼」，拼成“开始时 → ${FLY_NAME} → 说一句话”，按“运行”，再和上一关比一比。`,
    question: '和上一关比，蝴蝶有什么不一样？',
    choices: [
      { id: 'no-wait', label: '不等我点就飞了，还说“你好！”', correct: true, reply: '对！“开始时”一运行就出发，说“你好！”；“被点击时”要等你点，才说“蝴蝶收到你的点击啦！”。' },
      { id: 'still-waits', label: '还是等我点了才飞', correct: false, reply: '再看看舞台：你没点蝴蝶，它一运行就飞了 100 步。' },
    ],
    hint: `这一关用“开始时”开头：“开始时 → ${FLY_NAME} → 说一句话”。`,
    done: '你发现啦：开头的积木决定蝴蝶什么时候开始表演。',
  },
  {
    lessonId: 'lesson-09-garden-story',
    stepId: 'step-3',
    stepIndex: 2,
    mainStepId: 'step-2',
    mainGoalType: 'click-story',
    goalType: 'compare-orders',
    mode: 'compare',
    referenceProgram: p('when_clicked', 'move_right', 'repeat_twice', 'say_line'),
    title: '新练习：飞完两段再回应',
    setup: `这次让蝴蝶飞完两段再回应你：拼成“被点击时 → ${FLY_NAME} → ${FLY_REPEAT_NAME} → 说一句话”，按「启动点击程序」，点一下蝴蝶，再和上一关比一比。${REBUILD}`,
    question: '和上一关比，哪里不一样？',
    choices: [
      { id: 'reply-later', label: '这次飞完 200 步才回应我', correct: true, reply: '对！两次都飞 200 步：上一关飞到 100 步就回应，这次飞完 200 步才回应。' },
      { id: 'fly-less', label: '这次少飞了一段', correct: false, reply: '再看看舞台：小蝴蝶已飞 200 步，飞的路一样长，不一样的是回应你的时候。' },
    ],
    hint: `把“说一句话”放在${FLY_REPEAT}后面：先飞两段，再回应。`,
    done: '你发现啦：“说一句话”排在哪里，蝴蝶就在哪里回应你。',
  },
]

const BY_KEY = new Map(practiceSteps.map((design) => [`${design.lessonId}|${design.stepId}`, design]))
const BY_INDEX = new Map(practiceSteps.map((design) => [`${design.lessonId}|${design.stepIndex}`, design]))

export function getPracticeStep(lessonId: string, stepId: string): PracticeStepDesign | undefined {
  return BY_KEY.get(`${lessonId}|${stepId}`)
}

export function getPracticeStepAt(lessonId: string, stepIndex: number): PracticeStepDesign | undefined {
  return BY_INDEX.get(`${lessonId}|${stepIndex}`)
}

/**
 * The practice for a lesson step, only when the step really is that practice (same goal program).
 * Guards against a published/admin copy of the curriculum whose steps no longer line up with the
 * code-side design — then the step simply runs as a normal step instead of showing a wrong panel.
 */
export function getPracticeStepFor(lessonId: string, step: { id: string; requiredBlockTypes: readonly string[] } | undefined) {
  const design = step ? getPracticeStep(lessonId, step.id) : undefined
  if (!design || !step) return undefined
  const reference = design.referenceProgram.map((block) => block.type)
  return reference.length === step.requiredBlockTypes.length && reference.every((type, index) => type === step.requiredBlockTypes[index])
    ? design
    : undefined
}

/** Can the step complete? (predict: any guess was made; compare: the right answer was picked.) */
export function isPracticeAnswered(design: PracticeStepDesign | undefined, answerId: string | null | undefined) {
  if (!design) return true
  const choice = design.choices.find((item) => item.id === answerId)
  if (!choice) return false
  return design.mode === 'predict' ? true : choice.correct
}

/** Every piece of child-facing copy of a design (for copy checks). */
export function practiceStepCopy(design: PracticeStepDesign) {
  return [
    design.title,
    design.setup,
    design.question,
    ...design.choices.flatMap((choice) => [choice.label, choice.reply]),
    design.hint,
    design.done,
  ]
}

/**
 * TQ-011: the garden “先猜一猜” about the click event is asked where it teaches something —
 * lesson-07's main build and its mistake step — instead of on every click step of 07–09.
 */
const CLICK_PREDICTION_STEPS = new Set(['lesson-07-garden-click|step-2', 'lesson-07-garden-click|step-4'])

export function asksClickPrediction(lessonId: string, stepId: string) {
  return CLICK_PREDICTION_STEPS.has(`${lessonId}|${stepId}`)
}
