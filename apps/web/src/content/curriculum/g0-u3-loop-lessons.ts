import type { FootColor, Footprint } from '@/features/lessons/grid/grid-engine'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'

import type { GridLesson } from './g0-u1-grid-lessons'

/**
 * G0-U3 循环与规律 (Hark A): lessons on the SYS-106 grid engine with the SYS-107
 * “重复 N 次” block. Every step is judged by a real engine run; the `solutions`
 * and `counterExamples` are checked in g0-u3-loop-lessons.test.ts. Trials stay
 * experimental until independent review and real child trials exist.
 */

const P = (...blocks: Array<string | ProgramBlock>) => ['when_start', ...blocks]
const rep = (times: number, ...body: string[]): ProgramBlock => ({ type: 'repeat_times', times, body: body.map(type => ({ type })) })
const f = 'move_forward'
const R = 'stamp_red'
const B = 'stamp_blue'

/** Footprints along row y starting at column 0, following a repeating colour unit. */
const trail = (unit: FootColor[], rounds: number, y = 1): Footprint[] =>
  Array.from({ length: unit.length * rounds }, (_, i) => ({ x: i, y, color: unit[i % unit.length] }))

const RB: FootColor[] = ['red', 'blue']

const L01: GridLesson = {
  id: 'G0-U3-L01',
  title: '蘑菇小路的规律',
  story: '小熊沿着蘑菇小路留下一串淡淡的脚印：红、蓝、红、蓝……雨快把它们冲掉了。小狐狸要找出脚印的规律，一边走一边把脚印重新印好，一直走到小熊的蘑菇屋。',
  concept: '找出重复单元，用“重复 N 次”把它做很多遍',
  objectives: [
    '能指出红蓝脚印里最小的重复单元是“红、蓝”',
    '会用“放脚印 + 向前走”拼出一个单元，再用“重复 N 次”做很多遍',
    '运行后能对照舞台说出第几个脚印乱了、少了几个，并改对',
  ],
  diagnoses: {
    wrong_pattern: '脚印的颜色顺序乱了。从第一个脚印读起：红、蓝、红、蓝……看看是哪一个没跟上。',
    pattern_short: '脚印还不够，小狐狸停在半路。数一数一个单元有几个脚印，要重复几次才够。',
    stamp_twice: '一格只能有一个脚印：放好一个脚印，先向前走一格，再放下一个。',
    not_at_goal: '脚印都对了，但小狐狸还没走到蘑菇屋。最后一个脚印后面还要再向前走一格。',
    out_of_bounds: '走过头了，蘑菇屋就在脚印的尽头。看看是不是重复的次数太多。',
    empty_repeat: '“重复”积木的大嘴巴里是空的：把“放脚印”和“向前走”放进它里面。',
  },
  steps: [
    {
      id: 'two-pairs-only',
      kind: 'error-lab',
      title: '错误实验：只印了两对',
      instruction: '小兔子已经拼好一段程序：重复 2 次“放红脚印、向前走、放蓝脚印、向前走”。这是一个故意的错误：先按原样运行，看看小路上有几个脚印，再想办法让脚印铺满整条小路。',
      predict: '先猜一猜：小狐狸能走到蘑菇屋吗？',
      predictChoices: [
        { text: '能，一直走到蘑菇屋', when: 'pass' },
        { text: '脚印不够，停在半路', when: 'pattern_short' },
      ],
      errorLab: {
        expect: 'pattern_short',
        expected: '如果重复次数够，小路上应该有 8 个红蓝脚印，小狐狸走到蘑菇屋。',
        actual: '只印了 4 个脚印就停下了：重复 2 次只做了两对“红、蓝”，还差两对。',
      },
      level: { cols: 9, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 8, y: 1 }, footprints: trail(RB, 4), scenery: 'mushroompath' },
      allowedBlocks: ['when_start', R, B, f, 'repeat_times'],
      starterBlocks: [{ type: 'when_start' }, rep(2, R, f, B, f)],
      hints: [
        '小路上只有 4 个脚印，后面 4 个淡淡的脚印还没印上。',
        '“重复”里面是一对“红、蓝”，重复几次就印几对。小路上一共有 4 对淡脚印。',
        '点开“重复”积木上的数字，把 2 改成 4，再运行。',
      ],
      solutions: [P(rep(4, R, f, B, f))],
      counterExamples: [
        { program: P(rep(2, R, f, B, f)), failure: 'pattern_short' },
        { program: P(rep(3, R, f, B, f)), failure: 'pattern_short' },
      ],
    },
    {
      id: 'find-the-unit',
      kind: 'guided',
      title: '找到最小的单元',
      instruction: '先只印一对：小路上有一个红脚印、一个蓝脚印，后面是蘑菇屋。用“放红脚印”“放蓝脚印”和“向前走一格”拼出来。记住：放好一个脚印，要先向前走一格，再放下一个。',
      predict: '先猜一猜：先放红脚印还是先放蓝脚印？',
      level: { cols: 3, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 2, y: 1 }, footprints: trail(RB, 1), scenery: 'mushroompath' },
      allowedBlocks: ['when_start', R, B, f],
      hints: [
        '看看淡淡的脚印：第一个是什么颜色？第二个呢？',
        '规律是“红、蓝”。每放一个脚印，都要往前走一格，才能放下一个。',
        '依次接：放红脚印 → 向前走一格 → 放蓝脚印 → 向前走一格。',
      ],
      solutions: [P(R, f, B, f)],
      counterExamples: [
        { program: P(B, f, R, f), failure: 'wrong_pattern' },
        { program: P(R, B, f, f), failure: 'stamp_twice' },
        { program: P(R, f, R, f), failure: 'wrong_pattern' },
        { program: P(R, f, B), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'repeat-four-pairs',
      kind: 'practice-a',
      title: '练习 A：重复四对脚印',
      instruction: '整条小路有 4 对红蓝脚印。可以把刚才那一对放进“重复 N 次”，选好次数；也可以一块一块接满。比一比哪种更省积木。',
      predict: '先猜一猜：一对脚印要重复几次，才能铺满 8 个脚印？',
      level: { cols: 9, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 8, y: 1 }, footprints: trail(RB, 4), scenery: 'mushroompath' },
      allowedBlocks: ['when_start', R, B, f, 'repeat_times'],
      hints: [
        '脚印少了就是重复次数少了，走出地图就是重复次数多了。',
        '一个单元是“红、蓝”两个脚印，8 个脚印就是 4 个单元。',
        '“重复 4 次”里面放：放红脚印、向前走一格、放蓝脚印、向前走一格。',
      ],
      solutions: [
        P(rep(4, R, f, B, f)),
        P(R, f, B, f, R, f, B, f, R, f, B, f, R, f, B, f),
        P(rep(2, R, f, B, f), rep(2, R, f, B, f)),
      ],
      counterExamples: [
        { program: P(rep(3, R, f, B, f)), failure: 'pattern_short' },
        { program: P(rep(5, R, f, B, f)), failure: 'out_of_bounds' },
        { program: P(rep(4, R, f, B)), failure: 'stamp_twice' },
        { program: P(rep(4, R, f)), failure: 'wrong_pattern' },
      ],
    },
    {
      id: 'swapped-colours',
      kind: 'practice-b',
      title: '练习 B：颜色顺序颠倒了',
      instruction: '小松鼠也拼了一段程序，可是小熊说“不对，不对！”。先运行，看看第一个脚印是什么颜色；再修好程序，让脚印和淡淡的规律一模一样。',
      predict: '先猜一猜：这段程序印出来的第一个脚印是什么颜色？',
      level: { cols: 9, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 8, y: 1 }, footprints: trail(RB, 4), scenery: 'mushroompath' },
      allowedBlocks: ['when_start', R, B, f, 'repeat_times'],
      starterBlocks: [{ type: 'when_start' }, rep(4, B, f, R, f)],
      hints: [
        '舞台提示第 1 个脚印就错了：应该是红色，印成了蓝色。',
        '重复会把里面的顺序原样再做很多遍：里面先蓝后红，每一对就都先蓝后红。',
        '只要把“重复”里面的“放蓝脚印”和“放红脚印”换个位置，次数不用改。',
      ],
      solutions: [P(rep(4, R, f, B, f))],
      counterExamples: [
        { program: P(rep(4, B, f, R, f)), failure: 'wrong_pattern' },
        { program: P(rep(4, R, f, R, f)), failure: 'wrong_pattern' },
      ],
    },
    {
      id: 'my-rhythm-path',
      kind: 'creative',
      title: '创意改造：我的节奏小路',
      instruction: '现在由你给小路设计新规律：先选一种节奏，小路上会出现淡淡的脚印；再用“重复 N 次”把它印出来，一直走到蘑菇屋。通过后，它就是你的“节奏小路”作品。',
      predict: '先猜一猜：你选的节奏里，一个单元有几个脚印？要重复几次？',
      creative: {
        prompt: '选一种脚印节奏：',
        goalChoices: [{ x: 4, y: 1 }, { x: 6, y: 1 }, { x: 9, y: 1 }],
        labels: ['红蓝 · 重复 2 次', '红红蓝 · 重复 2 次', '红蓝蓝 · 重复 3 次'],
        patterns: [trail(RB, 2), trail(['red', 'red', 'blue'], 2), trail(['red', 'blue', 'blue'], 3)],
      },
      level: { cols: 10, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 4, y: 1 }, footprints: trail(RB, 2), scenery: 'mushroompath' },
      allowedBlocks: ['when_start', R, B, f, 'repeat_times'],
      hints: [
        '脚印乱了或不够，看看你选的节奏和“重复”里面的顺序是不是一样。',
        '先找出一个单元有几个脚印（红蓝是 2 个，红红蓝是 3 个），每个脚印后面跟一块“向前走”。',
        '例如红红蓝：重复 2 次（放红脚印、向前走、放红脚印、向前走、放蓝脚印、向前走）。',
      ],
      solutions: [P(rep(2, R, f, B, f)), P(R, f, B, f, R, f, B, f)],
      counterExamples: [
        { program: P(R, f, B, f), failure: 'pattern_short' },
        { program: P(rep(2, B, f, R, f)), failure: 'wrong_pattern' },
      ],
    },
  ],
  review: {
    whatIf: '如果小路变长，有 6 对红蓝脚印，程序要怎么改？',
    answer: '“重复”里面的一对“红、蓝”不用动，只把次数改成 6。找到最小单元以后，长度变了只改次数。',
  },
  reflection: '说一说：为什么把一对“红、蓝”放进“重复 4 次”，就能印出 8 个脚印？',
  reflectionCheck: {
    question: '红蓝红蓝红蓝红蓝，最小的重复单元是哪一个？',
    options: [
      { text: '红、蓝', correct: true },
      { text: '红、红、蓝', correct: false },
      { text: '红蓝红蓝红蓝红蓝 整条', correct: false },
    ],
    why: '“红、蓝”是能一直重复下去的最小一段，重复 4 次就是 8 个脚印。',
  },
  parentQuestion: '请孩子展示“节奏小路”，问：如果把“重复”里面的顺序换一换，小路会变成什么样？',
  project: { stepId: 'my-rhythm-path', title: '我的节奏小路' },
}

