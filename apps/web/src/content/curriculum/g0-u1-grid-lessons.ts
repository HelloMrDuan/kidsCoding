import type { Cell, Footprint, GridFailure, GridLevel } from '@/features/lessons/grid/grid-engine'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'

/** A program as lessons write it: block types, or (G0-U3) blocks with repeat bodies. */
export type GridProgram = Array<string | ProgramBlock>
export const toGridBlocks = (program: GridProgram): ProgramBlock[] => program.map(b => (typeof b === 'string' ? { type: b } : b))

/**
 * EDU-104 — G0-U1 rewritten per the TQ-001 review sheet and made playable on
 * the SYS-106 grid engine. Every step is judged by a real engine run; the
 * `solutions` / `counterExamples` are checked in g0-u1-grid-lessons.test.ts.
 * This replaces nothing in track-g0-detailed-lessons-v1.json (the L1 script
 * stays as history); trials are experimental (L3), never "published".
 */

/**
 * G0-U1 formal-course pass (Hark A, G0-U1-L01…): 'error-lab' is a planned
 * mistake the child must run and see before fixing it; 'creative' lets the
 * child change the map (where the goal sits) and then program their own route.
 */
export type GridStepKind = 'guided' | 'practice-a' | 'practice-b' | 'error-lab' | 'creative'

/** One of two concrete outcomes the child picks before running ('pass' = reaches the goal). */
export type GridPrediction = { text: string; when: 'pass' | GridFailure }

export type GridLessonStep = {
  id: string
  kind: GridStepKind
  title: string
  instruction: string
  /** Ask before running: the child predicts, then the stage confirms. */
  predict: string
  level: GridLevel
  allowedBlocks: string[]
  /** Program already in the workspace (debug practice); disconnected = loose block. */
  starterBlocks?: ProgramBlock[]
  /** Three layers: what you see → the idea → exactly what to do. */
  hints: [string, string, string]
  /** Full programs (when_start first) that must pass. */
  solutions: GridProgram[]
  /** Programs that must fail, with the engine failure they must produce. */
  counterExamples: Array<{ program: GridProgram; failure: GridFailure }>
  /** Two concrete outcomes to choose between before running; a wrong guess never blocks. */
  predictChoices?: [GridPrediction, GridPrediction]
  /** error-lab: the starter program must be run and produce this failure before a fix counts. */
  errorLab?: { expect: GridFailure; expected: string; actual: string }
  /** creative: the child places the goal on one of these cells, then programs a route to it. */
  creative?: { prompt: string; goalChoices: Cell[]; /** Story names for the choices, same order (e.g. who the letter goes to). */ labels?: string[]; /** G0-U3: the footprint pattern each choice asks for (same order as goalChoices). */ patterns?: Footprint[][]; /** G0-U3-L02: the puddles each choice puts on the path (same order as goalChoices). */ waters?: Cell[][]; /** G0-U3-L03: the flower pots each choice puts on the path (same order as goalChoices). */ pots?: Cell[][] }
}

export type GridLesson = {
  id: string
  title: string
  story: string
  concept: string
  objectives: string[]
  /** Lesson-specific diagnosis per engine failure, shown instead of the generic copy. */
  diagnoses: Partial<Record<GridFailure, string>>
  steps: GridLessonStep[]
  reflection: string
  /** EDU-105: one-tap check of the lesson's idea; the child's choice is saved with the lesson. */
  reflectionCheck: { question: string; options: Array<{ text: string; correct: boolean }>; why: string }
  parentQuestion: string
  /** 复盘: a what-if question with its answer, shown with the mistakes the child really met. */
  review?: { whatIf: string; answer: string }
  /** Unit project: the child's own program from this step becomes a saved, replayable card. */
  project?: { stepId: string; title: string }
}

const P = (...types: string[]) => ['when_start', ...types]
const r = 'move_right_cell'
const l = 'move_left'
const u = 'move_up'
const d = 'move_down'
const f = 'move_forward'
const tl = 'turn_left'
const tr = 'turn_right'
const k = 'pick_key'
const o = 'open_door'

