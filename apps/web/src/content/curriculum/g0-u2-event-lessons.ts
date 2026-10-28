import type { EventActor, EventActorId, EventBlock, EventExpectation, EventFailure, EventInteraction, EventLevel } from '@/features/lessons/event/event-engine'

/**
 * G0-U2 (Hark A): event lessons on the event-stage engine (start flag, clicking
 * a character, the forest bell message). Every step is judged by a real engine
 * run of the child's scripts; `solutions` / `counterExamples` are checked in
 * g0-u2-event-lessons.test.ts. Same formal-course shape as G0-U1: error lab,
 * guided, two different practices, a creative remake, 复盘 and a saved work.
 * Experimental (L3), never "published".
 */

export type EventStepKind = 'guided' | 'practice-a' | 'practice-b' | 'error-lab' | 'creative'
export type EventPrediction = { text: string; when: 'pass' | EventFailure }
export type EventScriptsSpec = Partial<Record<EventActorId, string[]>>

/** `$target` stands for the character the child picked in a creative step. */
export type EventGoal = {
  expectations: Array<{ interaction: EventInteraction | { kind: 'click'; actor: '$target' }; effects: Array<[EventActorId | '$target', EventExpectation['effects'][number][1]]> }>
  /** Interactions that must cause nothing; 'others' = clicking every character except the target. */
  probes?: Array<EventInteraction | 'others'>
}

export type EventLessonStep = {
  id: string
  kind: EventStepKind
  title: string
  instruction: string
  predict: string
  level: EventLevel
  /** Characters whose script the child edits (character selection). */
  editable: EventActorId[]
  allowedBlocks: string[]
  starter?: Partial<Record<EventActorId, EventBlock[]>>
  goal: EventGoal
  hints: [string, string, string]
  solutions: EventScriptsSpec[]
  counterExamples: Array<{ scripts: EventScriptsSpec; failure: EventFailure }>
  predictChoices?: [EventPrediction, EventPrediction]
  errorLab?: { expect: EventFailure; expected: string; actual: string }
  /** creative: the child picks which character the goal is about. */
  creative?: { prompt: string; choices: EventActorId[]; labels: string[] }
}

export type EventLesson = {
  id: string
  title: string
  story: string
  concept: string
  objectives: string[]
  diagnoses: Partial<Record<EventFailure, string>>
  steps: EventLessonStep[]
  reflection: string
  reflectionCheck: { question: string; options: Array<{ text: string; correct: boolean }>; why: string }
  parentQuestion: string
  review: { whatIf: string; answer: string }
  project: { stepId: string; title: string }
}

const fox = (over: Partial<EventActor> = {}): EventActor => ({ id: 'fox', name: '小狐狸', can: ['wake_up', 'say_hello', 'send_bell'], x: 32, y: 64, asleep: true, ...over })
const rabbit = (over: Partial<EventActor> = {}): EventActor => ({ id: 'rabbit', name: '小兔子', can: ['wake_up', 'say_hello', 'show_surprise'], x: 70, y: 66, asleep: true, ...over })
const bird = (over: Partial<EventActor> = {}): EventActor => ({ id: 'bird', name: '小鸟', can: ['wake_up', 'say_hello', 'enter_stage'], x: 52, y: 30, asleep: true, ...over })

const GLADE: EventLevel = { actors: [fox(), rabbit()], scenery: 'morning-glade' }
const GLADE3: EventLevel = { actors: [fox(), rabbit(), bird()], scenery: 'morning-glade' }
const EVENT_BLOCKS = ['when_start', 'when_clicked', 'wake_up', 'say_hello']

