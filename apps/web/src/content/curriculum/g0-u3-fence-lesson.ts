import type { Cell, GridLevel } from '@/features/lessons/grid/grid-engine'
import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'
import { toGridBlocks, type GridLesson } from './g0-u1-grid-lessons'

const start = 'when_start'
const forward = 'move_forward'
const right = 'turn_right'
const left = 'turn_left'
const allowedBlocks = [start, forward, right, left, 'repeat_times']
const cycle = (times: number, ...body: Array<string | ProgramBlock>): ProgramBlock => ({ type: 'repeat_times', times, body: toGridBlocks(body) })
const fence = (side: number, x = 0): GridLevel => {
  const home = { x, y: 0, facing: 'right' as const }
  const moves = Array.from({ length: side }, (_, index) => index + 1)
  const route: Cell[] = [
    home,
    ...moves.map(step => ({ x: x + step, y: 0 })),
    ...moves.map(step => ({ x: x + side, y: step })),
    ...moves.map(step => ({ x: x + side - step, y: side })),
    ...moves.map(step => ({ x, y: side - step })),
  ]
  return { cols: 5, rows: 4, start: home, goal: home, route, goalFacing: 'right', repeatMode: 'single-layer' }
}
const square = (side: number) => [start, cycle(4, ...Array<string>(side).fill(forward), right)]
const unit = [forward, forward, right]
const two = fence(2)
const three = fence(3, 1)