const L01: GridLesson = {
  id: 'G0-U1-L01',
  title: '按下开始，小狐狸出发',
  story: '小狐狸住在树屋里，门口挂着两块指令牌：一块是黄色的“开始时”，一块画着向右的箭头。只有先有“开始时”，箭头才会动起来。',
  concept: '开始事件与一条动作顺序',
  objectives: [
    '知道“开始时”决定程序什么时候运行，没有它小狐狸不会动',
    '会把动作积木接在“开始时”下面，程序从上往下一块一块做',
    '运行后能看着舞台说出小狐狸停在第几格',
  ],
  diagnoses: {
    no_start: '小狐狸没有出发：程序缺了“开始时”，就像没吹出发哨。把箭头接在“开始时”下面再运行。',
    disconnected: '有一块箭头掉队了，没接在“开始时”下面，它不会运行。把它拖回去接好，或者清空后重新拼。',
    not_at_goal: '小狐狸停下了，可还没到蘑菇屋。数一数还差几格，再补上同样多的箭头。',
    fell_in_water: '扑通！多走了一格掉进小河。蘑菇屋就在河前面，去掉一块箭头。',
    out_of_bounds: '走过头了，再走就出了森林地图。数一数蘑菇屋在第几格。',
  },
  steps: [
    {
      id: 'leave-treehouse',
      kind: 'error-lab',
      title: '错误实验：没吹出发哨',
      instruction: '积木区里已经有一块向右的箭头，可它没有“开始时”。这是一个故意的错误：先按原样运行，亲眼看看会怎样，再添上“开始时”修好它。',
      predict: '先猜一猜：没有“开始时”，小狐狸会动吗？',
      predictChoices: [
        { text: '会往右走一格', when: 'pass' },
        { text: '一动不动', when: 'no_start' },
      ],
      errorLab: {
        expect: 'no_start',
        expected: '如果箭头自己会跑，小狐狸应该走到旁边一格。',
        actual: '小狐狸一动不动：没有“开始时”，下面的积木都不会运行。',
      },
      level: { cols: 3, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 1, y: 0 }, scenery: 'treehouse' },
      allowedBlocks: ['when_start', r],
      starterBlocks: [{ type: r }],
      hints: [
        '小狐狸一动不动，说明程序还没有被启动。',
        '“开始时”像出发的哨子，程序从它下面开始往下做。',
        '添上黄色的“开始时”，让蓝色箭头接在它的下面，再按运行。',
      ],
      solutions: [P(r)],
      counterExamples: [
        { program: [r], failure: 'no_start' },
        { program: P(), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'mushroom-house',
      kind: 'guided',
      title: '走到蘑菇屋',
      instruction: '蘑菇屋在第 4 格。从小狐狸开始数，要走几格就接几块箭头。小狐狸脸朝右，“向前走一格”也是往右走。',
      predict: '先猜一猜：要接几块箭头才刚好到蘑菇屋？',
      level: { cols: 4, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 }, scenery: 'treehouse' },
      allowedBlocks: ['when_start', r, f],
      hints: [
        '小狐狸停早了，或者走过了头，是箭头的数量不对。',
        '每块“走一格”只走一格，程序会从上到下一块一块做。',
        '用手指从小狐狸开始数格子：1、2、3，就接 3 块箭头。',
      ],
      solutions: [P(r, r, r), P(f, f, f), P(r, f, r)],
      counterExamples: [
        { program: P(r, r), failure: 'not_at_goal' },
        { program: P(r, r, r, r), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'stop-before-river',
      kind: 'practice-a',
      title: '练习 A：停在小河前',
      instruction: '这次蘑菇屋后面就是小河，多走一格就会掉下去。让小狐狸刚好停在蘑菇屋。',
      predict: '先猜一猜：如果多接一块箭头，会发生什么？',
      level: { cols: 5, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 2, y: 0 }, water: [{ x: 3, y: 0 }, { x: 4, y: 0 }], scenery: 'treehouse' },
      allowedBlocks: ['when_start', r, f],
      hints: [
        '掉进小河，说明箭头比要走的格子多。',
        '程序不会自己停下，接了几块就走几格。',
        '蘑菇屋只隔 2 格，只接 2 块箭头。',
      ],
      solutions: [P(r, r), P(f, f)],
      counterExamples: [{ program: P(r, r, r), failure: 'fell_in_water' }],
    },
    {
      id: 'fix-loose-block',
      kind: 'practice-b',
      title: '练习 B：找回掉队的积木',
      instruction: '小兔子拼的程序有一块箭头掉队了。先运行，看小狐狸停在哪；再把掉队的箭头接回“开始时”下面。',
      predict: '先猜一猜：掉队的箭头会不会跟着运行？',
      level: { cols: 4, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 }, scenery: 'treehouse' },
      allowedBlocks: ['when_start', r, f],
      starterBlocks: [{ type: 'when_start' }, { type: r }, { type: r }, { type: r, disconnected: true }],
      hints: [
        '运行时提示有积木没接上，那块箭头离开了队伍。',
        '只有连在“开始时”下面的积木才会运行，离开的不算。',
        '把掉队的箭头拖到最下面那块的下方，听到“咔哒”接好；也可以清空后重拼 3 块。',
      ],
      solutions: [P(r, r, r), P(r, r, f)],
      counterExamples: [{ program: P(r, r), failure: 'not_at_goal' }],
    },
    {
      id: 'my-start-card',
      kind: 'creative',
      title: '创意改造：蘑菇屋搬家',
      instruction: '这次由你来决定：先在下面选一格，把蘑菇屋搬过去；再拼出让小狐狸从树屋走到新蘑菇屋的程序。通过后，它就是你的“出发卡”作品。',
      predict: '先猜一猜：蘑菇屋搬得越远，要接的箭头会更多还是更少？',
      creative: { prompt: '把蘑菇屋搬到第几格？', goalChoices: [{ x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }] },
      level: { cols: 6, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 2, y: 0 }, scenery: 'treehouse' },
      allowedBlocks: ['when_start', r, f],
      hints: [
        '小狐狸没停在你放的蘑菇屋上，箭头的数量和你选的格子对不上。',
        '蘑菇屋搬到哪，就从小狐狸开始数到哪：隔几格就接几块箭头。',
        '例如蘑菇屋在第 3 格：从小狐狸数 1、2，就接 2 块箭头；在第 5 格就接 4 块。',
      ],
      solutions: [P(r, r), P(f, r)],
      counterExamples: [
        { program: P(r), failure: 'not_at_goal' },
        { program: P(), failure: 'not_at_goal' },
      ],
    },
  ],
  review: {
    whatIf: '如果把蘑菇屋再往右搬一格，程序要怎么改？',
    answer: '在最下面再接一块箭头。程序从上往下一块一块做，接几块就走几格。',
  },
  reflection: '说一说：为什么没有“开始时”，小狐狸就不动？',
  reflectionCheck: {
    question: '没有“开始时”，小狐狸会怎样？',
    options: [{ text: '一动不动，等着出发', correct: true }, { text: '自己随便乱走', correct: false }, { text: '走得更快', correct: false }],
    why: '“开始时”就像发令枪，没有它，下面的积木都不会运行。',
  },
  parentQuestion: '请孩子演示：先拿掉“开始时”运行一次，再放回去运行一次，说说两次有什么不同；再播放孩子自己的“出发卡”，问问蘑菇屋为什么搬到那里。',
  project: { stepId: 'my-start-card', title: '我的出发卡' },
}

