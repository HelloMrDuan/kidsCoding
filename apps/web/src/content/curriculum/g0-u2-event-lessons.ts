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
  /** `passedText`: the work's status line once it really passes; `{target}` is the picked character's name. */
  project: { stepId: string; title: string; passedText: string }
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
  project: { stepId: 'my-wake-card', title: '我的叫醒卡', passedText: '真实运行：点{target}才会醒' },
}


// G0-U2-L02: the forest opening — the host speaks first, then the flag goes up.
const host = (over: Partial<EventActor> = {}): EventActor => ({ id: 'fox', name: '小狐狸', can: ['say_hello', 'raise_flag'], x: 34, y: 58, line: '早上好，开幕啦！', ...over })
const helper = (over: Partial<EventActor> = {}): EventActor => ({ id: 'rabbit', name: '小兔子', can: ['say_hello', 'raise_flag', 'show_surprise'], x: 66, y: 60, line: '早上好！', ...over })
const guest = (over: Partial<EventActor> = {}): EventActor => ({ id: 'bird', name: '小鸟', can: ['say_hello', 'enter_stage'], x: 50, y: 30, offstage: true, line: '早上好，我来啦！', ...over })
const OPENING: EventLevel = { actors: [host(), helper()], scenery: 'stage-flags' }
const OPENING_GUEST: EventLevel = { actors: [host(), helper(), guest()], scenery: 'stage-flags' }
// Practice B: the rabbit stands first on the stage, so its own start script runs before the host.
const OPENING_RABBIT_FIRST: EventLevel = { actors: [helper(), host()], scenery: 'stage-flags' }
const OPENING_ANY_HOST: EventLevel = {
  // Three hosts in one row, so whoever speaks, the bubble never covers a friend.
  actors: [
    host({ x: 25 }),
    helper({ x: 50, y: 58, line: '早上好，开幕啦！' }),
    guest({ offstage: false, can: ['say_hello', 'raise_flag'], x: 76, y: 58, line: '早上好，开幕啦！' }),
  ],
  scenery: 'stage-flags',
}
const FLAG_BLOCKS = ['when_start', 'when_clicked', 'say_hello', 'raise_flag']
const opening: EventGoal = { expectations: [{ interaction: { kind: 'start' }, effects: [['fox', 'say_hello'], ['fox', 'raise_flag']] }] }