const J = 'jump_forward'
const puddles = (...xs: number[]) => xs.map(x => ({ x, y: 1 }))

const L02: GridLesson = {
  id: 'G0-U3-L02',
  title: '重复走两步',
  story: '下过雨，小兔子回家的路上有一串小水坑：一个水坑、一块干地、又一个水坑……小兔子一跳刚好跳过一格。它要跳几下才能落在家门口的干地上？',
  concept: '固定次数重复：同一个动作做几次，就把次数设成几',
  objectives: [
    '能先数出要跳几下，再把“重复”的次数设成这个数',
    '会把“向前跳一下”放进“重复 N 次”，跳过一个个水坑',
    '跳少了、跳多了或落进水坑时，能看着舞台说出该改次数还是该改动作',
  ],
  diagnoses: {
    not_at_goal: '小兔子停在两个水坑中间，还没到家。数一数还差几个水坑，就再跳几下。',
    fell_in_water: '扑通！小兔子掉进水坑了。走一格会踩进水里，要用“向前跳一下”跳过去。',
    out_of_bounds: '跳过头了，家门口就在最后一个水坑后面。重复的次数多了，改小一点。',
    empty_repeat: '“重复”积木的大嘴巴里是空的：把“向前跳一下”放进它里面。',
    no_start: '程序没有“开始时”：“重复”要接在“开始时”下面才会运行。',
  },
  steps: [
    {
      id: 'only-one-hop',
      kind: 'error-lab',
      title: '错误实验：只跳一次',
      instruction: '小兔子的程序只有一块“向前跳一下”。路上有两个水坑，这是一个故意的错误：先按原样运行，看看小兔子停在哪里，再让它跳到家。',
      predict: '先猜一猜：只跳一下，小兔子能到家吗？',
      predictChoices: [
        { text: '能，跳到家门口', when: 'pass' },
        { text: '停在两个水坑中间', when: 'not_at_goal' },
      ],
      errorLab: {
        expect: 'not_at_goal',
        expected: '如果跳的次数够，小兔子应该跳过两个水坑，落在家门口。',
        actual: '小兔子只跳了一下，停在两个水坑中间：一下只能跳过一个水坑。',
      },
      level: { cols: 5, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 4, y: 1 }, water: puddles(1, 3), actor: 'rabbit', scenery: 'puddlesign' },
      allowedBlocks: ['when_start', J, f, 'repeat_times'],
      starterBlocks: [{ type: 'when_start' }, { type: J }],
      hints: [
        '小兔子停在两个水坑中间，前面还有一个水坑。',
        '一下“向前跳”只跳过一个水坑；有两个水坑，就要跳两下。',
        '清空后接“开始时”，再加“重复”，把“向前跳一下”放进去，次数选 2。',
      ],
      solutions: [P(rep(2, J)), P(J, J)],
      counterExamples: [
        { program: P(J), failure: 'not_at_goal' },
        { program: P(rep(3, J)), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'one-hop',
      kind: 'guided',
      title: '先学跳一下',
      instruction: '只有一个水坑，家就在水坑后面。走一格会踩进水里，试试“向前跳一下”：它会跳过一格，落在后面那一格。',
      predict: '先猜一猜：用“向前走一格”，小兔子会怎样？',
      level: { cols: 3, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 2, y: 1 }, water: puddles(1), actor: 'rabbit', scenery: 'puddlesign' },
      allowedBlocks: ['when_start', J, f],
      hints: [
        '掉进水坑，是因为“向前走一格”刚好走进了水里。',
        '“向前跳一下”一次跳过一格，水坑就在被跳过的那一格。',
        '接“开始时”，下面只放一块“向前跳一下”。',
      ],
      solutions: [P(J)],
      counterExamples: [
        { program: P(f), failure: 'fell_in_water' },
        { program: P(f, f), failure: 'fell_in_water' },
        { program: P(J, J), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'repeat-two-hops',
      kind: 'practice-a',
      title: '练习 A：重复跳两下',
      instruction: '两个水坑。先用手指比一比：第一下落在哪，第二下落在哪？再把“向前跳一下”放进“重复”，把次数设成你数出来的数。',
      predict: '先猜一猜：要重复几次，才能刚好落在家门口？',
      level: { cols: 5, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 4, y: 1 }, water: puddles(1, 3), actor: 'rabbit', scenery: 'puddlesign' },
      allowedBlocks: ['when_start', J, f, 'repeat_times'],
      hints: [
        '停在中间是跳少了，跳出地图是跳多了。',
        '一个水坑跳一下：两个水坑，就重复两次。',
        '“重复 2 次”里面放一块“向前跳一下”。',
      ],
      solutions: [P(rep(2, J)), P(J, J)],
      counterExamples: [
        { program: P(rep(3, J)), failure: 'out_of_bounds' },
        { program: P(rep(2, f)), failure: 'fell_in_water' },
        { program: P(J), failure: 'not_at_goal' },
      ],
    },
    {
      id: 'hop-then-step',
      kind: 'practice-b',
      title: '练习 B：先跳还是先走？',
      instruction: '这条路更长：水坑、干地、干地、水坑、干地、家。小松鼠拼了“重复 2 次（向前走一格、向前跳一下）”，结果小兔子一出门就掉进水里。先运行看看，再改好重复里面的顺序。',
      predict: '先猜一猜：重复里面先“走”还是先“跳”？',
      level: { cols: 7, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 6, y: 1 }, water: puddles(1, 4), actor: 'rabbit', scenery: 'puddlesign' },
      allowedBlocks: ['when_start', J, f, 'repeat_times'],
      starterBlocks: [{ type: 'when_start' }, rep(2, f, J)],
      hints: [
        '小兔子第一步就踩进了门口的水坑。',
        '重复会按里面的顺序一遍遍做：门口就是水坑，每一轮都要先跳过水坑，再走一格。',
        '把重复里面换成：向前跳一下、向前走一格，次数还是 2。',
      ],
      solutions: [P(rep(2, J, f)), P(J, f, J, f)],
      counterExamples: [
        { program: P(rep(2, f, J)), failure: 'fell_in_water' },
        { program: P(rep(2, J)), failure: 'fell_in_water' },
        { program: P(rep(3, J, f)), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'my-puddle-road',
      kind: 'creative',
      title: '创意改造：我的水坑小路',
      instruction: '雨下得有大有小：先选路上有几个水坑，再数一数要跳几下，用“重复”帮小兔子回家。通过后，它就是你的“水坑小路”作品。',
      predict: '先猜一猜：水坑多一个，重复的次数要怎么变？',
      creative: {
        prompt: '路上有几个水坑？',
        goalChoices: [{ x: 4, y: 1 }, { x: 6, y: 1 }, { x: 8, y: 1 }],
        labels: ['2 个水坑', '3 个水坑', '4 个水坑'],
        waters: [puddles(1, 3), puddles(1, 3, 5), puddles(1, 3, 5, 7)],
      },
      level: { cols: 9, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 4, y: 1 }, water: puddles(1, 3), actor: 'rabbit', scenery: 'puddlesign' },
      allowedBlocks: ['when_start', J, f, 'repeat_times'],
      hints: [
        '停在中间就是还没跳够，跳出地图就是跳多了。',
        '有几个水坑，就跳几下：重复的次数等于水坑的个数。',
        '例如 3 个水坑：“重复 3 次”里面放“向前跳一下”。',
      ],
      solutions: [P(rep(2, J)), P(J, J)],
      counterExamples: [
        { program: P(J), failure: 'not_at_goal' },
        { program: P(rep(2, f)), failure: 'fell_in_water' },
      ],
    },
  ],
  review: {
    whatIf: '如果路上有 5 个水坑，程序要怎么改？',
    answer: '“重复”里面还是一块“向前跳一下”，只把次数改成 5：一个水坑跳一下，几个水坑就重复几次。',
  },
  reflection: '说一说：为什么有两个水坑，就要把“重复”设成 2 次？',
  reflectionCheck: {
    question: '路上有 3 个水坑，每跳一下跳过一个，要重复几次？',
    options: [
      { text: '3 次', correct: true },
      { text: '1 次', correct: false },
      { text: '一直重复不停', correct: false },
    ],
    why: '一个水坑跳一下，3 个水坑就跳 3 下；重复的次数是固定的，到家就停。',
  },
  parentQuestion: '请孩子展示“水坑小路”，问：如果再多一个水坑，你会改哪一个数字？',
  project: { stepId: 'my-puddle-road', title: '我的水坑小路' },
}

const W = 'water_plant'
const pots = (...xs: number[]) => xs.map(x => ({ x, y: 1 }))

const L03: GridLesson = {
  id: 'G0-U3-L03',
  title: '花园浇水机器',
  story: '花园里排着一行小花盆，浇水机器人每天要巡一遍：走到一盆花前，浇一次水，再走到下一盆。每盆只要一份水，漏了会渴，多了会淹。',
  concept: '循环与批量任务：把“走过去 + 做一件事”组合起来，重复给每一个对象做一次',
  objectives: [
    '能把“向前走一格、给这盆花浇水”组合成一轮，再用“重复”做给每一盆',
    '能让重复的次数等于花盆的个数，既不漏浇也不多浇',
    '花盆之间隔着空地时，能改重复里面的步数，而不是只改次数',
  ],
  diagnoses: {
    pots_missed: '还有花盆没喝到水。是重复的次数少了，还是重复里面忘了放“给这盆花浇水”？',
    no_pot_here: '水洒在了没有花盆的地上。浇水前要先走到花盆那一格：看看重复里面是不是先浇水、后走路，或者少走了一步。',
    watered_twice: '同一盆花浇了两次，会淹坏的。浇完一盆，就先往前走，再浇下一盆。',
    out_of_bounds: '最后一盆浇完，机器人又往前走出了花园。重复的次数比花盆多了，改小一点。',
    empty_repeat: '“重复”积木的大嘴巴里是空的：把“向前走一格”和“给这盆花浇水”放进去。',
    no_start: '程序没有“开始时”：“重复”要接在“开始时”下面才会运行。',
  },
  steps: [
    {
      id: 'only-three-rounds',
      kind: 'error-lab',
      title: '错误实验：重复了三次',
      instruction: '机器人的程序是“重复 3 次（向前走一格、给这盆花浇水）”，可是花园里有四盆花。这是一个故意的错误：先按原样运行，数一数有几盆开了花，再修好它。',
      predict: '先猜一猜：重复 3 次，四盆花都能浇到吗？',
      predictChoices: [
        { text: '四盆都浇到了', when: 'pass' },
        { text: '最后一盆没浇到', when: 'pots_missed' },
      ],
      errorLab: {
        expect: 'pots_missed',
        expected: '如果次数对，四盆花都该喝到一份水、开出花来。',
        actual: '只重复了 3 轮，浇了 3 盆，最后一盆还是花苞，没喝到水。',
      },
      level: { cols: 5, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 4, y: 1 }, pots: pots(1, 2, 3, 4), actor: 'robot', scenery: 'wateringplan' },
      allowedBlocks: ['when_start', f, W, 'repeat_times'],
      starterBlocks: [{ type: 'when_start' }, rep(3, f, W)],
      hints: [
        '数一数：开花的有 3 盆，还有 1 盆是花苞。',
        '一轮浇一盆：四盆花，就要四轮。',
        '只把“重复”的次数从 3 改成 4，里面不用动。',
      ],
      solutions: [P(rep(4, f, W)), P(f, W, f, W, f, W, f, W)],
      counterExamples: [
        { program: P(rep(3, f, W)), failure: 'pots_missed' },
        { program: P(rep(5, f, W)), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'one-pot',
      kind: 'guided',
      title: '先浇一盆',
      instruction: '只有一盆花。机器人要先走到花盆那一格，再“给这盆花浇水”。顺序反了，水会洒在地上。',
      predict: '先猜一猜：先浇水再走过去，会怎样？',
      level: { cols: 3, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 1, y: 1 }, pots: pots(1), actor: 'robot', scenery: 'wateringplan' },
      allowedBlocks: ['when_start', f, W],
      hints: [
        '水洒在地上，是因为机器人还没走到花盆那一格。',
        '先走过去，再浇水；一盆花只浇一次。',
        '接“开始时”，下面放“向前走一格”，再放“给这盆花浇水”。',
      ],
      solutions: [P(f, W)],
      counterExamples: [
        { program: P(W, f), failure: 'no_pot_here' },
        { program: P(f, W, W), failure: 'watered_twice' },
        { program: P(f), failure: 'pots_missed' },
      ],
    },
    {
      id: 'four-pots',
      kind: 'practice-a',
      title: '练习 A：一轮一盆，浇四盆',
      instruction: '四盆花挨在一起。把“向前走一格、给这盆花浇水”放进“重复”，次数设成花盆的个数。只重复走路可不行：每一轮都要浇水。',
      predict: '先猜一猜：重复里面只放“向前走一格”，花会开吗？',
      level: { cols: 5, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 4, y: 1 }, pots: pots(1, 2, 3, 4), actor: 'robot', scenery: 'wateringplan' },
      allowedBlocks: ['when_start', f, W, 'repeat_times'],
      hints: [
        '走到了头花还没开，是因为重复里面没有浇水。',
        '一轮要做两件事：走过去、浇水。四盆就四轮。',
        '“重复 4 次”里面放：向前走一格、给这盆花浇水。',
      ],
      solutions: [P(rep(4, f, W)), P(f, W, f, W, f, W, f, W)],
      counterExamples: [
        { program: P(rep(4, f)), failure: 'pots_missed' },
        { program: P(rep(4, W, f)), failure: 'no_pot_here' },
        { program: P(rep(5, f, W)), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'spaced-pots',
      kind: 'practice-b',
      title: '练习 B：花盆隔开了',
      instruction: '这次每两盆花之间空着一格。小松鼠照搬了上一关的“重复 4 次（向前走一格、给这盆花浇水）”，结果第一次就浇在了空地上。先运行看看，再改重复里面要走几步。',
      predict: '先猜一猜：这次每一轮要走几格才到下一盆？',
      level: { cols: 9, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 8, y: 1 }, pots: pots(2, 4, 6, 8), actor: 'robot', scenery: 'wateringplan' },
      allowedBlocks: ['when_start', f, W, 'repeat_times'],
      starterBlocks: [{ type: 'when_start' }, rep(4, f, W)],
      hints: [
        '第一次浇水的那一格是空地，花盆还在前面一格。',
        '花盆隔一格放：每一轮要先走两格，再浇水。次数还是四盆四轮。',
        '“重复 4 次”里面放：向前走一格、向前走一格、给这盆花浇水。',
      ],
      solutions: [P(rep(4, f, f, W)), P(f, f, W, f, f, W, f, f, W, f, f, W)],
      counterExamples: [
        { program: P(rep(4, f, W)), failure: 'no_pot_here' },
        { program: P(rep(4, f, f)), failure: 'pots_missed' },
        { program: P(rep(5, f, f, W)), failure: 'out_of_bounds' },
      ],
    },
    {
      id: 'my-garden',
      kind: 'creative',
      title: '创意改造：我的小花园',
      instruction: '自己选一种花园：3 盆挨着、5 盆挨着，或者 3 盆隔开放。想好每一轮做什么、要几轮，帮机器人把花都浇好。通过后，它就是你的“我的小花园”作品。',
      predict: '先猜一猜：花盆多两盆，程序里哪个数字要变？',
      creative: {
        prompt: '要浇哪一种花园？',
        goalChoices: [{ x: 3, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }],
        labels: ['3 盆挨着', '5 盆挨着', '3 盆隔开'],
        pots: [pots(1, 2, 3), pots(1, 2, 3, 4, 5), pots(2, 4, 6)],
      },
      level: { cols: 7, rows: 3, start: { x: 0, y: 1, facing: 'right' }, goal: { x: 3, y: 1 }, pots: pots(1, 2, 3), actor: 'robot', scenery: 'wateringplan' },
      allowedBlocks: ['when_start', f, W, 'repeat_times'],
      hints: [
        '有花苞就是次数少了；水洒在地上就是这一轮走的步数不对。',
        '几盆花就重复几次；花盆挨着走一格，隔开走两格。',
        '例如 5 盆挨着：“重复 5 次（向前走一格、给这盆花浇水）”。',
      ],
      solutions: [P(rep(3, f, W)), P(f, W, f, W, f, W)],
      counterExamples: [
        { program: P(rep(2, f, W)), failure: 'pots_missed' },
        { program: P(rep(3, W, f)), failure: 'no_pot_here' },
      ],
    },
  ],
  review: {
    whatIf: '如果花园里有 6 盆挨着的花，程序要怎么改？',
    answer: '重复里面还是“向前走一格、给这盆花浇水”，只把次数改成 6：一轮浇一盆，几盆就几轮。',
  },
  reflection: '说一说：为什么“浇水”也要放进重复里面，而不是放在重复后面？',
  reflectionCheck: {
    question: '四盆花挨着放，下面哪个程序能每盆刚好浇一次？',
    options: [
      { text: '重复 4 次（向前走一格、给这盆花浇水）', correct: true },
      { text: '重复 4 次（向前走一格），然后给这盆花浇水', correct: false },
      { text: '重复 3 次（向前走一格、给这盆花浇水）', correct: false },
    ],
    why: '浇水放在重复里面，每一轮都会浇一盆；放在后面只浇最后一盆。四盆花要四轮。',
  },
  parentQuestion: '请孩子展示“我的小花园”，问：家里有几盆花？如果让机器人来浇，要重复几次？',
  project: { stepId: 'my-garden', title: '我的小花园' },
}

export const g0u3LoopLessons: Record<string, GridLesson> = { 'G0-U3-L01': L01, 'G0-U3-L02': L02, 'G0-U3-L03': L03 }