const L02: GridLesson = {
  id: 'G0-U1-L02',
  title: '给森林邮差指路',
  story: '小狐狸今天当森林邮差。邮局门口立着一块路牌，四只箭头指向上、下、左、右。信要送到小伙伴的蘑菇屋，选对方向的箭头，信才能送到。',
  concept: '上下左右四个方向与路线顺序',
  objectives: [
    '能分清上、下、左、右四个方向积木，各走一格',
    '会把一条路线拆成“先横着走、再竖着走”两段',
    '能找出掉进小河的那一步并改正路线',
  ],
  diagnoses: {
    no_start: '信还没送出去：程序最上面要有“开始时”。',
    out_of_bounds: '走出地图了，方向选反了或者走多了。看看蘑菇屋在小狐狸的哪一边。',
    fell_in_water: '扑通！路线经过了蓝色的小河。换一条全是草地的路。',
    not_at_goal: '小狐狸停在了别的格子，蘑菇屋还没到。数一数还差几格，换方向或补一块。',
    disconnected: '有方向积木没接在队伍里。接好再运行。',
  },
  steps: [
    {
      id: 'wrong-way',
      kind: 'error-lab',
      title: '错误实验：箭头指反了',
      instruction: '蘑菇屋在小狐狸正上方 2 格，可小兔子拼的是两块“向下走一格”。这是一个故意的错误：先按原样运行，看看小狐狸往哪走，再把方向改对。',
      predict: '先猜一猜：用“向下”的箭头，小狐狸会走到哪里？',
      predictChoices: [
        { text: '往上走到蘑菇屋', when: 'pass' },
        { text: '往下走出地图', when: 'out_of_bounds' },
      ],
      errorLab: {
        expect: 'out_of_bounds',
        expected: '如果箭头方向对，小狐狸应该往上走 2 格，到达蘑菇屋。',
        actual: '小狐狸第一步就往下走出了地图：“向下”和蘑菇屋的方向正好相反。',
      },
      level: { cols: 3, rows: 3, start: { x: 1, y: 2, facing: 'up' }, goal: { x: 1, y: 0 }, scenery: 'signpost' },
      allowedBlocks: ['when_start', u, d, l, r],
      starterBlocks: [{ type: 'when_start' }, { type: d }, { type: d }],
      hints: [
        '小狐狸一下子就出了地图，它走的方向和蘑菇屋在的方向不一样。',
        '方向积木写着往哪边走：蘑菇屋在上面，就要用“向上”。',
        '把两块“向下走一格”换成两块“向上走一格”，再运行。',
      ],
      solutions: [P(u, u)],
      counterExamples: [
        { program: P(d, d), failure: 'out_of_bounds' },
        { program: P(u), failure: 'not_at_goal' },
        { program: P(r, r), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'turn-corner',
      kind: 'guided',
      title: '拐个弯送信',
      instruction: '蘑菇屋在右上角。先横着走到蘑菇屋下面，再往上走；反过来先上后右也可以。',
      predict: '先猜一猜：横着要走几格，竖着要走几格？',
      level: { cols: 4, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 2, y: 0 }, scenery: 'signpost' },
      allowedBlocks: ['when_start', u, d, l, r],
      hints: [
        '小狐狸到了另一个格子，方向或格数有一处不对。',
        '一条路可以拆成两段：先横着走，再竖着走；换个顺序也能到。',
        '横着 2 格、竖着 2 格：接 2 块“向右”和 2 块“向上”。',
      ],
      solutions: [P(r, r, u, u), P(u, u, r, r), P(r, u, r, u)],
      counterExamples: [{ program: P(r, r, r, u, u), failure: 'not_at_goal' }],
    },
    {
      id: 'around-river',
      kind: 'practice-a',
      title: '练习 A：绕开小河',
      instruction: '蘑菇屋在右上角，中间有一条小河。找一条不碰水的路，至少有两种走法。',
      predict: '先猜一猜：哪一排格子是干的？',
      level: {
        cols: 5, rows: 4,
        start: { x: 0, y: 3, facing: 'right' }, goal: { x: 4, y: 0 },
        water: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 1, y: 1 }],
        scenery: 'signpost',
      },
      allowedBlocks: ['when_start', u, d, l, r],
      hints: [
        '小狐狸掉进河里，说明路线经过了蓝色的水格。',
        '方向积木不会自己躲开小河，要我们挑一条干的路。',
        '沿最下面一排向右走到头（4 格），再向上走 3 格。',
      ],
      solutions: [P(r, r, r, r, u, u, u), P(u, u, u, r, r, r, r)],
      counterExamples: [{ program: P(u, r), failure: 'fell_in_water' }],
    },
    {
      id: 'fix-route',
      kind: 'practice-b',
      title: '练习 B：修好邮差的路线',
      instruction: '小兔子画的路线会掉进小河。先运行，看在哪一步掉下去，再改好。可以清空后重拼。',
      predict: '先猜一猜：小狐狸会在第几块积木掉进河里？',
      level: {
        cols: 4, rows: 3,
        start: { x: 0, y: 2, facing: 'right' }, goal: { x: 3, y: 0 },
        water: [{ x: 1, y: 1 }, { x: 2, y: 1 }],
        scenery: 'signpost',
      },
      allowedBlocks: ['when_start', u, d, l, r],
      starterBlocks: [{ type: 'when_start' }, { type: r }, { type: u }, { type: u }, { type: r }, { type: r }],
      hints: [
        '第一块“向上走一格”一运行就掉进了河里：向右一格后的上面正好是水格。',
        '要先走到没有水的那一列，再往上。',
        '先向上 2 格再向右 3 格；或者先向右 3 格再向上 2 格。',
      ],
      solutions: [P(u, u, r, r, r), P(r, r, r, u, u)],
      counterExamples: [{ program: P(r, u, u, r, r), failure: 'fell_in_water' }],
    },
    {
      id: 'my-route-card',
      kind: 'creative',
      title: '创意改造：信送给谁？',
      instruction: '这次由你来决定：先在下面选一位收信的小伙伴，蘑菇屋就搬到那一格；再拼出一条不碰小河的送信路线。通过后，它就是你的“送信路线卡”作品。',
      predict: '先猜一猜：你选的小伙伴在小狐狸的哪一边？要先横着走还是先竖着走？',
      creative: {
        prompt: '这封信送给谁？',
        goalChoices: [{ x: 3, y: 0 }, { x: 0, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 1 }],
        labels: ['小熊 · 右上角', '小兔 · 正上方', '小松鼠 · 上排中间', '小刺猬 · 右边中间'],
      },
      level: { cols: 4, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 3, y: 0 }, water: [{ x: 1, y: 1 }], scenery: 'signpost' },
      allowedBlocks: ['when_start', u, d, l, r],
      hints: [
        '小狐狸没停在你选的蘑菇屋上，或者掉进了小河：方向或格数有一处不对。',
        '先看蘑菇屋在小狐狸的哪一边，横着差几格、竖着差几格，再挑一条干的路。',
        '例如送给小熊：先向右 3 格，再向上 2 格；送给小兔：只要向上 2 格。',
      ],
      solutions: [P(r, r, r, u, u), P(u, u, r, r, r)],
      counterExamples: [
        { program: P(r, u), failure: 'fell_in_water' },
        { program: P(r, r, r, u), failure: 'not_at_goal' },
      ],
    },
  ],
  review: {
    whatIf: '如果小伙伴的蘑菇屋在小狐狸的左边，要用哪块方向积木？',
    answer: '用“向左走一格”。蘑菇屋在哪一边，就选指向那一边的箭头；隔几格就接几块。',
  },
  reflection: '说一说：你选了哪条路？为什么不能直接穿过小河？',
  reflectionCheck: {
    question: '蘑菇屋在小狐狸上面，应该用哪块积木？',
    options: [{ text: '向上走一格', correct: true }, { text: '向下走一格', correct: false }, { text: '随便哪块都行', correct: false }],
    why: '方向积木写着往哪边走，蘑菇屋在上面就要用“向上”；用反了会越走越远，甚至走出地图。',
  },
  parentQuestion: '请孩子播放自己的“送信路线卡”，指着屏幕说出路线：“先往哪边走几格，再往哪边走几格”，再问问为什么要绕开小河。',
  project: { stepId: 'my-route-card', title: '我的送信路线卡' },
}