const L01: EventLesson = {
  id: 'G0-U2-L01',
  title: '点击叫醒小狐狸',
  story: '清晨的林间空地上，小狐狸和小兔子还在睡觉。积木要挂在“开始时”或“被点击时”下面，事件发生了，下面的积木才会动起来。',
  concept: '开始事件与触发时机',
  objectives: [
    '知道积木要接在事件下面：事件发生了，下面的积木才运行',
    '分清“开始时”和“被点击时”：一个按开始旗，一个点角色',
    '能比较触发前后舞台的变化，找出“还没点就醒了”的错误',
  ],
  diagnoses: {
    hat_not_on_top: '事件积木要放在最上面：“开始时”在下面的话，上面的积木永远不会运行。把事件挪到最上面。',
    no_hat: '这段积木上面没有事件，它不知道什么时候开始。接到“开始时”或“被点击时”下面。',
    disconnected: '有一块积木掉队了，没接在事件下面，它不会运行。',
    nothing_happened: '触发了，可是什么都没发生：检查事件选的是“开始时”还是“被点击时”，积木是不是拼在对的角色上。',
    wrong_order: '动作的顺序反了：要先“睁开眼睛”，再“说早上好”。',
    missing_effect: '还少一个动作：醒来以后还要打招呼。',
    extra_effect: '多了不该有的动作：这一步只让目标角色动，别的角色继续睡。',
    too_early: '还没点，角色就先醒了：事件选成了“开始时”。要等被点击时才醒。',
    wrong_trigger: '点了别的角色也有反应：叫醒的积木拼到别的角色身上了。',
    wrong_actor: '醒来的不是要叫的那位：看看积木拼在了哪个角色名下。',
    cannot_do: '这个角色做不了这块积木的动作。',
  },
  steps: [
    {
      id: 'hello-above-start',
      kind: 'error-lab',
      title: '错误实验：事件放到了下面',
      instruction: '小兔子替小狐狸拼了程序，可是把“开始时”放在了最下面。这是一个故意的错误：先按原样运行检查，看看按下开始旗小狐狸会不会醒，再把事件挪到最上面。',
      predict: '先猜一猜：“开始时”在最下面，按下开始旗会怎样？',
      predictChoices: [
        { text: '小狐狸醒来说早上好', when: 'pass' },
        { text: '小狐狸继续睡，一动不动', when: 'hat_not_on_top' },
      ],
      errorLab: {
        expect: 'hat_not_on_top',
        expected: '如果事件在最上面，按下开始旗，小狐狸应该睁开眼睛说早上好。',
        actual: '小狐狸还在睡：事件在最下面，上面的积木永远等不到开始的信号。',
      },
      level: GLADE,
      editable: ['fox'],
      allowedBlocks: EVENT_BLOCKS,
      starter: { fox: [{ type: 'wake_up' }, { type: 'say_hello' }, { type: 'when_start' }] },
      goal: { expectations: [{ interaction: { kind: 'start' }, effects: [['fox', 'wake_up'], ['fox', 'say_hello']] }] },
      hints: [
        '按下开始旗，小狐狸一动不动：它的积木没有收到开始信号。',
        '事件积木像门铃，要放在最上面，下面的积木才会接着运行。',
        '清空后重拼：“开始时”在最上面，下面接“睁开眼睛”和“说早上好”。',
      ],
      solutions: [{ fox: ['when_start', 'wake_up', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['wake_up', 'say_hello', 'when_start'] }, failure: 'hat_not_on_top' },
        { scripts: { fox: ['wake_up', 'say_hello'] }, failure: 'no_hat' },
      ],
    },
    {
      id: 'wake-then-hello',
      kind: 'guided',
      title: '先醒来，再打招呼',
      instruction: '按下开始旗时，小狐狸要先“睁开眼睛”，再“说早上好”。顺序反了，就像闭着眼睛说话。',
      predict: '先猜一猜：把两块积木对调，会发生什么？',
      level: GLADE,
      editable: ['fox'],
      allowedBlocks: EVENT_BLOCKS,
      goal: { expectations: [{ interaction: { kind: 'start' }, effects: [['fox', 'wake_up'], ['fox', 'say_hello']] }] },
      hints: [
        '小狐狸先说话、后醒来，顺序不对。',
        '程序从上往下一块一块做，先做的放上面。',
        '“开始时”下面：先接“睁开眼睛”，再接“说早上好”。',
      ],
      solutions: [{ fox: ['when_start', 'wake_up', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'say_hello', 'wake_up'] }, failure: 'wrong_order' },
        { scripts: { fox: ['when_start', 'wake_up'] }, failure: 'missing_effect' },
      ],
    },
    {
      id: 'click-to-wake',
      kind: 'practice-a',
      title: '练习 A：点一下才醒',
      instruction: '这次不用开始旗：只有点一下小狐狸，它才醒来打招呼。按开始旗、点小兔子，小狐狸都要继续睡。',
      predict: '先猜一猜：要用哪个事件积木？',
      level: GLADE,
      editable: ['fox', 'rabbit'],
      allowedBlocks: EVENT_BLOCKS,
      goal: {
        expectations: [
          { interaction: { kind: 'start' }, effects: [] },
          { interaction: { kind: 'click', actor: 'fox' }, effects: [['fox', 'wake_up'], ['fox', 'say_hello']] },
        ],
        probes: [{ kind: 'click', actor: 'rabbit' }],
      },
      hints: [
        '还没点小狐狸它就醒了，或者点了它没反应：事件选错了。',
        '“开始时”听开始旗，“被点击时”听手指点到的那个角色。',
        '在小狐狸名下拼：“被点击时” → 睁开眼睛 → 说早上好；小兔子名下什么都不拼。',
      ],
      solutions: [{ fox: ['when_clicked', 'wake_up', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'wake_up', 'say_hello'] }, failure: 'too_early' },
        { scripts: { rabbit: ['when_clicked', 'wake_up', 'say_hello'] }, failure: 'nothing_happened' },
      ],
    },
    {
      id: 'woke-too-early',
      kind: 'practice-b',
      title: '练习 B：小兔子也被吵醒了',
      instruction: '小兔子拼好的程序，点小狐狸时，小兔子也跟着醒了。先运行检查，看看谁多动了，再改好：只叫醒小狐狸。',
      predict: '先猜一猜：问题出在小狐狸的积木，还是小兔子的积木？',
      level: GLADE,
      editable: ['fox', 'rabbit'],
      allowedBlocks: EVENT_BLOCKS,
      starter: {
        fox: [{ type: 'when_clicked' }, { type: 'wake_up' }, { type: 'say_hello' }],
        rabbit: [{ type: 'when_start' }, { type: 'wake_up' }],
      },
      goal: {
        expectations: [
          { interaction: { kind: 'start' }, effects: [] },
          { interaction: { kind: 'click', actor: 'fox' }, effects: [['fox', 'wake_up'], ['fox', 'say_hello']] },
        ],
        probes: [{ kind: 'click', actor: 'rabbit' }],
      },
      hints: [
        '按开始旗时小兔子先醒了：小兔子名下有一段不该有的积木。',
        '每个角色有自己的积木。只想叫醒小狐狸，就别给小兔子拼“开始时”。',
        '切到小兔子，点“清空积木重拼”，让它的积木区空着；小狐狸的不用改。',
      ],
      solutions: [{ fox: ['when_clicked', 'wake_up', 'say_hello'] }],
      counterExamples: [{ scripts: { fox: ['when_clicked', 'wake_up', 'say_hello'], rabbit: ['when_start', 'wake_up'] }, failure: 'extra_effect' }],
    },
    {
      id: 'my-wake-card',
      kind: 'creative',
      title: '创意改造：你想叫醒谁？',
      instruction: '小鸟也来了。由你来决定：先选一位朋友，再给它拼程序——点一下它，它就醒来说早上好；点别的朋友，它们继续睡。通过后，它就是你的“叫醒卡”作品。',
      predict: '先猜一猜：积木要拼在谁的名下？',
      creative: { prompt: '你想点一下叫醒谁？', choices: ['fox', 'rabbit', 'bird'], labels: ['小狐狸', '小兔子', '小鸟'] },
      level: GLADE3,
      editable: ['fox', 'rabbit', 'bird'],
      allowedBlocks: EVENT_BLOCKS,
      goal: {
        expectations: [
          { interaction: { kind: 'start' }, effects: [] },
          { interaction: { kind: 'click', actor: '$target' }, effects: [['$target', 'wake_up'], ['$target', 'say_hello']] },
        ],
        probes: ['others'],
      },
      hints: [
        '点了你选的朋友没反应，或者别人也醒了：积木拼错了角色或事件。',
        '先在上面切到你选的朋友，再在它的名下拼；别的朋友名下空着。',
        '例如选小鸟：切到“小鸟”，拼“被点击时” → 睁开眼睛 → 说早上好。',
      ],
      solutions: [{ fox: ['when_clicked', 'wake_up', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'wake_up', 'say_hello'] }, failure: 'too_early' },
        { scripts: { rabbit: ['when_clicked', 'wake_up', 'say_hello'] }, failure: 'nothing_happened' },
      ],
    },
  ],
  review: {
    whatIf: '如果把“被点击时”换成“开始时”，你的叫醒卡会怎样？',
    answer: '一按开始旗朋友就醒了，不用再点它。“开始时”听开始旗，“被点击时”听手指点到的角色。',
  },
  reflection: '说一说：为什么“开始时”要放在最上面？“开始时”和“被点击时”有什么不一样？',
  reflectionCheck: {
    question: '想让小狐狸“点一下才醒”，要用哪个事件？',
    options: [{ text: '被点击时', correct: true }, { text: '开始时', correct: false }, { text: '不用事件', correct: false }],
    why: '“被点击时”等手指点到这个角色才运行；“开始时”一按开始旗就运行；没有事件，积木永远不运行。',
  },
  parentQuestion: '请孩子播放自己的“叫醒卡”：先按开始旗，看朋友们是不是都还在睡；再点自己选的朋友，看它醒来，说说用了哪个事件。',
  project: { stepId: 'my-wake-card', title: '我的叫醒卡' },
}

