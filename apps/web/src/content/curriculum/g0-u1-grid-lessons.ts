import type { GridFailure, GridLevel } from '@/features/lessons/grid/grid-engine'

/**
 * EDU-104 — G0-U1 rewritten per the TQ-001 review sheet and made playable on
 * the SYS-106 grid engine. Every step is judged by a real engine run; the
 * `solutions` / `counterExamples` are checked in g0-u1-grid-lessons.test.ts.
 * This replaces nothing in track-g0-detailed-lessons-v1.json (the L1 script
 * stays as history); trials are experimental (L3), never "published".
 */

export type GridStepKind = 'guided' | 'practice-a' | 'practice-b'

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
  starterBlocks?: Array<{ type: string; disconnected?: boolean }>
  /** Three layers: what you see → the idea → exactly what to do. */
  hints: [string, string, string]
  /** Full programs (when_start first) that must pass. */
  solutions: string[][]
  /** Programs that must fail, with the engine failure they must produce. */
  counterExamples: Array<{ program: string[]; failure: GridFailure }>
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
      kind: 'guided',
      title: '走出树屋',
      instruction: '积木区里已经有一块向右的箭头，可它没有“开始时”。先按运行看看会怎样，再添上“开始时”。',
      predict: '先猜一猜：没有“开始时”，小狐狸会动吗？',
      level: { cols: 3, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 1, y: 0 } },
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
      level: { cols: 4, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 } },
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
      level: { cols: 5, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 2, y: 0 }, water: [{ x: 3, y: 0 }, { x: 4, y: 0 }] },
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
      level: { cols: 4, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 } },
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
  ],
  reflection: '说一说：为什么没有“开始时”，小狐狸就不动？',
  reflectionCheck: {
    question: '没有“开始时”，小狐狸会怎样？',
    options: [{ text: '一动不动，等着出发', correct: true }, { text: '自己随便乱走', correct: false }, { text: '走得更快', correct: false }],
    why: '“开始时”就像发令枪，没有它，下面的积木都不会运行。',
  },
  parentQuestion: '请孩子演示：先拿掉“开始时”运行一次，再放回去运行一次，说说两次有什么不同。',
}

const L02: GridLesson = {
  id: 'G0-U1-L02',
  title: '给森林邮差指路',
  story: '小狐狸今天当森林邮差，要把信送到小伙伴的蘑菇屋。蘑菇屋有时在上面，有时在右边，路上还有一条小河。',
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
    not_at_goal: '小狐狸停在了别的格子，蘑菇屋还没到。对照提示里差几格，换方向或补一块。',
    disconnected: '有方向积木没接在队伍里。接好再运行。',
  },
  steps: [
    {
      id: 'deliver-up',
      kind: 'guided',
      title: '往上送信',
      instruction: '蘑菇屋在小狐狸正上方 2 格。选“向上走一格”，接 2 块。',
      predict: '先猜一猜：蘑菇屋在小狐狸的哪一边？',
      level: { cols: 3, rows: 3, start: { x: 1, y: 2, facing: 'up' }, goal: { x: 1, y: 0 } },
      allowedBlocks: ['when_start', u, d, l, r],
      hints: [
        '小狐狸往别的方向走了，箭头的方向和蘑菇屋的方向不一样。',
        '每块方向积木只管一件事：往哪边走一格。',
        '蘑菇屋在上面：接 2 块“向上走一格”。',
      ],
      solutions: [P(u, u)],
      counterExamples: [
        { program: P(r, r), failure: 'out_of_bounds' },
        { program: P(u), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'turn-corner',
      kind: 'guided',
      title: '拐个弯送信',
      instruction: '蘑菇屋在右上角。先横着走到蘑菇屋下面，再往上走；反过来先上后右也可以。',
      predict: '先猜一猜：横着要走几格，竖着要走几格？',
      level: { cols: 4, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 2, y: 0 } },
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
  ],
  reflection: '说一说：你选了哪条路？为什么不能直接穿过小河？',
  reflectionCheck: {
    question: '为什么不能直接穿过小河？',
    options: [{ text: '小狐狸会掉进河里', correct: true }, { text: '小河会自己变没', correct: false }, { text: '走河里更快', correct: false }],
    why: '小河是走不过去的格子，要换一排没有河的路绕过去。',
  },
  parentQuestion: '请孩子指着屏幕，说出自己的路线：“先往哪边走几格，再往哪边走几格”。',
}

const L03: GridLesson = {
  id: 'G0-U1-L03',
  title: '数一数，刚好走三步',
  story: '松鼠在第 4 格的蘑菇屋等小狐狸。小狐狸要刚好走到门口：少走够不着，多走就走过了。',
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
      id: 'exactly-three',
      kind: 'guided',
      title: '刚好三步',
      instruction: '蘑菇屋在第 4 格。数一数要走几格，接同样多的“向右走一格”。',
      predict: '先猜一猜：要走几步？',
      level: { cols: 6, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 } },
      allowedBlocks: ['when_start', r, f],
      hints: [
        '小狐狸停在蘑菇屋前面或后面，说明步数不对。',
        '走几步就要接几块积木，一块不多一块不少。',
        '数：1、2、3。接 3 块“向右走一格”。',
      ],
      solutions: [P(r, r, r), P(f, f, f)],
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
      level: { cols: 7, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 5, y: 0 } },
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
      level: { cols: 7, rows: 1, start: { x: 6, y: 0, facing: 'left' }, goal: { x: 4, y: 0 } },
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
      level: { cols: 5, rows: 1, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 3, y: 0 } },
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
  ],
  reflection: '说一说：少一步和多一步，小狐狸分别停在哪里？',
  reflectionCheck: {
    question: '蘑菇屋在右边 3 格，要放几块“向右走一格”？',
    options: [{ text: '3 块', correct: true }, { text: '2 块', correct: false }, { text: '4 块', correct: false }],
    why: '一块积木走一格：少一块停在前面，多一块就走出地图。',
  },
  parentQuestion: '请孩子先说出要走几步，再拼积木运行，看看猜得对不对。',
}