const L03: GridLesson = {
  id: 'G0-U1-L03',
  title: '数一数，刚好走三步',
  story: '松鼠在蘑菇屋门口立了一块数数牌，牌上挂着三颗橡果：走一格，数一颗。小狐狸要刚好走到门口：少走够不着，多走就走过了。',
  concept: '动作次数与停在准确的位置',
  objectives: [
    '会先数格子，再接同样多的动作积木',
    '能看出“少一步”和“多一步”的区别，并说出差几格',
    '会用撤回最后一块，修好多走的程序',
  ],
  diagnoses: {
    no_start: '程序最上面缺“开始时”，小狐狸没出发。',
    not_at_goal: '小狐狸停的位置不对：看提示差几格、往哪边差，再加一块或撤回一块。',
    out_of_bounds: '走过头，出了地图。少接一块试试。',
    disconnected: '有积木没接上，接好再数一次。',
  },
  steps: [
    {
      id: 'one-short',
      kind: 'error-lab',
      title: '错误实验：少数了一步',
      instruction: '蘑菇屋在第 4 格，小兔子只接了 2 块“向右走一格”。这是一个故意的错误：先按原样运行，看看小狐狸停在哪，再补上缺的那一步。',
      predict: '先猜一猜：只接 2 块，小狐狸会停在哪？',
      predictChoices: [
        { text: '刚好停在蘑菇屋', when: 'pass' },
        { text: '停在蘑菇屋前面一格', when: 'not_at_goal' },
      ],
      errorLab: {
        expect: 'not_at_goal',
        expected: '如果步数够，小狐狸应该走 3 格，停在第 4 格的蘑菇屋。',
        actual: '小狐狸只走了 2 格，停在蘑菇屋前面一格：少一块积木，就少走一格。',
      },
      level: { cols: 6, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 }, scenery: 'counting' },
      allowedBlocks: ['when_start', r, f],
      starterBlocks: [{ type: 'when_start' }, { type: r }, { type: r }],
      hints: [
        '小狐狸停在蘑菇屋前面，还差一点点。',
        '走几步就要接几块积木：从小狐狸数到蘑菇屋，数出几格就接几块。',
        '数：1、2、3。在最下面再接 1 块“向右走一格”，一共 3 块。',
      ],
      solutions: [P(r, r, r), P(f, f, f), P(r, r, f)],
      counterExamples: [
        { program: P(r, r), failure: 'not_at_goal' },
        { program: P(r, r, r, r), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'longer-road',
      kind: 'guided',
      title: '更长的路：五步',
      instruction: '这次蘑菇屋在第 6 格。路长了也一样：先数，再接。',
      predict: '先猜一猜：比上一题多走几步？',
      level: { cols: 7, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 5, y: 0 }, scenery: 'counting' },
      allowedBlocks: ['when_start', r, f],
      hints: [
        '小狐狸停的格子和蘑菇屋差几格，提示里写着。',
        '路越长越要边数边接，接完再从上到下数一遍积木。',
        '接 5 块：可以都用“向右走一格”，也可以都用“向前走一格”。',
      ],
      solutions: [P(r, r, r, r, r), P(f, f, f, f, f), P(r, f, r, f, r)],
      counterExamples: [{ program: P(r, r, r, r), failure: 'not_at_goal' }],
    },
    {
      id: 'walk-left',
      kind: 'practice-a',
      title: '练习 A：反方向数格子',
      instruction: '这次小狐狸站在右边、脸朝左，蘑菇屋在它左边 2 格。用“向左走一格”或“向前走一格”。',
      predict: '先猜一猜：脸朝左时，“向前走”会往哪边？',
      level: { cols: 7, rows: 1, start: { x: 6, y: 0, facing: 'left' }, goal: { x: 4, y: 0 }, scenery: 'counting' },
      allowedBlocks: ['when_start', r, l, f],
      hints: [
        '小狐狸往右走就出地图了，方向反了。',
        '“向前”跟着脸的方向走；“向左”不管脸朝哪都往左。',
        '接 2 块“向左走一格”，或者 2 块“向前走一格”。',
      ],
      solutions: [P(l, l), P(f, f)],
      counterExamples: [
        { program: P(r), failure: 'out_of_bounds' },
        { program: P(l, l, l), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'one-step-too-far',
      kind: 'practice-b',
      title: '练习 B：多走了一步',
      instruction: '小兔子的程序走过了蘑菇屋。先运行看看差几格，再用“撤回最后一块”改好。',
      predict: '先猜一猜：这个程序会停在蘑菇屋的哪一边？',
      level: { cols: 5, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 }, scenery: 'counting' },
      allowedBlocks: ['when_start', r, f],
      starterBlocks: [{ type: 'when_start' }, { type: r }, { type: r }, { type: r }, { type: r }],
      hints: [
        '小狐狸停在蘑菇屋右边 1 格：多走了一步。',
        '多一块积木就多走一格，去掉多余的那块。',
        '按“撤回最后一块”，剩 3 块再运行。',
      ],
      solutions: [P(r, r, r), P(r, r, f)],
      counterExamples: [{ program: P(r, r, r, r), failure: 'not_at_goal' }],
    },
    {
      id: 'my-count-card',
      kind: 'creative',
      title: '创意改造：松鼠的蘑菇屋在哪？',
      instruction: '这次小狐狸站在路中间。由你来决定：先选一格，把松鼠的蘑菇屋放过去（左边、右边都可以）；再数一数，拼出刚好走到的程序。通过后，它就是你的“数数卡”作品。',
      predict: '先猜一猜：蘑菇屋在小狐狸的哪一边？要走几步？',
      creative: { prompt: '把松鼠的蘑菇屋放在第几格？', goalChoices: [{ x: 6, y: 0 }, { x: 0, y: 0 }, { x: 5, y: 0 }, { x: 1, y: 0 }] },
      level: { cols: 7, rows: 1, start: { x: 3, y: 0, facing: 'right' }, goal: { x: 6, y: 0 }, scenery: 'counting' },
      allowedBlocks: ['when_start', r, l],
      hints: [
        '小狐狸没停在你放的蘑菇屋上：步数或方向有一处不对。',
        '先看蘑菇屋在左边还是右边，选同一边的箭头；再数隔几格，就接几块。',
        '例如蘑菇屋在第 7 格：在右边，数 1、2、3，接 3 块“向右”；在第 1 格：在左边，接 3 块“向左”。',
      ],
      solutions: [P(r, r, r)],
      counterExamples: [
        { program: P(r, r), failure: 'not_at_goal' },
        { program: P(r, r, r, r), failure: 'out_of_bounds' },
        { program: P(l, l, l), failure: 'not_at_goal' },
      ],
    },
  ],
  review: {
    whatIf: '如果蘑菇屋离小狐狸 4 格，你接了 5 块，会停在哪？怎么改？',
    answer: '会走过头，停在蘑菇屋后面 1 格（地图不够长就会走出地图）。撤回最后一块，剩 4 块就刚好：走几步就接几块。',
  },
  reflection: '说一说：少一步和多一步，小狐狸分别停在哪里？',
  reflectionCheck: {
    question: '蘑菇屋在右边 3 格，要放几块“向右走一格”？',
    options: [{ text: '3 块', correct: true }, { text: '2 块', correct: false }, { text: '4 块', correct: false }],
    why: '一块积木走一格：少一块停在前面，多一块就走过头。',
  },
  parentQuestion: '请孩子播放自己的“数数卡”，先说出蘑菇屋在哪边、要走几步，再看小狐狸走得对不对。',
  project: { stepId: 'my-count-card', title: '我的数数卡' },
}

const L04: GridLesson = {
  id: 'G0-U1-L04',
  title: '转个弯，绕开大石头',
  story: '一块大石头挡住了直路。路口有块转弯牌，画着向左转、向右转两只弯箭头。小狐狸不能穿过石头，要先转个弯，绕过去再走。',
  concept: '转向与把路线分成几段',
  objectives: [
    '知道“向左转、向右转”只转身不走路，转完要再“向前走”',
    '会站在小狐狸的位置想：它的左边、右边在哪',
    '能把绕石头的路分成“走—转—走—转—走”几段',
  ],
  diagnoses: {
    no_start: '程序最上面缺“开始时”，小狐狸没出发。',
    hit_rock: '咚！撞到石头了：石头前要先转弯。转完身还要“向前走”才会离开。',
    out_of_bounds: '转错了方向，走出了地图。站在小狐狸的位置想：它脸朝右时，左手在上面。',
    fell_in_water: '扑通！掉进小河了。小桥在中间那一排，要先转到那一排再过河。',
    not_at_goal: '小狐狸停下了，还没到终点。看它脸朝哪边，再决定转弯还是向前走。',
    disconnected: '有积木没接上，接好再运行。',
  },
  steps: [
    {
      id: 'turn-not-walk',
      kind: 'error-lab',
      title: '错误实验：转了身却没走',
      instruction: '蘑菇屋就在小狐狸上面 1 格。小兔子的程序只有一块“向左转”。这是一个故意的错误：先按原样运行，看看小狐狸会不会走到蘑菇屋，再修好它。',
      predict: '先猜一猜：只有一块“向左转”，小狐狸会怎样？',
      predictChoices: [
        { text: '往上走到蘑菇屋', when: 'pass' },
        { text: '只转身，站在原地', when: 'not_at_goal' },
      ],
      errorLab: {
        expect: 'not_at_goal',
        expected: '如果“转”也会走路，小狐狸应该走到上面的蘑菇屋。',
        actual: '小狐狸只是转身朝上，还站在原地：转弯只改脸的方向，不走路，转完要再“向前走”。',
      },
      level: { cols: 3, rows: 3, start: { x: 1, y: 2, facing: 'right' }, goal: { x: 1, y: 1 }, scenery: 'turnsign' },
      allowedBlocks: ['when_start', f, tl, tr],
      starterBlocks: [{ type: 'when_start' }, { type: tl }],
      hints: [
        '小狐狸转了身，可是一步也没走。',
        '“转”只改变脸朝哪边，不走路；转完再“向前走”才会动。',
        '在“向左转”下面接 1 块“向前走一格”。',
      ],
      solutions: [P(tl, f)],
      counterExamples: [
        { program: P(tl), failure: 'not_at_goal' },
        { program: P(tr, f), failure: 'out_of_bounds' },
        { program: P(f), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'around-rock',
      kind: 'guided',
      title: '绕过大石头',
      instruction: '直走会撞到石头。先往上绕一格，再转回来向右走到终点蘑菇屋。',
      predict: '先猜一猜：一直向前走，会在第几步撞到石头？',
      level: { cols: 5, rows: 4, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 1 }, rocks: [{ x: 2, y: 2 }, { x: 2, y: 3 }], scenery: 'turnsign' },
      allowedBlocks: ['when_start', f, tl, tr],
      hints: [
        '小狐狸撞到了石头，说明它在石头前没有转弯。',
        '绕路分三段：往上一格、转回朝右、再一直走。',
        '向前 1 → 向左转 → 向前 1 → 向右转 → 向前 3。',
      ],
      solutions: [P(f, tl, f, tr, f, f, f), P(tl, f, tr, f, f, f, f)],
      counterExamples: [
        { program: P(f, f), failure: 'hit_rock' },
        { program: P(f, tl, f, f, f), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'cross-bridge',
      kind: 'practice-a',
      title: '练习 A：从小桥过河',
      instruction: '小河上只有中间一排是小桥。转到中间那一排，过桥后再转弯到右上角的蘑菇屋。',
      predict: '先猜一猜：一共要转几次弯？',
      level: { cols: 5, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 0 }, water: [{ x: 2, y: 0 }, { x: 2, y: 2 }], scenery: 'turnsign' },
      allowedBlocks: ['when_start', f, tl, tr],
      hints: [
        '掉进了小河：这一排没有桥。',
        '先转到中间那一排（小桥那排），过了桥再转向上。',
        '向左转 → 向前 1 → 向右转 → 向前 4 → 向左转 → 向前 1。',
      ],
      solutions: [P(tl, f, tr, f, f, f, f, tl, f), P(f, tl, f, tr, f, f, f, tl, f)],
      counterExamples: [{ program: P(f, f), failure: 'fell_in_water' }],
    },
    {
      id: 'wrong-turn',
      kind: 'practice-b',
      title: '练习 B：转错了方向',
      instruction: '小兔子的程序把两次转弯弄反了，小狐狸撞上了石头。先运行看它怎么走，再改好（可以清空后重拼）。',
      predict: '先猜一猜：小兔子的第一次转弯，让小狐狸往上还是往下？',
      level: { cols: 5, rows: 4, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 1 }, rocks: [{ x: 2, y: 2 }, { x: 2, y: 3 }], scenery: 'turnsign' },
      allowedBlocks: ['when_start', f, tl, tr],
      starterBlocks: [{ type: 'when_start' }, { type: f }, { type: tr }, { type: f }, { type: tl }, { type: f }, { type: f }, { type: f }],
      hints: [
        '小狐狸先往下走了一格，下面那排也被石头挡着。',
        '要往上绕：脸朝右时，“向左转”才是朝上。',
        '把“向右转”和“向左转”对调：向前 1 → 向左转 → 向前 1 → 向右转 → 向前 3。',
      ],
      solutions: [P(f, tl, f, tr, f, f, f)],
      counterExamples: [{ program: P(f, tr, f, tl, f, f, f), failure: 'hit_rock' }],
    },
    {
      id: 'my-turn-card',
      kind: 'creative',
      title: '创意改造：绕到哪位朋友家？',
      instruction: '大石头挡在小狐狸前面。由你来决定：先选一位朋友，蘑菇屋就搬到那一格；再用“向前走、向左转、向右转”拼出一条不撞石头的路。通过后，它就是你的“转弯路线卡”作品。',
      predict: '先猜一猜：去你选的朋友家，要转几次弯？第一次往左转还是往右转？',
      creative: {
        prompt: '要绕到哪位朋友家？',
        goalChoices: [{ x: 3, y: 2 }, { x: 1, y: 0 }, { x: 3, y: 0 }, { x: 0, y: 0 }],
        labels: ['小熊 · 石头后面', '小兔 · 上排第二格', '小松鼠 · 右上角', '小刺猬 · 左上角'],
      },
      level: { cols: 4, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 3, y: 2 }, rocks: [{ x: 2, y: 2 }], scenery: 'turnsign' },
      allowedBlocks: ['when_start', f, tl, tr],
      hints: [
        '小狐狸撞到了石头、走出了地图，或者停在了别的格子：有一次转弯或步数不对。',
        '先想朋友家在小狐狸的哪边；脸朝右时“向左转”朝上，朝上时“向右转”又朝右。每转一次，接着“向前走”。',
        '例如去小熊家：向前 1 → 向左转 → 向前 1 → 向右转 → 向前 2 → 向右转 → 向前 1。',
      ],
      solutions: [P(f, tl, f, tr, f, f, tr, f), P(tl, f, tr, f, f, f, tr, f)],
      counterExamples: [
        { program: P(f, f), failure: 'hit_rock' },
        { program: P(f, tl, f, tr, f, f), failure: 'not_at_goal' },
      ],
    },
  ],
  reflection: '说一说：“向左转”和“向左走一格”有什么不一样？',
  reflectionCheck: {
    question: '小狐狸脸朝右，“向左转”以后脸朝哪边？',
    options: [{ text: '朝上', correct: true }, { text: '朝左', correct: false }, { text: '朝下', correct: false }],
    why: '转弯是站在小狐狸自己的位置转身：脸朝右时，它的左手在上面。',
  },
  review: {
    whatIf: '如果小狐狸脸朝上，想往右走，要先接哪块积木？',
    answer: '先接“向右转”，让脸朝右，再接“向前走一格”。转弯只转身，走路靠“向前走”。',
  },
  parentQuestion: '请孩子播放自己的“转弯路线卡”，站起来当小狐狸，跟着程序转身、走路，说说每次转完脸朝哪边。',
  project: { stepId: 'my-turn-card', title: '我的转弯路线卡' },
}

const L05: GridLesson = {
  id: 'G0-U1-L05',
  title: '先拿钥匙再开门',
  story: '树洞门锁着，门口的挂钩牌上画着钥匙和小锁：先拿钥匙，才能开锁。金钥匙放在路上，小狐狸要先捡钥匙、再开门，最后才能走过去。顺序反了，门不会开。',
  concept: '先后顺序与前提条件',
  objectives: [
    '知道开门要有钥匙：“捡起钥匙”必须在“打开树洞门”前面',
    '会站在门旁边的格子再开门，开完门再走过去',
    '能找出顺序反了的那一块积木并改正',
  ],
  diagnoses: {
    no_start: '程序最上面缺“开始时”，小狐狸没出发。',
    door_locked: '咚！门还锁着就往前走了。要先捡钥匙、在门边开门，再走过去。',
    need_key: '门打不开：小狐狸手里没有钥匙。路过金钥匙时要用“捡起钥匙”。',
    no_key_here: '这里没有钥匙。先走到金钥匙那一格，再“捡起钥匙”。',
    not_at_door: '离门还远呢。走到紧挨着门的那一格，再“打开树洞门”。',
    not_at_goal: '门开了，但还没走到蘑菇屋。看还差几格。',
    out_of_bounds: '走出地图了，方向或格数不对。',
    hit_rock: '撞到石头了，门两边是石头，只能从门走。',
    disconnected: '有积木没接上，接好再运行。',
  },
  steps: [
    {
      id: 'locked-door',
      kind: 'error-lab',
      title: '错误实验：直接冲向锁着的门',
      instruction: '小兔子的程序是一直向右走 4 格，没有捡钥匙，也没有开门。这是一个故意的错误：先按原样运行，看看门会不会自己开，再按“捡钥匙 → 开门 → 走过去”修好。',
      predict: '先猜一猜：不捡钥匙一直往前走，会怎样？',
      predictChoices: [
        { text: '穿过门走到蘑菇屋', when: 'pass' },
        { text: '被锁着的门挡住', when: 'door_locked' },
      ],
      errorLab: {
        expect: 'door_locked',
        expected: '如果门不锁，小狐狸应该一路走到蘑菇屋。',
        actual: '咚！小狐狸撞在锁着的门上停下了：门不会自己开，要先捡钥匙、在门边开门。',
      },
      level: { cols: 6, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 }, key: { x: 2, y: 1 }, door: { x: 4, y: 1 }, rocks: [{ x: 4, y: 0 }, { x: 4, y: 2 }], scenery: 'keyhook' },
      allowedBlocks: ['when_start', r, f, k, o],
      starterBlocks: [{ type: 'when_start' }, { type: r }, { type: r }, { type: r }, { type: r }],
      hints: [
        '小狐狸被门挡住了，门还锁着。',
        '要按顺序做三件事：捡钥匙 → 开门 → 走过去。',
        '清空后重拼：向右 2 → 捡起钥匙 → 向右 1 → 打开树洞门 → 向右 2。',
      ],
      solutions: [P(r, r, k, r, o, r, r), P(f, f, k, f, o, f, f)],
      counterExamples: [
        { program: P(r, r, r, r), failure: 'door_locked' },
        { program: P(r, r, r, o), failure: 'need_key' },
      ],
    },
    {
      id: 'key-off-path',
      kind: 'guided',
      title: '钥匙不在路上',
      instruction: '这次钥匙在上面一排。先去拿钥匙，再回到门前开门。',
      predict: '先猜一猜：拿到钥匙后，要往哪边回到门前？',
      level: { cols: 6, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 }, key: { x: 1, y: 0 }, door: { x: 4, y: 1 }, rocks: [{ x: 4, y: 0 }, { x: 4, y: 2 }], scenery: 'keyhook' },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      hints: [
        '门打不开，或者“这里没有钥匙”：钥匙还没捡到。',
        '路线分三段：去拿钥匙 → 回到门边开门 → 走过门。',
        '向右 1 → 向上 1 → 捡起钥匙 → 向下 1 → 向右 2 → 打开树洞门 → 向右 2。',
      ],
      solutions: [P(r, u, k, d, r, r, o, r, r), P(u, r, k, d, r, r, o, r, r)],
      counterExamples: [
        { program: P(r, r, r, o), failure: 'need_key' },
        { program: P(r, k), failure: 'no_key_here' },
      ],
    },
    {
      id: 'key-far-away',
      kind: 'practice-a',
      title: '练习 A：绕远路拿钥匙',
      instruction: '门在右边一排石头中间，钥匙在左下角。自己设计路线：先拿钥匙，再开门，走到蘑菇屋。',
      predict: '先猜一猜：你的程序里，“捡起钥匙”应该排在“打开树洞门”的前面还是后面？',
      level: { cols: 6, rows: 3, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 5, y: 0 }, key: { x: 1, y: 2 }, door: { x: 3, y: 0 }, rocks: [{ x: 3, y: 1 }, { x: 3, y: 2 }], scenery: 'keyhook' },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      hints: [
        '门没开：钥匙还没捡，或者开门时不在门边。',
        '先下去拿钥匙，再上来回到门左边那一格开门。',
        '向下 2 → 向右 1 → 捡起钥匙 → 向上 2 → 向右 1 → 打开树洞门 → 向右 3。',
      ],
      solutions: [P(d, d, r, k, u, u, r, o, r, r, r), P(r, d, d, k, u, u, r, o, r, r, r)],
      counterExamples: [{ program: P(r, r, o), failure: 'need_key' }],
    },
    {
      id: 'forgot-key',
      kind: 'practice-b',
      title: '练习 B：忘了捡钥匙',
      instruction: '小兔子的程序路过钥匙却没有捡，门打不开。先运行看看，再把“捡起钥匙”放到对的位置（可以清空后重拼）。',
      predict: '先猜一猜：程序会在哪一块积木停下来？',
      level: { cols: 6, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 }, key: { x: 2, y: 1 }, door: { x: 4, y: 1 }, rocks: [{ x: 4, y: 0 }, { x: 4, y: 2 }], scenery: 'keyhook' },
      allowedBlocks: ['when_start', r, f, k, o],
      starterBlocks: [{ type: 'when_start' }, { type: r }, { type: r }, { type: r }, { type: o }, { type: r }, { type: r }],
      hints: [
        '停在“打开树洞门”：小狐狸手里没有钥匙。',
        '“捡起钥匙”要放在走到钥匙格之后、开门之前。',
        '向右 2 → 捡起钥匙 → 向右 1 → 打开树洞门 → 向右 2。',
      ],
      solutions: [P(r, r, k, r, o, r, r)],
      counterExamples: [{ program: P(r, r, r, k, o, r, r), failure: 'no_key_here' }],
    },
    {
      id: 'my-key-card',
      kind: 'creative',
      title: '创意改造：门后住着谁？',
      instruction: '门后面住着好几位朋友。由你来决定：先选一位，蘑菇屋就搬到那一格；再拼出“拿钥匙 → 开门 → 走到朋友家”的程序。通过后，它就是你的“开门卡”作品。',
      predict: '先猜一猜：你的程序里，三件事的顺序是什么？',
      creative: {
        prompt: '门后要去哪位朋友家？',
        goalChoices: [{ x: 5, y: 1 }, { x: 5, y: 0 }, { x: 4, y: 2 }, { x: 5, y: 2 }],
        labels: ['小熊 · 门正对面', '小兔 · 右上角', '小松鼠 · 门后下面', '小刺猬 · 右下角'],
      },
      level: { cols: 6, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 }, key: { x: 1, y: 0 }, door: { x: 3, y: 1 }, rocks: [{ x: 3, y: 0 }, { x: 3, y: 2 }], scenery: 'keyhook' },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      hints: [
        '门没开、撞到门或石头，或者停在了别的格子：三件事的顺序或位置不对。',
        '先去上面拿钥匙，再回到门左边那一格开门，走过门后再找朋友家。',
        '例如去小熊家：向右 1 → 向上 1 → 捡起钥匙 → 向下 1 → 向右 1 → 打开树洞门 → 向右 3。',
      ],
      solutions: [P(r, u, k, d, r, o, r, r, r), P(u, r, k, d, r, o, r, r, r)],
      counterExamples: [
        { program: P(r, r, r), failure: 'door_locked' },
        { program: P(r, r, o), failure: 'need_key' },
        { program: P(r, u, k, d, r, r), failure: 'door_locked' },
      ],
    },
  ],
  reflection: '说一说：为什么“捡起钥匙”一定要在“打开树洞门”前面？',
  reflectionCheck: {
    question: '哪个顺序能打开树洞门？',
    options: [{ text: '捡钥匙 → 开门 → 走过去', correct: true }, { text: '开门 → 捡钥匙 → 走过去', correct: false }, { text: '直接走过去', correct: false }],
    why: '开门要先有钥匙，所以“捡起钥匙”必须排在“打开树洞门”前面。',
  },
  review: {
    whatIf: '如果把“打开树洞门”放到“捡起钥匙”前面，会怎样？',
    answer: '门打不开：开门时手里还没有钥匙。要先捡钥匙、走到门边开门，再走过去。',
  },
  parentQuestion: '请孩子播放自己的“开门卡”，说说三件事的顺序；再把“捡钥匙”和“开门”对调运行一次，说说门为什么打不开。',
  project: { stepId: 'my-key-card', title: '我的开门卡' },
}

