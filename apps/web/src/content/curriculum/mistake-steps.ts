import { getKidsBlockLabel, quoteBlock } from '@/features/lessons/blockly/block-labels'
import type { ProgramBlock, RunFailureCode } from '@/features/lessons/blockly/observable-run'

/**
 * TQ-010 (= TQ-002d): every Blockly lesson 01–09 has exactly ONE designed
 * “real mistake → observe → fix” step, following lesson-10's observedMistake gate.
 *
 * Entering the step puts a pre-built wrong program on the workspace. The child runs it,
 * sees on the stage what goes wrong (the run fails with `expectedCode`, explained by
 * run-feedback.ts), answers one question about what they saw, then fixes the program.
 * The step only passes when the mistake was observed, the question was answered, and the
 * fixed program ran correctly (judged by observable-run.ts like every other step).
 *
 * Kept in code (not in the lesson payload) so a database copy of the curriculum cannot drop
 * the gate. Block names in copy come from block-labels.ts, the same source the blocks use.
 */
export type MistakeChoice = {
  id: string
  label: string
  correct: boolean
  /** What the child hears after picking this answer. */
  reply: string
}

export type MistakeStepDesign = {
  lessonId: string
  stepId: string
  /** 0-based index of the step inside the lesson (unit-tested against launch-lessons). */
  stepIndex: number
  /** The designed wrong program placed on the workspace when the step opens. */
  wrongProgram: ProgramBlock[]
  /** The specific failure the wrong program shows (observable-run code). */
  expectedCode: RunFailureCode
  /** One correct fix (tests and docs; never shown to the child). */
  fixedProgram: ProgramBlock[]
  title: string
  /** What is on the workspace and what to do first. */
  setup: string
  /** 5–7-year-old friendly question about what they saw on stage. */
  question: string
  choices: MistakeChoice[]
  /** How to fix it, shown after the right answer. */
  fix: string
  /** Shown once the fixed program ran correctly. */
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

export const mistakeSteps: readonly MistakeStepDesign[] = [
  {
    lessonId: 'lesson-01-forest-hello',
    stepId: 'step-5',
    stepIndex: 4,
    wrongProgram: p('move_right'),
    expectedCode: 'missing-start',
    fixedProgram: p('when_start', 'move_right'),
    title: '纠错实验：少了“开始时”',
    setup: `积木区摆好了一段程序：只有${MOVE}，上面没有“开始时”。先按“运行”，看看小狐狸会不会出场。`,
    question: '按了运行，小狐狸怎么了？',
    choices: [
      { id: 'stayed', label: '一动不动，还在 0 步', correct: true, reply: '对！没有“开始时”，小狐狸听不到出发口令，就不会动。' },
      { id: 'walked', label: '向右走了 100 步', correct: false, reply: '再看看舞台：小狐狸已走 0 步，它没有动哦。' },
    ],
    fix: `把“开始时”放到${MOVE}上面，接成一串，再按“运行”。`,
    done: '修好啦！有了“开始时”，小狐狸一按运行就出场。',
  },
  {
    lessonId: 'lesson-02-forest-greeting',
    stepId: 'step-4',
    stepIndex: 3,
    wrongProgram: p('when_start', 'say_line', 'move_right'),
    expectedCode: 'say-too-early',
    fixedProgram: p('when_start', 'move_right', 'say_line'),
    title: '纠错实验：先说话还是先出场？',
    setup: `积木区摆好了“开始时 → 说一句话 → ${MOVE_NAME}”。先按“运行”，看看小狐狸什么时候开口。`,
    question: '小狐狸是什么时候说话的？',
    choices: [
      { id: 'before-walk', label: '还没走上舞台就先说话了', correct: true, reply: '对！“说一句话”排在移动前面，所以它先开口，再走路。' },
      { id: 'after-walk', label: '走完 100 步才说话', correct: false, reply: '再看一次：小狐狸还在 0 步时，话就说出来了。' },
    ],
    fix: `把“说一句话”挪到${MOVE}下面：先出场，再打招呼。可以拖动积木，也可以点「清空积木重拼」重新拼。`,
    done: '修好啦！小狐狸先走上舞台，再打招呼。',
  },
  {
    lessonId: 'lesson-03-forest-story',
    stepId: 'step-4',
    stepIndex: 3,
    wrongProgram: p('when_start', 'say_line', 'move_right'),
    expectedCode: 'say-too-early',
    fixedProgram: p('when_start', 'move_right', 'say_line'),
    title: '纠错实验：故事顺序乱了',
    setup: `积木区摆好了“开始时 → 说一句话 → ${MOVE_NAME}”。先按“运行”，看看这个小故事哪里怪怪的。`,
    question: '故事里，小狐狸先做了什么？',
    choices: [
      { id: 'said-first', label: '先打招呼，再走上舞台', correct: true, reply: '对！还没出场就打招呼，看故事的人会觉得怪怪的。' },
      { id: 'walked-first', label: '先走上舞台，再打招呼', correct: false, reply: '再看一次：小狐狸还在 0 步时，话就说出来了。' },
    ],
    fix: `把“说一句话”挪到${MOVE}下面，故事就变成先出场、再打招呼。可以拖动积木，也可以点「清空积木重拼」重新拼。`,
    done: '修好啦！这才是一个顺序完整的小故事。',
  },
  {
    lessonId: 'lesson-04-meadow-scene',
    stepId: 'step-5',
    stepIndex: 4,
    wrongProgram: p('when_start', 'switch_scene', 'move_right'),
    expectedCode: 'scene-switch-early',
    fixedProgram: p('when_start', 'move_right', 'switch_scene'),
    title: '纠错实验：换场景换早了',
    setup: `积木区摆好了“开始时 → 切换场景 → ${MOVE_NAME}”。先按“运行”，看看小狐狸在哪里走路。`,
    question: '小狐狸的 100 步是在哪里走的？',
    choices: [
      { id: 'meadow', label: '一出发就到了草地，在草地走的', correct: true, reply: '对！“切换场景”排在最前面，森林一下子就不见了。' },
      { id: 'forest', label: '先在森林走完，再到草地', correct: false, reply: '再看看舞台：一按运行，画面就先变成了草地。' },
    ],
    fix: `把“切换场景”挪到${MOVE}下面：先在森林走 100 步，再换到草地。可以拖动积木，也可以点「清空积木重拼」重新拼。`,
    done: '修好啦！小狐狸先在森林走 100 步，再来到草地。',
  },
  {
    lessonId: 'lesson-05-meadow-order',
    stepId: 'step-5',
    stepIndex: 4,
    wrongProgram: p('when_start', 'repeat_twice', 'move_right', 'switch_scene'),
    expectedCode: 'repeat-without-move',
    fixedProgram: p('when_start', 'move_right', 'switch_scene', 'repeat_twice'),
    title: `纠错实验：${REPEAT}放早了`,
    setup: `积木区摆好了“开始时 → ${REPEAT_NAME} → ${MOVE_NAME} → 切换场景”。先按“运行”，看看小狐狸走了多少步。`,
    question: '按了运行，小狐狸走了多少步？',
    choices: [
      { id: 'zero', label: '没有动，还在 0 步', correct: true, reply: `对！${REPEAT}要重复前面的移动，可它前面还没有移动，程序就停住了。` },
      { id: 'two-hundred', label: '走了 200 步', correct: false, reply: '再看看舞台：小狐狸已走 0 步，它没有动。' },
    ],
    fix: `把${REPEAT}挪到“切换场景”下面：先走 100 步，到草地后再走 100 步。可以拖动积木，也可以点「清空积木重拼」重新拼。`,
    done: '修好啦！先出发、再到草地、再走 100 步，一共走了 200 步。',
  },
  {
    lessonId: 'lesson-06-meadow-story',
    stepId: 'step-5',
    stepIndex: 4,
    wrongProgram: p('when_start', 'move_right', 'repeat_twice', 'switch_scene', 'say_line'),
    expectedCode: 'scene-switch-late',
    fixedProgram: p('when_start', 'move_right', 'switch_scene', 'repeat_twice', 'say_line'),
    title: '纠错实验：换场景换晚了',
    setup: `积木区摆好了“开始时 → ${MOVE_NAME} → ${REPEAT_NAME} → 切换场景 → 说一句话”。先按“运行”，看看小狐狸在森林里走了多远。`,
    question: '小狐狸在森林里走了多少步才到草地？',
    choices: [
      { id: 'too-far', label: '走了 200 步，在森林走过头了', correct: true, reply: '对！“切换场景”排得太晚，小狐狸在森林里把 200 步都走完了。' },
      { id: 'just-right', label: '走 100 步就到了草地', correct: false, reply: '再看看舞台：到草地之前，小狐狸已经走了 200 步。' },
    ],
    fix: `把“切换场景”挪到${MOVE}和${REPEAT}中间：森林走 100 步，到草地再走 100 步，最后说一句话。可以拖动积木，也可以点「清空积木重拼」重新拼。`,
    done: '修好啦！小狐狸在森林走 100 步，到草地再走 100 步，还说出了旅行感受。',
  },
  {
    lessonId: 'lesson-07-garden-click',
    stepId: 'step-3',
    stepIndex: 2,
    wrongProgram: p('when_start', 'move_right'),
    expectedCode: 'needs-click-trigger',
    fixedProgram: p('when_clicked', 'move_right'),
    title: '纠错实验：没点蝴蝶，它却飞了',
    setup: `积木区摆好了“开始时 → ${FLY_NAME}”。先猜一猜，再按「启动点击程序」。先别点蝴蝶，看看会发生什么。`,
    question: '你还没点蝴蝶，它怎么了？',
    choices: [
      { id: 'flew-alone', label: '自己飞起来了', correct: true, reply: '对！“开始时”一启动就出发，不会等你点。' },
      { id: 'waited', label: '一直等我点它', correct: false, reply: '再看看舞台：你没点，蝴蝶已经飞了 100 步。' },
    ],
    fix: `把“开始时”换成“被点击时”：点「清空积木重拼」，放“被点击时”，再接${FLY}。然后启动，亲手点一下蝴蝶。`,
    done: '修好啦！现在蝴蝶会等你点到它，才飞起来。',
  },
  {
    lessonId: 'lesson-08-garden-dialogue',
    stepId: 'step-5',
    stepIndex: 4,
    wrongProgram: p('when_clicked', 'say_line', 'move_right'),
    expectedCode: 'say-too-early',
    fixedProgram: p('when_clicked', 'move_right', 'say_line'),
    title: '纠错实验：蝴蝶先说话了',
    setup: `积木区摆好了“被点击时 → 说一句话 → ${FLY_NAME}”。启动后点一下蝴蝶，看看它先做什么。`,
    question: '点了蝴蝶以后，它先做了什么？',
    choices: [
      { id: 'said-first', label: '先说话，再飞', correct: true, reply: '对！“说一句话”排在前面，所以蝴蝶还没飞就先开口了。' },
      { id: 'flew-first', label: '先飞，再说话', correct: false, reply: '再看一次：蝴蝶还在 0 步时，话就说出来了。' },
    ],
    fix: `把“说一句话”挪到${FLY}下面：先飞，再回应你。可以拖动积木，也可以点「清空积木重拼」重新拼。`,
    done: '修好啦！点一下，蝴蝶先飞 100 步，再回应你。',
  },
  {
    lessonId: 'lesson-09-garden-story',
    stepId: 'step-5',
    stepIndex: 4,
    wrongProgram: p('when_clicked', 'say_line', 'move_right', 'repeat_twice'),
    expectedCode: 'say-too-early',
    fixedProgram: p('when_clicked', 'move_right', 'say_line', 'repeat_twice'),
    title: '纠错实验：回应说得太早',
    setup: `积木区摆好了“被点击时 → 说一句话 → ${FLY_NAME} → ${FLY_REPEAT_NAME}”。启动后点一下蝴蝶，看看它什么时候回应你。`,
    question: '蝴蝶是什么时候回应你的？',
    choices: [
      { id: 'before-fly', label: '还没飞就先说了', correct: true, reply: '对！还没飞就回应，看起来不像在回应你的点击。' },
      { id: 'after-fly', label: '飞起来以后才说', correct: false, reply: '再看一次：蝴蝶还在 0 步时，话就说出来了。' },
    ],
    fix: `把“说一句话”挪到${FLY}下面，或者挪到${FLY_REPEAT}下面，都可以：先飞，再回应。可以拖动积木，也可以点「清空积木重拼」重新拼。`,
    done: '修好啦！点一下，蝴蝶一共飞 200 步，飞起来以后才回应你。',
  },
]

const BY_KEY = new Map(mistakeSteps.map((design) => [`${design.lessonId}|${design.stepId}`, design]))
const BY_INDEX = new Map(mistakeSteps.map((design) => [`${design.lessonId}|${design.stepIndex}`, design]))

export function getMistakeStep(lessonId: string, stepId: string): MistakeStepDesign | undefined {
  return BY_KEY.get(`${lessonId}|${stepId}`)
}

export function getMistakeStepAt(lessonId: string, stepIndex: number): MistakeStepDesign | undefined {
  return BY_INDEX.get(`${lessonId}|${stepIndex}`)
}

/**
 * TQ-010: is this failed run the designed experiment rather than a real failed attempt?
 * Only the run that first shows the designed failure is the experiment (it is what “observes”
 * the mistake). Every later failed run — including running the wrong program again — is a real
 * attempt and gets the normal failure feedback and hint escalation.
 */
export function isDesignedMistakeRun(
  design: MistakeStepDesign | undefined,
  code: RunFailureCode | null | undefined,
  observed: boolean,
): boolean {
  return Boolean(design && !observed && code === design.expectedCode)
}

/** Every piece of child-facing copy of a design (for copy checks). */
export function mistakeStepCopy(design: MistakeStepDesign) {
  return [
    design.title,
    design.setup,
    design.question,
    ...design.choices.flatMap((choice) => [choice.label, choice.reply]),
    design.fix,
    design.done,
  ]
}