const L04: GridLesson = {
  id: 'G0-U1-L04',
  title: '转个弯，绕开大石头',
  story: '一块大石头挡住了直路。小狐狸不能穿过石头，要先转个弯，绕过去再走。',
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
      id: 'first-turn',
      kind: 'guided',
      title: '第一次转弯',
      instruction: '这一课只有“向前走、向左转、向右转”。小狐狸脸朝右：先向前走 1 格，再向左转（转身朝上），然后向前走 2 格。',
      predict: '先猜一猜：小狐狸脸朝右的时候，“向左转”会让它面朝哪边？',
      level: { cols: 3, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 1, y: 0 } },
      allowedBlocks: ['when_start', f, tl, tr],
      hints: [
        '小狐狸走出了地图或停错了地方，转弯的方向不对。',
        '“转”只改变脸朝哪边，不走路；转完再“向前走”才会动。',
        '向前走 1 格 → 向左转 → 向前走 2 格。',
      ],
      solutions: [P(f, tl, f, f), P(tl, f, f, tr, f)],
      counterExamples: [
        { program: P(f, tr, f), failure: 'out_of_bounds' },
        { program: P(f, tl), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'around-rock',
      kind: 'guided',
      title: '绕过大石头',
      instruction: '直走会撞到石头。先往上绕一格，再转回来向右走到终点蘑菇屋。',
      predict: '先猜一猜：一直向前走，会在第几步撞到石头？',
      level: { cols: 5, rows: 4, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 1 }, rocks: [{ x: 2, y: 2 }, { x: 2, y: 3 }] },
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
      level: { cols: 5, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 0 }, water: [{ x: 2, y: 0 }, { x: 2, y: 2 }] },
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
      level: { cols: 5, rows: 4, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 1 }, rocks: [{ x: 2, y: 2 }, { x: 2, y: 3 }] },
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
  ],
  reflection: '说一说：“向左转”和“向左走一格”有什么不一样？',
  reflectionCheck: {
    question: '小狐狸脸朝右，“向左转”以后脸朝哪边？',
    options: [{ text: '朝上', correct: true }, { text: '朝左', correct: false }, { text: '朝下', correct: false }],
    why: '转弯是站在小狐狸自己的位置转身：脸朝右时，它的左手在上面。',
  },
  parentQuestion: '请孩子站起来当小狐狸，跟着自己的程序转身、走路，看看会不会撞到“石头”。',
}