const L02: EventLesson = {
  id: 'G0-U2-L02',
  title: '开始旗帜响起',
  story: '森林开幕式要开始了。主持人小狐狸先说“早上好，开幕啦！”，彩旗才升起来。按下开始旗，演出就照着积木从上往下进行。',
  concept: '开始事件与表演顺序',
  objectives: [
    '把一场演出接在“开始时”下面：按开始旗，演出才开始',
    '按先后排好表演：先说开幕词，再升彩旗',
    '能找出“两个开始事件互相抢”的错误，只留一个真正的开场',
  ],
  diagnoses: {
    wrong_order: '彩旗先升起来了：演出最先应该是主持人说开幕词。把“说早上好”放到“升起彩旗”上面。',
    hat_not_on_top: '事件积木要放在最上面，演出才会在按开始旗时开始。',
    no_hat: '这段演出没有接在事件下面，按开始旗也不会开始。先在最上面放“开始时”。',
    disconnected: '有一块积木掉队了，没接在“开始时”下面，它不会运行。',
    nothing_happened: '按了开始旗，舞台上什么都没发生：演出要接在“开始时”下面，还要拼在主持人名下。',
    missing_effect: '演出还少一段：先说开幕词，再升彩旗，两块都要有。',
    extra_effect: '多了不该有的表演：两个角色都接了“开始时”，会互相抢着演。只留主持人的开场。',
    too_early: '还没到时候就先动了：小鸟要等被点到才入场，不能一按开始旗就进来。',
    wrong_trigger: '点角色也触发了表演：开场只听开始旗，点角色时舞台不该变。',
    wrong_actor: '做动作的不是主持人：看看积木拼在了谁的名下。',
    cannot_do: '这个角色做不了这块积木的动作。',
  },
  steps: [
    {
      id: 'flag-before-hello',
      kind: 'error-lab',
      title: '错误实验：彩旗先升起来了',
      instruction: '小兔子替主持人拼好了开场，可是“升起彩旗”放在了“说早上好”上面。这是一个故意的错误：先按原样运行检查，看看彩旗和开幕词谁先出现，再把顺序改对。',
      predict: '先猜一猜：按下开始旗，彩旗和开幕词谁先出现？',
      predictChoices: [
        { text: '主持人先说开幕词，彩旗再升起', when: 'pass' },
        { text: '彩旗先升起，主持人才说话', when: 'wrong_order' },
      ],
      errorLab: {
        expect: 'wrong_order',
        expected: '开幕式应该是：主持人先说“早上好，开幕啦！”，彩旗再升起来。',
        actual: '彩旗先升起来了：积木从上往下运行，“升起彩旗”排在上面，就先做了。',
      },
      level: OPENING,
      editable: ['fox'],
      allowedBlocks: FLAG_BLOCKS,
      starter: { fox: [{ type: 'when_start' }, { type: 'raise_flag' }, { type: 'say_hello' }] },
      goal: opening,
      hints: [
        '看舞台：彩旗先升起，主持人后说话，和开幕式的顺序反了。',
        '积木从上往下一块一块做，先发生的放上面。',
        '清空后重拼：“开始时” → 说早上好 → 升起彩旗。',
      ],
      solutions: [{ fox: ['when_start', 'say_hello', 'raise_flag'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'raise_flag', 'say_hello'] }, failure: 'wrong_order' },
        { scripts: { fox: ['say_hello', 'raise_flag'] }, failure: 'no_hat' },
      ],
    },
    {
      id: 'host-then-flag',
      kind: 'guided',
      title: '按开始旗，开幕式开始',
      instruction: '自己拼一遍开场：按下开始旗，主持人先说开幕词，再升彩旗。还没按开始旗、或者只是点一下主持人，彩旗都不能动。',
      predict: '先猜一猜：用“被点击时”行不行？',
      level: OPENING,
      editable: ['fox'],
      allowedBlocks: FLAG_BLOCKS,
      goal: { ...opening, probes: [{ kind: 'click', actor: 'fox' }, { kind: 'click', actor: 'rabbit' }] },
      hints: [
        '按开始旗舞台没动，或者点主持人也能升旗：事件选错了。',
        '开场听的是开始旗，所以要用“开始时”。',
        '主持人名下：“开始时” → 说早上好 → 升起彩旗。',
      ],
      solutions: [{ fox: ['when_start', 'say_hello', 'raise_flag'] }],
      counterExamples: [
        { scripts: { fox: ['when_clicked', 'say_hello', 'raise_flag'] }, failure: 'nothing_happened' },
        { scripts: { fox: ['when_start', 'say_hello'] }, failure: 'missing_effect' },
        { scripts: { fox: ['when_start', 'say_hello', 'raise_flag'], rabbit: ['when_clicked', 'raise_flag'] }, failure: 'wrong_trigger' },
      ],
    },
    {
      id: 'invite-bird',
      kind: 'practice-a',
      title: '练习 A：开幕后请小鸟入场',
      instruction: '开幕式照常：按开始旗，主持人说开幕词、升彩旗。小鸟是特别嘉宾，要等你点它，它才走上舞台说“我来啦！”。',
      predict: '先猜一猜：小鸟的积木要用哪个事件？',
      level: OPENING_GUEST,
      editable: ['fox', 'bird'],
      allowedBlocks: ['when_start', 'when_clicked', 'say_hello', 'raise_flag', 'enter_stage'],
      goal: {
        expectations: [
          { interaction: { kind: 'start' }, effects: [['fox', 'say_hello'], ['fox', 'raise_flag']] },
          { interaction: { kind: 'click', actor: 'bird' }, effects: [['bird', 'enter_stage'], ['bird', 'say_hello']] },
        ],
        probes: [{ kind: 'click', actor: 'fox' }],
      },
      hints: [
        '小鸟一按开始旗就上台了，或者点它没反应：小鸟的事件选错了。',
        '主持人听开始旗，小鸟听手指：两个角色各有自己的事件。',
        '主持人：“开始时” → 说早上好 → 升起彩旗；小鸟：“被点击时” → 走上舞台 → 说早上好。',
      ],
      solutions: [{ fox: ['when_start', 'say_hello', 'raise_flag'], bird: ['when_clicked', 'enter_stage', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'say_hello', 'raise_flag'], bird: ['when_start', 'enter_stage', 'say_hello'] }, failure: 'too_early' },
        { scripts: { fox: ['when_start', 'say_hello', 'raise_flag'], bird: ['when_clicked', 'say_hello', 'enter_stage'] }, failure: 'wrong_order' },
        { scripts: { fox: ['when_start', 'say_hello', 'raise_flag'] }, failure: 'nothing_happened' },
      ],
    },
    {
      id: 'two-start-hats',
      kind: 'practice-b',
      title: '练习 B：两个开场在抢',
      instruction: '主持人的开场拼对了，可是小兔子名下也接了一个“开始时”，一按开始旗它就抢先升旗。先运行检查，看看是谁抢了，再改好：只留主持人的开场。',
      predict: '先猜一猜：问题在主持人的积木，还是小兔子的积木？',
      level: OPENING_RABBIT_FIRST,
      editable: ['fox', 'rabbit'],
      allowedBlocks: FLAG_BLOCKS,
      starter: {
        fox: [{ type: 'when_start' }, { type: 'say_hello' }, { type: 'raise_flag' }],
        rabbit: [{ type: 'when_start' }, { type: 'raise_flag' }],
      },
      goal: opening,
      hints: [
        '按开始旗时，小兔子先把彩旗升起来了：有两个“开始时”在同时演。',
        '一按开始旗，所有接了“开始时”的角色都会动。开场只要一个。',
        '切到小兔子，点“清空积木重拼”，让它的积木区空着；主持人的不用改。',
      ],
      solutions: [{ fox: ['when_start', 'say_hello', 'raise_flag'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'say_hello', 'raise_flag'], rabbit: ['when_start', 'raise_flag'] }, failure: 'extra_effect' },
        { scripts: { rabbit: ['when_start', 'raise_flag'] }, failure: 'wrong_actor' },
      ],
    },
    {
      id: 'my-opening',
      kind: 'creative',
      title: '创意改造：谁来主持开幕式？',
      instruction: '这次由你来决定：先选一位主持人，再给它拼开场——按下开始旗，它先说开幕词，再升彩旗；别的朋友不动，点谁都不会重来一遍。通过后，它就是你的“开幕式节目单”作品。',
      predict: '先猜一猜：开场积木要拼在谁的名下？',
      creative: { prompt: '你想请谁来主持开幕式？', choices: ['fox', 'rabbit', 'bird'], labels: ['小狐狸', '小兔子', '小鸟'] },
      level: OPENING_ANY_HOST,
      editable: ['fox', 'rabbit', 'bird'],
      allowedBlocks: FLAG_BLOCKS,
      goal: {
        expectations: [{ interaction: { kind: 'start' }, effects: [['$target', 'say_hello'], ['$target', 'raise_flag']] }],
        probes: [{ kind: 'click', actor: 'fox' }, { kind: 'click', actor: 'rabbit' }, { kind: 'click', actor: 'bird' }],
      },
      hints: [
        '按开始旗没动静，或者升旗的不是你选的主持人：积木拼错了角色。',
        '先在上面切到你选的主持人，在它名下拼；别的朋友名下空着。',
        '例如选小鸟：切到“小鸟”，拼“开始时” → 说早上好 → 升起彩旗。',
      ],
      solutions: [{ fox: ['when_start', 'say_hello', 'raise_flag'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'raise_flag', 'say_hello'] }, failure: 'wrong_order' },
        { scripts: { rabbit: ['when_start', 'say_hello', 'raise_flag'] }, failure: 'wrong_actor' },
        { scripts: { fox: ['when_clicked', 'say_hello', 'raise_flag'] }, failure: 'nothing_happened' },
      ],
    },
  ],
  review: {
    whatIf: '如果在另一位朋友名下也接一个“开始时 → 升起彩旗”，开幕式会怎样？',
    answer: '一按开始旗，两个开场同时演，彩旗可能在开幕词之前就升起来。开场只留一个“开始时”。',
  },
  reflection: '说一说：开幕式为什么要先说开幕词、再升彩旗？按下开始旗时，哪些角色会动？',
  reflectionCheck: {
    question: '按下开始旗时，哪些积木会运行？',
    options: [
      { text: '所有接在“开始时”下面的积木', correct: true },
      { text: '只有主持人的积木', correct: false },
      { text: '所有积木，不管接在哪个事件下面', correct: false },
    ],
    why: '开始旗一按，每个角色名下接了“开始时”的积木都会运行；接在“被点击时”下面的要等被点到。',
  },
  parentQuestion: '请孩子播放自己的“开幕式节目单”：按开始旗，看主持人是不是先说开幕词、彩旗再升起；再请孩子说说，如果彩旗先升起来，要挪哪一块积木。',
  project: { stepId: 'my-opening', title: '我的开幕式节目单', passedText: '真实运行：{target}主持，先说开幕词再升彩旗' },
}