const BIG_MAP: GridLevel = {
  cols: 6, rows: 4,
  start: { x: 0, y: 3, facing: 'right' }, goal: { x: 5, y: 0 },
  key: { x: 1, y: 0 }, door: { x: 4, y: 0 },
  rocks: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }],
  water: [{ x: 3, y: 2 }, { x: 3, y: 3 }],
}

const L06: GridLesson = {
  id: 'G0-U1-L06',
  title: '做一张森林寻路卡',
  story: '森林向导摊开一张手绘地图，请你给新来的小伙伴做一张寻路卡：路上有石头、小河，还有一扇锁着的树洞门。你的程序就是寻路卡。',
  concept: '方向、顺序、调试综合（单元作品）',
  objectives: [
    '会把石头、小河、钥匙门放在一起想，设计一条完整路线',
    '路线可以有不同走法，只要真的能走到',
    '能修好别人的寻路卡，并说出改了哪一块',
  ],
  diagnoses: {
    no_start: '寻路卡最上面缺“开始时”。',
    hit_rock: '撞到石头了，换一条绕开石头的路。',
    fell_in_water: '掉进小河了，小河旁边要绕开走。',
    door_locked: '门还锁着就往前走了：先捡钥匙，在门边开门。',
    need_key: '门打不开：路过金钥匙时要“捡起钥匙”。',
    no_key_here: '这里没有钥匙，先走到金钥匙那一格。',
    not_at_door: '离门还远，走到紧挨着门的格子再开门。',
    out_of_bounds: '走出地图了，看看方向和格数。',
    not_at_goal: '还没到蘑菇屋，看看还差几格。',
    disconnected: '有积木没接上，接好再运行。',
  },
  steps: [
    {
      id: 'mixed-up-card',
      kind: 'error-lab',
      title: '错误实验：寻路卡排错了一块',
      instruction: '这张寻路卡的积木都对，可是有一块排错了位置：小狐狸还没走到钥匙那一格，就先“向上走”了。这是一个故意的错误：先按原样运行，看看在哪一步出问题，再把顺序排对。',
      predict: '先猜一猜：小狐狸会在哪一步出问题？',
      predictChoices: [
        { text: '一路顺利走到蘑菇屋', when: 'pass' },
        { text: '在没有钥匙的地方“捡钥匙”', when: 'no_key_here' },
      ],
      errorLab: {
        expect: 'no_key_here',
        expected: '如果顺序对，小狐狸应该先捡到钥匙，再上去开门，走到蘑菇屋。',
        actual: '小狐狸先往上走了一格，在没有钥匙的地方“捡钥匙”：积木一样，顺序错一块，结果就不一样。',
      },
      level: { cols: 5, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 1 }, key: { x: 2, y: 2 }, door: { x: 3, y: 1 }, rocks: [{ x: 3, y: 0 }, { x: 3, y: 2 }], scenery: 'guidemap' },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      starterBlocks: [{ type: 'when_start' }, { type: r }, { type: r }, { type: u }, { type: k }, { type: o }, { type: r }, { type: r }],
      hints: [
        '小狐狸在“捡起钥匙”那一步停下了：它脚下没有钥匙。',
        '钥匙在路上那一排。要先捡钥匙，再往上走到门边。',
        '把“捡起钥匙”换到“向上走一格”前面：向右 2 → 捡起钥匙 → 向上 1 → 打开树洞门 → 向右 2。',
      ],
      solutions: [P(r, r, k, u, o, r, r)],
      counterExamples: [
        { program: P(r, r, u, k, o, r, r), failure: 'no_key_here' },
        { program: P(r, r, u, o), failure: 'need_key' },
      ],
    },
    {
      id: 'warmup-obstacles',
      kind: 'guided',
      title: '热身：石头和小河',
      instruction: '上面一排有石头，下面一排有小河。从中间那一排走过去，再往上到蘑菇屋。',
      predict: '先猜一猜：哪一排既没有石头也没有小河？',
      level: { cols: 5, rows: 3, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 4, y: 0 }, rocks: [{ x: 2, y: 0 }], water: [{ x: 2, y: 2 }], scenery: 'guidemap' },
      allowedBlocks: ['when_start', u, d, l, r],
      hints: [
        '撞到石头或掉进小河，说明走的那一排不通。',
        '中间那一排是通的：先下到中间，走过去，再上来。',
        '向下 1 → 向右 4 → 向上 1。',
      ],
      solutions: [P(d, r, r, r, r, u), P(r, d, r, r, r, u)],
      counterExamples: [
        { program: P(r, r), failure: 'hit_rock' },
        { program: P(d, d, r, r), failure: 'fell_in_water' },
      ],
    },
    {
      id: 'my-route-card',
      kind: 'practice-a',
      title: '练习 A：大地图上走一遍',
      instruction: '大地图上有石头、小河和锁着的门。设计你自己的路线：拿到钥匙、开门、走到右上角的蘑菇屋。走法可以和别人不一样。',
      predict: '先猜一猜：你打算先往上走，还是先往右走？',
      level: { ...BIG_MAP, scenery: 'guidemap' },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      hints: [
        '被挡住了：看是石头、小河，还是门没开。',
        '先去左上角拿钥匙，再沿最上面一排走到门边。',
        '向上 3 → 向右 1 → 捡起钥匙 → 向右 2 → 打开树洞门 → 向右 2。',
      ],
      solutions: [P(u, u, u, r, k, r, r, o, r, r), P(r, u, u, u, k, r, r, o, r, r)],
      counterExamples: [
        { program: P(r, r), failure: 'hit_rock' },
        { program: P(u, u, u, r, r, r, o), failure: 'need_key' },
      ],
    },
    {
      id: 'fix-route-card',
      kind: 'practice-b',
      title: '练习 B：修好小伙伴的寻路卡',
      instruction: '新伙伴照着这张寻路卡走，门却打不开。先运行，找出少了哪一块，再改好（可以清空后重拼）。',
      predict: '先猜一猜：这张卡少了哪一块积木？',
      level: { ...BIG_MAP, scenery: 'guidemap' },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      starterBlocks: [{ type: 'when_start' }, { type: u }, { type: u }, { type: u }, { type: r }, { type: r }, { type: r }, { type: o }, { type: r }, { type: r }],
      hints: [
        '停在开门那一步：没有钥匙。',
        '经过金钥匙那一格时，要加一块“捡起钥匙”。',
        '向上 3 → 向右 1 → 捡起钥匙 → 向右 2 → 打开树洞门 → 向右 2。',
      ],
      solutions: [P(u, u, u, r, k, r, r, o, r, r)],
      counterExamples: [{ program: P(u, u, u, r, r, r, o, r, r), failure: 'need_key' }],
    },
    {
      id: 'my-forest-card',
      kind: 'creative',
      title: '单元作品：我的森林寻路卡',
      instruction: '森林向导请你做一张寻路卡。先选一位住在门后面的新伙伴，蘑菇屋就搬到那一格；再拼出“绕开石头和小河 → 拿钥匙 → 开门 → 走到伙伴家”的完整路线。通过后，它就是你的单元作品“我的森林寻路卡”。',
      predict: '先猜一猜：你的寻路卡里，要先去拿钥匙还是先去门边？过了门往哪边走？',
      creative: {
        prompt: '这张寻路卡给哪位新伙伴？',
        goalChoices: [{ x: 5, y: 0 }, { x: 5, y: 1 }, { x: 5, y: 2 }, { x: 5, y: 3 }],
        labels: ['小熊 · 门后第 1 排', '小兔 · 门后第 2 排', '小松鼠 · 门后第 3 排', '小刺猬 · 门后最下面'],
      },
      level: { ...BIG_MAP, scenery: 'guidemap' },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      hints: [
        '被挡住了：看是石头、小河、门没开，还是停在了别的格子。',
        '先去左上角拿钥匙，沿最上面一排走到门边开门；过了门，伙伴住第几排，就往下走几格。',
        '例如给小熊：向上 3 → 向右 1 → 捡起钥匙 → 向右 2 → 打开树洞门 → 向右 2；给小刺猬还要再向下 3。',
      ],
      solutions: [P(u, u, u, r, k, r, r, o, r, r), P(r, u, u, u, k, r, r, o, r, r)],
      counterExamples: [
        { program: P(r, r), failure: 'hit_rock' },
        { program: P(u, u, u, r, r, r, o), failure: 'need_key' },
        { program: P(u, u, u, r, k, r, r, r), failure: 'door_locked' },
      ],
    },
  ],
  reflection: '说一说：你的寻路卡是怎么走的？修小伙伴的卡时，你改了哪一块？',
  reflectionCheck: {
    question: '小伙伴的寻路卡少了哪一块？',
    options: [{ text: '捡起钥匙', correct: true }, { text: '打开树洞门', correct: false }, { text: '开始时', correct: false }],
    why: '路过金钥匙时没有捡，门就打不开，所以要加上“捡起钥匙”。',
  },
  review: {
    whatIf: '如果新伙伴搬到门后最下面一格，你的寻路卡要怎么改？',
    answer: '前面拿钥匙、开门的部分不用改，过了门再接 3 块“向下走一格”。先想清楚每一段，再一段一段接起来。',
  },
  parentQuestion: '请孩子播放自己的寻路卡，一边播放一边讲：哪里绕开石头和小河、哪里捡钥匙、哪里开门、伙伴住在哪。',
  project: { stepId: 'my-forest-card', title: '我的森林寻路卡' },
}

export const g0u1GridLessons: Record<string, GridLesson> = {
  [L01.id]: L01,
  [L02.id]: L02,
  [L03.id]: L03,
  [L04.id]: L04,
  [L05.id]: L05,
  [L06.id]: L06,
}

export function getGridLesson(id: string): GridLesson | null {
  return g0u1GridLessons[id] ?? null
}