const L05: GridLesson = {
  id: 'G0-U1-L05',
  title: '先拿钥匙再开门',
  story: '树洞门锁着，金钥匙放在路上。小狐狸要先捡钥匙、再开门，最后才能走过去。顺序反了，门不会开。',
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
      id: 'key-then-door',
      kind: 'guided',
      title: '捡钥匙，开门',
      instruction: '向右走 2 格到钥匙上，“捡起钥匙”；再走 1 格到门边，“打开树洞门”；最后走 2 格到蘑菇屋。',
      predict: '先猜一猜：不捡钥匙直接往前走，会发生什么？',
      level: { cols: 6, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 }, key: { x: 2, y: 1 }, door: { x: 4, y: 1 }, rocks: [{ x: 4, y: 0 }, { x: 4, y: 2 }] },
      allowedBlocks: ['when_start', r, f, k, o],
      hints: [
        '小狐狸被门挡住了，门还锁着。',
        '要按顺序做三件事：捡钥匙 → 开门 → 走过去。',
        '向右 2 → 捡起钥匙 → 向右 1 → 打开树洞门 → 向右 2。',
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
      level: { cols: 6, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 }, key: { x: 1, y: 0 }, door: { x: 4, y: 1 }, rocks: [{ x: 4, y: 0 }, { x: 4, y: 2 }] },
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
      level: { cols: 6, rows: 3, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 5, y: 0 }, key: { x: 1, y: 2 }, door: { x: 3, y: 0 }, rocks: [{ x: 3, y: 1 }, { x: 3, y: 2 }] },
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
      level: { cols: 6, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 5, y: 1 }, key: { x: 2, y: 1 }, door: { x: 4, y: 1 }, rocks: [{ x: 4, y: 0 }, { x: 4, y: 2 }] },
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
  ],
  reflection: '说一说：为什么“捡起钥匙”一定要在“打开树洞门”前面？',
  reflectionCheck: {
    question: '哪个顺序能打开树洞门？',
    options: [{ text: '捡钥匙 → 开门 → 走过去', correct: true }, { text: '开门 → 捡钥匙 → 走过去', correct: false }, { text: '直接走过去', correct: false }],
    why: '开门要先有钥匙，所以“捡起钥匙”必须排在“打开树洞门”前面。',
  },
  parentQuestion: '请孩子把“捡钥匙”和“开门”两块积木对调后运行，说说门为什么打不开。',
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
  story: '森林向导请你给新来的小伙伴做一张寻路卡：路上有石头、小河，还有一扇锁着的树洞门。你的程序就是寻路卡。',
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
      id: 'warmup-key',
      kind: 'guided',
      title: '热身：拿钥匙，从门边过',
      instruction: '钥匙在路上，门在上面一排。捡钥匙后往上走一格到门边，开门再走到蘑菇屋。',
      predict: '先猜一猜：开门时，小狐狸要站在哪一格？',
      level: { cols: 5, rows: 3, start: { x: 0, y: 2, facing: 'right' }, goal: { x: 4, y: 1 }, key: { x: 2, y: 2 }, door: { x: 3, y: 1 }, rocks: [{ x: 3, y: 0 }, { x: 3, y: 2 }] },
      allowedBlocks: ['when_start', u, d, l, r, k, o],
      hints: [
        '门没开，或者离门太远。',
        '开门要站在门旁边那一格，并且手里已经有钥匙。',
        '向右 2 → 捡起钥匙 → 向上 1 → 打开树洞门 → 向右 2。',
      ],
      solutions: [P(r, r, k, u, o, r, r)],
      counterExamples: [{ program: P(r, r, u, o), failure: 'need_key' }],
    },
    {
      id: 'warmup-obstacles',
      kind: 'guided',
      title: '热身：石头和小河',
      instruction: '上面一排有石头，下面一排有小河。从中间那一排走过去，再往上到蘑菇屋。',
      predict: '先猜一猜：哪一排既没有石头也没有小河？',
      level: { cols: 5, rows: 3, start: { x: 0, y: 0, facing: 'right' }, goal: { x: 4, y: 0 }, rocks: [{ x: 2, y: 0 }], water: [{ x: 2, y: 2 }] },
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
      title: '练习 A：设计我的寻路卡',
      instruction: '大地图上有石头、小河和锁着的门。设计你自己的路线：拿到钥匙、开门、走到蘑菇屋。通过后，这条路线就是你的寻路卡作品。',
      predict: '先猜一猜：你打算先往上走，还是先往右走？',
      level: BIG_MAP,
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
      level: BIG_MAP,
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
  ],
  reflection: '说一说：你的寻路卡是怎么走的？修小伙伴的卡时，你改了哪一块？',
  reflectionCheck: {
    question: '小伙伴的寻路卡少了哪一块？',
    options: [{ text: '捡起钥匙', correct: true }, { text: '打开树洞门', correct: false }, { text: '开始时', correct: false }],
    why: '路过金钥匙时没有捡，门就打不开，所以要加上“捡起钥匙”。',
  },
  parentQuestion: '请孩子播放自己的寻路卡，一边播放一边讲：哪里转弯、哪里捡钥匙、哪里开门。',
  project: { stepId: 'my-route-card', title: '我的森林寻路卡' },
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
