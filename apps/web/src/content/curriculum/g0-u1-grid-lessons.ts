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
  parentQuestion: string
}

const P = (...types: string[]) => ['when_start', ...types]
const r = 'move_right_cell'
const l = 'move_left'
const u = 'move_up'
const d = 'move_down'
const f = 'move_forward'

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
  parentQuestion: '请孩子先说出要走几步，再拼积木运行，看看猜得对不对。',
}

export const g0u1GridLessons: Record<string, GridLesson> = {
  [L01.id]: L01,
  [L02.id]: L02,
  [L03.id]: L03,
}

export function getGridLesson(id: string): GridLesson | null {
  return g0u1GridLessons[id] ?? null
}