export const fenceLesson: GridLesson = {
  id: 'G0-U3-L05',
  title: '用循环画围栏',
  layoutMode: 'golden',
  story: '小熊刚播下花种。小狐狸带来一卷围栏，走过一格就能铺好一段。循着花圃边上的虚线，帮小熊把四边围起来。',
  concept: '一边走几格，转一次弯。把走一边的动作放进一个重复积木，做四遍。',
  objectives: ['预测走完四边后的位置和方向', '用一层重复积木把“走一边、转一次”执行四遍', '根据舞台轨迹定位少走的一边或漏掉的转弯'],
  trialIntroduction: {
    title: '用积木帮小狐狸围起花圃',
    description: '五关分别练习补围栏、转弯、套用循环、检查朝向和自选边长。舞台会画出小狐狸真正走过的路径，程序和作品自动保存在本机。',
    action: '开始画围栏',
  },
  diagnoses: {
    wrong_route: '把已经铺好的围栏和白色虚线比一比：是哪一段还没有铺上，或者从哪里走偏了？',
    wrong_facing: '已经回到起点，看一看箭头是否和出发时一样向右。',
  },
  steps: [
    {
      id: 'missing-side', kind: 'error-lab', title: '观察少掉的一边',
      instruction: '小狐狸已经拼好三次“走两格、向右转”。先运行原来的程序，再补齐围栏。',
      predict: '走完三边，围栏会闭合吗？',
      predictChoices: [{ text: '会回到出发点', when: 'pass' }, { text: '还留下一个缺口', when: 'wrong_route' }],
      errorLab: { expect: 'wrong_route', expected: '四段实线和虚线围栏重合。', actual: '只走了三条边，左边还留着一个缺口。' },
      level: two, allowedBlocks, starterBlocks: toGridBlocks([start, cycle(3, ...unit)]),
      hints: ['左边还是白色虚线。', '一次重复铺一条边，方形有四边。', '把重复积木的 3 改成 4。'],
      solutions: [square(2)],
      counterExamples: [{ program: [start, cycle(3, ...unit)], failure: 'wrong_route' }, { program: [start], failure: 'wrong_route' }],
    },
    {
      id: 'one-corner', kind: 'guided', title: '先走一边，再转弯',
      instruction: '已经接好了两块“向前走”。先运行看看箭头，再从移动分类拖一块“向右转”接到最后，面朝下一条边。',
      predict: '向右走两格后再右转，箭头指向哪里？',
      level: { ...two, goal: { x: 2, y: 0 }, goalFacing: 'down', route: two.route!.slice(0, 3) },
      allowedBlocks,
      starterBlocks: toGridBlocks([start, forward, forward]),
      hints: ['转弯积木只转箭头，不会移动。', '先走到角上，才需要转弯。', '开始时 → 前进 → 前进 → 右转。'],
      solutions: [[start, ...unit], [start, cycle(2, forward), right]],
      counterExamples: [{ program: [start, forward, right, forward], failure: 'wrong_route' }, { program: [start, forward, forward], failure: 'wrong_facing' }],
    },
    {
      id: 'nested-square', kind: 'practice-a', title: '把一条边装进循环',
      instruction: '四条边都是两格。把两块“向前走”和一块“向右转”放进同一个重复积木，让这组动作做四遍。',
      predict: '这个重复积木做四遍，狐狸会转几次弯？',
      level: { ...two, repeatMode: 'single-layer-required' }, allowedBlocks,
      hints: ['每到转角前，先数小狐狸走了几格。', '重复一次，狐狸就走完一条边并转一次弯。', '把两块前进和一块右转直接放进“重复 4 次”。'],
      solutions: [square(2), [start, right, cycle(4, forward, forward, left), left]],
      counterExamples: [{ program: [start, cycle(4, forward, right)], failure: 'wrong_route' }, { program: [start, cycle(5, ...unit)], failure: 'wrong_route' }, { program: [start, cycle(4, cycle(2, forward), right)], failure: 'too_deep' }, { program: [start, ...unit, ...unit, ...unit, ...unit], failure: 'repeat_required' }],
    },
    {
      id: 'facing-check', kind: 'practice-b', title: '回到起点后面朝哪里？',
      instruction: '围栏已能闭合，但小狐狸最后面朝上。先观察箭头，再修复程序，让它和出发时一样面朝右。',
      predict: '如果省略最后一次转弯，位置和方向分别是什么？',
      level: two, allowedBlocks, starterBlocks: toGridBlocks([start, cycle(3, ...unit), forward, forward]),
      hints: ['围栏没有缺口，箭头还指着上方。', '回到起点只说明位置对了。', '最后两块前进下面再接一块右转。'],
      solutions: [[start, cycle(3, ...unit), ...unit], square(2)],
      counterExamples: [{ program: [start, cycle(3, ...unit), forward, forward], failure: 'wrong_facing' }, { program: [start, cycle(3, ...unit), forward, forward, left], failure: 'wrong_facing' }],
    },
    {
      id: 'my-fence', kind: 'creative', title: '为花圃选一个围栏',
      instruction: '给花苗选两格边长或三格边长。完成你的围栏后，可以回到作品卡播放。',
      predict: '如果每条边多一格，每次重复里要多放哪块积木？',
      level: two, allowedBlocks,
      creative: { prompt: '花圃每条边多长？', goalChoices: [two.goal, three.goal], labels: ['每边两格', '每边三格'], layouts: [two, three] },
      hints: ['每个转角都要踩到。', '边数一直是四，边长可以改变。', '选三格时，在“重复 4 次”里放三块前进，再接一块右转。'],
      solutions: [square(2), [start, right, cycle(4, forward, forward, left), left]],
      counterExamples: [{ program: [start, cycle(4, forward, right)], failure: 'wrong_route' }, { program: [start, cycle(3, ...unit)], failure: 'wrong_route' }],
    },
  ],
  reflection: '让小狐狸绕一个更大的正方形时，为什么还要重复四次？',
  reflectionCheck: {
    question: '每边从 2 格改成 3 格，哪一个次数要变？',
    options: [{ text: '每边前进的次数', correct: true }, { text: '绕四条边的次数', correct: false }],
    why: '每条边更长了，走过的格子要增加。方形还是只有四条边。',
  },
  parentQuestion: '请孩子播放围栏，手指跟着路径转四次弯。',
  review: { whatIf: '能从左边开始绕吗？', answer: '可以，先转向左边那条边的方向，反着走四边，回到起点后把箭头转回向右。' },
  project: { stepId: 'my-fence', title: '我的花圃围栏', passedText: '围栏已闭合，小狐狸回到起点并面朝右', showInPortfolio: true },
  completionBadge: '围栏工程师',
}
