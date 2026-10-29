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

export const g0u3LoopLessons: Record<string, GridLesson> = { 'G0-U3-L01': L01 }