// G0-U2-L03: the squirrel rings the forest bell; whoever listens for the bell responds.
const ringer = (over: Partial<EventActor> = {}): EventActor => ({ id: 'squirrel', name: '松鼠', can: ['send_bell', 'say_hello'], x: 24, y: 60, line: '早上好！', ...over })
const listener = (over: Partial<EventActor> = {}): EventActor => ({ id: 'rabbit', name: '小兔子', can: ['show_surprise', 'say_hello', 'send_bell'], x: 54, y: 62, ...over })
const sleeper = (over: Partial<EventActor> = {}): EventActor => ({ id: 'fox', name: '小狐狸', can: ['wake_up', 'say_hello', 'show_surprise', 'send_bell'], x: 80, y: 62, asleep: true, ...over })
const BELL: EventLevel = { actors: [ringer(), listener()], scenery: 'bell-tree' }
const BELL_FOX: EventLevel = { actors: [ringer(), listener(), sleeper()], scenery: 'bell-tree' }
const BELL_ANY: EventLevel = {
  actors: [ringer({ x: 20 }), listener({ x: 44 }), sleeper({ x: 66, asleep: false }), { id: 'bird', name: '小鸟', can: ['show_surprise', 'say_hello', 'send_bell'], x: 86, y: 58 }],
  scenery: 'bell-tree',
}
const BELL_BLOCKS = ['when_start', 'when_clicked', 'when_bell', 'send_bell', 'show_surprise']
const ringGoal: EventGoal = {
  expectations: [
    { interaction: { kind: 'start' }, effects: [] },
    { interaction: { kind: 'click', actor: 'squirrel' }, effects: [['squirrel', 'send_bell'], ['rabbit', 'show_surprise']] },
  ],
  probes: [{ kind: 'click', actor: 'rabbit' }],
}