export const g0u2EventLessons: Record<string, EventLesson> = { [L01.id]: L01 }

export function getEventLesson(id: string): EventLesson | undefined {
  return g0u2EventLessons[id]
}

/** The goal a step really checks: a creative step's `$target` becomes the picked character. */
export function resolveEventGoal(step: EventLessonStep, target?: EventActorId) {
  const who = target ?? step.creative?.choices[0] ?? 'fox'
  const expectations: EventExpectation[] = step.goal.expectations.map(e => ({
    interaction: e.interaction.kind === 'click' ? { kind: 'click', actor: e.interaction.actor === '$target' ? who : e.interaction.actor } : e.interaction,
    effects: e.effects.map(([a, x]) => [a === '$target' ? who : a, x]),
  }))
  const probes: EventInteraction[] = (step.goal.probes ?? []).flatMap(p => p === 'others'
    ? step.level.actors.filter(a => a.id !== who).map(a => ({ kind: 'click' as const, actor: a.id }))
    : [p])
  return { expectations, probes }
}

/** Turns a spec like { fox: ['when_start', 'wake_up'] } into block lists. */
export const toEventScripts = (spec: EventScriptsSpec) =>
  Object.fromEntries(Object.entries(spec).map(([actor, types]) => [actor, (types ?? []).map(type => ({ type }))]))