const L03: EventLesson = {
  id: 'G0-U2-L03',
  title: '兔子收到消息',
  story: '铃铛树下，松鼠是送信员。点一下松鼠，它摇响森林铃铛；谁的积木挂在“听到铃铛时”下面，谁就会回应。小兔子听到铃铛，头顶冒出惊喜。',
  concept: '消息触发与角色响应',
  objectives: [
    '分清发送者和接收者：松鼠“摇响铃铛”，小兔子“听到铃铛时”才回应',
    '能先不发消息检验：没摇铃时小兔子不动，摇铃后才出现惊喜',
    '知道一条消息可以让好几位朋友同时回应，没在听的不会动',
  ],
  diagnoses: {
    nothing_happened: '点了松鼠，什么都没发生：松鼠要用“被点击时”来摇铃，小兔子要用“听到铃铛时”来接。看看是不是两人的事件弄反了。',
    missing_effect: '铃铛响了，可是还有朋友没回应：要回应的朋友名下要接“听到铃铛时”。',
    too_early: '还没摇铃，小兔子就先露出惊喜：它的事件选成了“开始时”。要等“听到铃铛时”才回应。',
    wrong_trigger: '点小兔子也有反应：小兔子不该自己动，它只听铃铛。',
    extra_effect: '多了不该有的动作：只有在听铃铛的朋友才回应，别人名下不要拼。',
    wrong_actor: '回应的不是要回应的那位：看看“听到铃铛时”拼在了谁的名下。',
    wrong_order: '顺序不对：先摇铃，听到铃铛的朋友才回应。',
    no_hat: '这段积木上面没有事件，它不知道什么时候开始。',
    hat_not_on_top: '事件积木要放在最上面。',
    disconnected: '有一块积木掉队了，没接在事件下面。',
    cannot_do: '这个角色做不了这块积木的动作。',
    loop: '铃铛一直在响：听到铃铛的朋友又去摇铃，停不下来。听的人别再摇铃。',
  },
  steps: [
    {
      id: 'sender-receiver-swapped',
      kind: 'error-lab',
      title: '错误实验：送信员和收信人弄反了',
      instruction: '小狐狸替大家拼了程序，可是把事件弄反了：松鼠用“听到铃铛时”，小兔子用“被点击时”。这是一个故意的错误：先按原样运行检查，看看点松鼠会发生什么，再把两人的事件换回来。',
      predict: '先猜一猜：点一下松鼠，铃铛会响吗？',
      predictChoices: [
        { text: '铃铛响了，小兔子露出惊喜', when: 'pass' },
        { text: '什么都没发生', when: 'nothing_happened' },
      ],
      errorLab: {
        expect: 'nothing_happened',
        expected: '点松鼠，它摇响铃铛；小兔子听到铃铛，头顶冒出惊喜。',
        actual: '什么都没发生：松鼠在等铃铛，小兔子在等被点，没有人先摇铃。',
      },
      level: BELL,
      editable: ['squirrel', 'rabbit'],
      allowedBlocks: BELL_BLOCKS,
      starter: { squirrel: [{ type: 'when_bell' }, { type: 'send_bell' }], rabbit: [{ type: 'when_clicked' }, { type: 'show_surprise' }] },
      goal: ringGoal,
      hints: [
        '点松鼠没反应：松鼠的积木在等铃铛，可是铃铛还没人摇。',
        '发消息的人用“被点击时”，收消息的人用“听到铃铛时”。',
        '松鼠：清空后拼“被点击时” → 摇响铃铛；小兔子：清空后拼“听到铃铛时” → 露出惊喜。',
      ],
      solutions: [{ squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'] }],
      counterExamples: [
        { scripts: { squirrel: ['when_bell', 'send_bell'], rabbit: ['when_clicked', 'show_surprise'] }, failure: 'nothing_happened' },
        { scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_clicked', 'show_surprise'] }, failure: 'missing_effect' },
      ],
    },
    {
      id: 'rabbit-hears-bell',
      kind: 'guided',
      title: '摇铃，小兔子回应',
      instruction: '自己拼一遍：点松鼠，它摇响铃铛；小兔子听到铃铛，露出惊喜。按开始旗、点小兔子，都不该有动静。',
      predict: '先猜一猜：小兔子用“开始时”可以吗？',
      level: BELL,
      editable: ['squirrel', 'rabbit'],
      allowedBlocks: BELL_BLOCKS,
      goal: ringGoal,
      hints: [
        '铃铛响了小兔子没反应，或者一开始小兔子就惊喜了：小兔子的事件不对。',
        '小兔子只听铃铛：用“听到铃铛时”，不用“开始时”或“被点击时”。',
        '松鼠：“被点击时” → 摇响铃铛；小兔子：“听到铃铛时” → 露出惊喜。',
      ],
      solutions: [{ squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'] }],
      counterExamples: [
        { scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_start', 'show_surprise'] }, failure: 'too_early' },
        { scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_clicked', 'show_surprise'] }, failure: 'missing_effect' },
        { scripts: { squirrel: ['when_clicked', 'show_surprise'] }, failure: 'cannot_do' },
      ],
    },
    {
      id: 'one-bell-two-friends',
      kind: 'practice-a',
      title: '练习 A：一个铃铛，两位朋友',
      instruction: '小狐狸也在铃铛树下睡觉。点松鼠摇一次铃：小兔子露出惊喜，小狐狸醒来说早上好。只摇一次铃，两位朋友都要听到。',
      predict: '先猜一猜：要摇两次铃吗？',
      level: BELL_FOX,
      editable: ['squirrel', 'rabbit', 'fox'],
      allowedBlocks: ['when_start', 'when_clicked', 'when_bell', 'send_bell', 'show_surprise', 'wake_up', 'say_hello'],
      goal: {
        expectations: [
          { interaction: { kind: 'start' }, effects: [] },
          { interaction: { kind: 'click', actor: 'squirrel' }, effects: [['squirrel', 'send_bell'], ['rabbit', 'show_surprise'], ['fox', 'wake_up'], ['fox', 'say_hello']] },
        ],
        probes: [{ kind: 'click', actor: 'rabbit' }, { kind: 'click', actor: 'fox' }],
      },
      hints: [
        '铃铛响了，可是有一位朋友没动：它没在听铃铛。',
        '一条消息，所有接了“听到铃铛时”的朋友都会回应。',
        '松鼠：被点击时 → 摇响铃铛；小兔子：听到铃铛时 → 露出惊喜；小狐狸：听到铃铛时 → 睁开眼睛 → 说早上好。',
      ],
      solutions: [{ squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'], fox: ['when_bell', 'wake_up', 'say_hello'] }],
      counterExamples: [
        { scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'], fox: ['when_clicked', 'wake_up', 'say_hello'] }, failure: 'missing_effect' },
        { scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'], fox: ['when_start', 'wake_up', 'say_hello'] }, failure: 'too_early' },
        { scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'], fox: ['when_bell', 'send_bell'] }, failure: 'loop' },
      ],
    },
    {
      id: 'surprise-too-early',
      kind: 'practice-b',
      title: '练习 B：还没摇铃就惊喜了',
      instruction: '松鼠的积木没问题，可是小兔子一按开始旗就露出惊喜，根本没等铃铛。先运行检查，看看小兔子什么时候动的，再改好：等听到铃铛才惊喜。',
      predict: '先猜一猜：要改松鼠，还是改小兔子？',
      level: BELL,
      editable: ['squirrel', 'rabbit'],
      allowedBlocks: BELL_BLOCKS,
      starter: { squirrel: [{ type: 'when_clicked' }, { type: 'send_bell' }], rabbit: [{ type: 'when_start' }, { type: 'show_surprise' }] },
      goal: ringGoal,
      hints: [
        '按开始旗小兔子就惊喜了：它没等铃铛。',
        '“开始时”一按开始旗就运行；要等消息，得换成“听到铃铛时”。',
        '切到小兔子，清空后拼“听到铃铛时” → 露出惊喜；松鼠的不用改。',
      ],
      solutions: [{ squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'] }],
      counterExamples: [{ scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_start', 'show_surprise'] }, failure: 'too_early' }],
    },
    {
      id: 'my-bell-card',
      kind: 'creative',
      title: '创意改造：铃铛响给谁听？',
      instruction: '小鸟也飞来了。由你来决定：先选一位收信的朋友，让它听到铃铛就露出惊喜；松鼠负责摇铃，别的朋友不回应。通过后，它就是你的“铃铛传话卡”作品。',
      predict: '先猜一猜：“听到铃铛时”要拼在谁的名下？',
      creative: { prompt: '铃铛响了，你想让谁露出惊喜？', choices: ['rabbit', 'fox', 'bird'], labels: ['小兔子', '小狐狸', '小鸟'] },
      level: BELL_ANY,
      editable: ['squirrel', 'rabbit', 'fox', 'bird'],
      allowedBlocks: BELL_BLOCKS,
      goal: {
        expectations: [
          { interaction: { kind: 'start' }, effects: [] },
          { interaction: { kind: 'click', actor: 'squirrel' }, effects: [['squirrel', 'send_bell'], ['$target', 'show_surprise']] },
        ],
        probes: [{ kind: 'click', actor: 'rabbit' }, { kind: 'click', actor: 'fox' }, { kind: 'click', actor: 'bird' }],
      },
      hints: [
        '铃铛响了，可是露出惊喜的不是你选的朋友：积木拼错了名下。',
        '松鼠负责摇铃；你选的朋友负责听铃铛，别的朋友名下空着。',
        '例如选小鸟：松鼠拼“被点击时 → 摇响铃铛”，小鸟拼“听到铃铛时 → 露出惊喜”。',
      ],
      solutions: [{ squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'] }],
      counterExamples: [
        { scripts: { squirrel: ['when_clicked', 'send_bell'], fox: ['when_bell', 'show_surprise'] }, failure: 'wrong_actor' },
        { scripts: { rabbit: ['when_bell', 'show_surprise'] }, failure: 'nothing_happened' },
        { scripts: { squirrel: ['when_clicked', 'send_bell'], rabbit: ['when_bell', 'show_surprise'], bird: ['when_bell', 'show_surprise'] }, failure: 'extra_effect' },
      ],
    },
  ],
  review: {
    whatIf: '如果小狐狸也接上“听到铃铛时 → 露出惊喜”，摇一次铃会怎样？',
    answer: '一次铃声，小兔子和小狐狸都会露出惊喜：所有接了“听到铃铛时”的朋友都会回应。',
  },
  reflection: '说一说：谁是送信的，谁是收信的？为什么小兔子不能用“开始时”？',
  reflectionCheck: {
    question: '想让小兔子“收到消息才惊喜”，它的积木最上面放哪个事件？',
    options: [{ text: '听到铃铛时', correct: true }, { text: '开始时', correct: false }, { text: '被点击时', correct: false }],
    why: '“听到铃铛时”等别人摇铃才运行；“开始时”一按开始旗就动；“被点击时”要点它自己。',
  },
  parentQuestion: '请孩子播放自己的“铃铛传话卡”：先按开始旗，看朋友们都没动；再点松鼠摇铃，看选中的朋友露出惊喜，说说谁送信、谁收信。',
  project: { stepId: 'my-bell-card', title: '我的铃铛传话卡', passedText: '真实运行：松鼠摇铃，{target}听到才惊喜' },
}

// G0-U2-L04: two friends come on stage one after the other — each has its own script and its own trigger.
const star = (over: Partial<EventActor> = {}): EventActor => ({ id: 'fox', name: '小狐狸', can: ['enter_stage', 'say_hello'], x: 34, y: 62, offstage: true, line: '大家好，我先来！', ...over })
const second = (over: Partial<EventActor> = {}): EventActor => ({ id: 'bird', name: '小鸟', can: ['enter_stage', 'say_hello'], x: 66, y: 60, offstage: true, line: '轮到我啦！', ...over })
const THEATRE: EventLevel = { actors: [star(), second()], scenery: 'two-doors' }
const THEATRE_THREE: EventLevel = {
  actors: [
    star({ x: 22 }),
    second({ x: 45 }),
    { id: 'rabbit', name: '小兔子', can: ['enter_stage', 'say_hello'], x: 66, y: 62, offstage: true, line: '轮到我啦！' },
    { id: 'frog', name: '小青蛙', can: ['enter_stage', 'say_hello'], x: 84, y: 64, offstage: true, line: '轮到我啦！' },
  ],
  scenery: 'two-doors',
}
const SHOW_BLOCKS = ['when_start', 'when_clicked', 'when_bell', 'enter_stage', 'say_hello']
const twoTurns: EventGoal = {
  expectations: [
    { interaction: { kind: 'start' }, effects: [['fox', 'enter_stage'], ['fox', 'say_hello']] },
    { interaction: { kind: 'click', actor: 'bird' }, effects: [['bird', 'enter_stage'], ['bird', 'say_hello']] },
  ],
  probes: [{ kind: 'click', actor: 'fox' }],
}

const L04: EventLesson = {
  id: 'G0-U2-L04',
  title: '切换两位朋友',
  story: '森林小剧场里，小狐狸和小鸟要分两次登台。每位朋友有自己的一段积木：先切到谁，就是在给谁拼。按开始旗小狐狸先上台，点小鸟它才接着上台，两人不会撞在一起。',
  concept: '角色身份与多事件',
  objectives: [
    '会切换角色：积木拼在谁的名下，就是谁在动',
    '给两位朋友安排两个不同的事件：开始旗一个，点角色一个',
    '能找出“小鸟抢在小狐狸前面”“两段积木都没触发”的原因并修好',
  ],
  diagnoses: {
    too_early: '小鸟抢在小狐狸前面上台了：小鸟的积木用了“开始时”，或者本该是小狐狸的积木拼到了小鸟名下。小鸟要等被点到才上台。',
    wrong_actor: '上台的不是该上台的那位：积木拼在了别的朋友名下。先切到要动的朋友，再拼。',
    nothing_happened: '触发了，可是没人上台：检查积木是不是拼在了对的朋友名下，事件选得对不对。',
    no_hat: '小狐狸的积木上面没有事件，永远不会开始。最上面先放“开始时”。',
    missing_effect: '还少一个动作：上台以后还要打招呼。',
    wrong_order: '顺序反了：先走上舞台，再打招呼。',
    wrong_trigger: '点小狐狸也有反应：小狐狸只听开始旗，点它不该再上一次台。',
    extra_effect: '多了不该有的动作：这一步只有一位朋友上台。',
    hat_not_on_top: '事件积木要放在最上面。',
    disconnected: '有一块积木掉队了，没接在事件下面。',
    cannot_do: '这个角色做不了这块积木的动作。',
  },
  steps: [
    {
      id: 'script-on-wrong-friend',
      kind: 'error-lab',
      title: '错误实验：积木拼错了朋友',
      instruction: '小兔子想让小狐狸先上台，可是没切换角色，把“开始时 → 走上舞台 → 说早上好”拼到了小鸟名下。这是一个故意的错误：先按原样运行检查，看看谁先上台，再把积木拼到对的朋友名下。',
      predict: '先猜一猜：按下开始旗，谁会先上台？',
      predictChoices: [
        { text: '小狐狸先上台', when: 'pass' },
        { text: '小鸟抢先上台', when: 'too_early' },
      ],
      errorLab: {
        expect: 'too_early',
        expected: '按开始旗，小狐狸先上台打招呼；点小鸟，小鸟再上台。',
        actual: '小鸟抢先上台了：积木拼在小鸟名下，开始旗一按，动的就是小鸟。',
      },
      level: THEATRE,
      editable: ['fox', 'bird'],
      allowedBlocks: SHOW_BLOCKS,
      starter: { bird: [{ type: 'when_start' }, { type: 'enter_stage' }, { type: 'say_hello' }] },
      goal: twoTurns,
      hints: [
        '开始旗一按，上台的是小鸟：这段积木拼在了小鸟名下。',
        '积木区上面的“给谁拼”就是在切换角色：切到谁，积木就属于谁。',
        '切到小鸟，把积木改成“被点击时 → 走上舞台 → 说早上好”；再切到小狐狸，拼“开始时 → 走上舞台 → 说早上好”。',
      ],
      solutions: [{ fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_clicked', 'enter_stage', 'say_hello'] }],
      counterExamples: [
        { scripts: { bird: ['when_start', 'enter_stage', 'say_hello'] }, failure: 'too_early' },
        { scripts: { fox: ['when_start', 'enter_stage', 'say_hello'] }, failure: 'nothing_happened' },
      ],
    },
    {
      id: 'fox-first',
      kind: 'guided',
      title: '小狐狸先登台',
      instruction: '先只排第一个节目：按开始旗，小狐狸走上舞台说“大家好，我先来！”。小鸟这次留在后台，点它也不上台。',
      predict: '先猜一猜：积木要拼在谁的名下？',
      level: THEATRE,
      editable: ['fox', 'bird'],
      allowedBlocks: SHOW_BLOCKS,
      goal: { expectations: [{ interaction: { kind: 'start' }, effects: [['fox', 'enter_stage'], ['fox', 'say_hello']] }], probes: [{ kind: 'click', actor: 'fox' }, { kind: 'click', actor: 'bird' }] },
      hints: [
        '上台的不是小狐狸，或者没人上台：看看积木在谁名下。',
        '先切到“小狐狸”，再拼；小鸟名下这次空着。',
        '小狐狸：“开始时” → 走上舞台 → 说早上好。',
      ],
      solutions: [{ fox: ['when_start', 'enter_stage', 'say_hello'] }],
      counterExamples: [
        { scripts: { bird: ['when_start', 'enter_stage', 'say_hello'] }, failure: 'wrong_actor' },
        { scripts: { fox: ['when_clicked', 'enter_stage', 'say_hello'] }, failure: 'nothing_happened' },
        { scripts: { fox: ['when_start', 'say_hello', 'enter_stage'] }, failure: 'wrong_order' },
      ],
    },
    {
      id: 'bird-second',
      kind: 'practice-a',
      title: '练习 A：两次登台',
      instruction: '把两个节目都排好：按开始旗，小狐狸先上台；点一下后台的小鸟，小鸟再上台说“轮到我啦！”。点小狐狸不会让它再上一次台。',
      predict: '先猜一猜：小鸟要用哪个事件，才不会和小狐狸撞在一起？',
      level: THEATRE,
      editable: ['fox', 'bird'],
      allowedBlocks: SHOW_BLOCKS,
      goal: twoTurns,
      hints: [
        '小鸟和小狐狸一起冲上台，或者点小鸟没反应：小鸟的事件不对。',
        '两位朋友用两个不同的事件：小狐狸听开始旗，小鸟听手指点它。',
        '小狐狸：开始时 → 走上舞台 → 说早上好；切到小鸟：被点击时 → 走上舞台 → 说早上好。',
      ],
      solutions: [{ fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_clicked', 'enter_stage', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_start', 'enter_stage', 'say_hello'] }, failure: 'too_early' },
        { scripts: { fox: ['when_start', 'enter_stage', 'say_hello'] }, failure: 'nothing_happened' },
        { scripts: { fox: ['when_clicked', 'enter_stage', 'say_hello'], bird: ['when_clicked', 'enter_stage', 'say_hello'] }, failure: 'nothing_happened' },
      ],
    },
    {
      id: 'nobody-came',
      kind: 'practice-b',
      title: '练习 B：两段积木都没触发',
      instruction: '演出开始了，可是谁也没上台：小狐狸的积木忘了事件，小鸟在等一个没人摇的铃铛。先运行检查，再把两位朋友的事件都改好。',
      predict: '先猜一猜：要改一位朋友，还是两位都要改？',
      level: THEATRE,
      editable: ['fox', 'bird'],
      allowedBlocks: SHOW_BLOCKS,
      starter: {
        fox: [{ type: 'enter_stage' }, { type: 'say_hello' }],
        bird: [{ type: 'when_bell' }, { type: 'enter_stage' }, { type: 'say_hello' }],
      },
      goal: twoTurns,
      hints: [
        '按开始旗没人上台：小狐狸的积木上面没有事件。',
        '修好小狐狸后还要试点小鸟：它在等铃铛，可是没人摇铃，要换成“被点击时”。',
        '小狐狸：清空后拼“开始时 → 走上舞台 → 说早上好”；小鸟：清空后拼“被点击时 → 走上舞台 → 说早上好”。',
      ],
      solutions: [{ fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_clicked', 'enter_stage', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['enter_stage', 'say_hello'], bird: ['when_bell', 'enter_stage', 'say_hello'] }, failure: 'no_hat' },
        { scripts: { fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_bell', 'enter_stage', 'say_hello'] }, failure: 'nothing_happened' },
      ],
    },
    {
      id: 'my-show-order',
      kind: 'creative',
      title: '创意改造：第二个节目请谁？',
      instruction: '小兔子和小青蛙也在后台等着。小狐狸照样第一个上台；第二个节目由你来定：选一位朋友，点它，它才上台。没被选中的朋友留在后台。通过后，它就是你的“小剧场节目单”作品。',
      predict: '先猜一猜：第二位朋友的积木用哪个事件？',
      creative: { prompt: '第二个上台的是谁？', choices: ['bird', 'rabbit', 'frog'], labels: ['小鸟', '小兔子', '小青蛙'] },
      level: THEATRE_THREE,
      editable: ['fox', 'bird', 'rabbit', 'frog'],
      allowedBlocks: SHOW_BLOCKS,
      goal: {
        expectations: [
          { interaction: { kind: 'start' }, effects: [['fox', 'enter_stage'], ['fox', 'say_hello']] },
          { interaction: { kind: 'click', actor: '$target' }, effects: [['$target', 'enter_stage'], ['$target', 'say_hello']] },
        ],
        probes: ['others'],
      },
      hints: [
        '点你选的朋友没反应，或者别的朋友也上台了：积木拼错了名下。',
        '小狐狸听开始旗；切到你选的朋友，用“被点击时”；其他朋友名下空着。',
        '例如选小青蛙：小狐狸“开始时 → 走上舞台 → 说早上好”，小青蛙“被点击时 → 走上舞台 → 说早上好”。',
      ],
      solutions: [{ fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_clicked', 'enter_stage', 'say_hello'] }],
      counterExamples: [
        { scripts: { fox: ['when_start', 'enter_stage', 'say_hello'], rabbit: ['when_clicked', 'enter_stage', 'say_hello'] }, failure: 'nothing_happened' },
        { scripts: { fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_start', 'enter_stage', 'say_hello'] }, failure: 'too_early' },
        { scripts: { fox: ['when_start', 'enter_stage', 'say_hello'], bird: ['when_clicked', 'enter_stage', 'say_hello'], rabbit: ['when_clicked', 'enter_stage', 'say_hello'] }, failure: 'wrong_trigger' },
      ],
    },
  ],
  review: {
    whatIf: '如果把小鸟的“被点击时”换成“开始时”，演出会怎样？',
    answer: '一按开始旗，小狐狸和小鸟一起冲上台，撞在一起。要分两次登台，就给两位朋友两个不同的事件。',
  },
  reflection: '说一说：怎么知道一段积木是谁的？为什么两位朋友要用不同的事件？',
  reflectionCheck: {
    question: '想让小鸟在小狐狸之后、被点到才上台，小鸟的积木最上面放什么？',
    options: [{ text: '被点击时', correct: true }, { text: '开始时', correct: false }, { text: '听到铃铛时', correct: false }],
    why: '“被点击时”等手指点到小鸟才运行；“开始时”会和小狐狸一起上台；“听到铃铛时”要有人摇铃。',
  },
  parentQuestion: '请孩子播放自己的“小剧场节目单”：按开始旗看小狐狸先上台，再点第二位朋友；问问孩子，这段积木是谁的、怎么看出来的。',
  project: { stepId: 'my-show-order', title: '我的小剧场节目单', passedText: '真实运行：小狐狸先上台，点{target}它再上台' },
}

export const g0u2EventLessons: Record<string, EventLesson> = { [L01.id]: L01, [L02.id]: L02, [L03.id]: L03, [L04.id]: L04 }

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
