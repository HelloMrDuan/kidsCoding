// G2-U3-L02《接住掉落水果》课程契约与教学活动。
// 契约字段与 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md（p0-kitten-workspace-v1.0）一一对应。
// 共享 LessonWorkspace（PR #469，Draft）合并前，这里用本地结构类型；合并后换成共享类型，字段不变。
//
// 课程文案不含任何标准答案：三级提示逐级给方向、知识点、局部做法，从不给完整积木排列。
// 参考做法只在“通过本关之后”的环节出现（见 reference.ts）。

import {
  L02_LESSON_ID, L02_LEVELS, L02_PARAMS, framesToLand, type LevelId, type LevelParams,
} from './params'

export type L02Contract = {
  lessonId: string
  title: string
  /** 恰 5 条：学什么 / 解决什么问题 / 学完能做什么 / 和上节课的联系 / 当前步骤。 */
  goal5: [string, string, string, string, string]
  brief: string
  step: string
  hints: [string, string, string]
  engine: 'scratch-vm'
  judging: { stageRule: string; taskRule: string; knowledgeRule: string; scopeLabel: '教学定向' | '开放创作' }
  draftKey: `kidscoding-draft:${string}`
}

export const L02_CONTRACT: L02Contract = {
  lessonId: L02_LESSON_ID,
  title: '接住掉落水果',
  goal5: [
    '今天学：看水果的 x 坐标，算出篮子要往哪边走、走多远，再用“重复执行”走过去',
    '要解决的问题：让篮子接住从天上落下来的水果',
    '学完你能：水果换位置、掉得更快，也能自己改程序接住它',
    '和上节课的联系：上节课用方向键改小船的 x；这节课让程序自己重复地移动篮子',
    '现在要做：先预测，再搭脚本并运行一次，看水果有没有被接住',
  ],
  brief: '水果从天上落下来，只有篮子在水果落地时对准它才能接住。先判断，再动手，再看真实结果。',
  step: '先预测，再搭脚本并运行一次',
  hints: [
    '先看水果的 x 和篮子的 x：水果在篮子的哪一边？一共差多远？',
    '想一想上节课和以前学过的：“将 x 坐标增加”改变位置，“重复执行”把同一步走很多次。',
    '试试先让篮子走一个大步，再数数还差几个这样的大步；具体的数字要自己算。',
  ],
  engine: 'scratch-vm',
  judging: {
    stageRule: '舞台结果：水果落到篮子高度那一帧，读取水果和篮子真实的 x，相差不超过篮子半宽算接住',
    taskRule: '任务判定：篮子真实移动过，并且在那一帧接住了水果',
    knowledgeRule: '知识证据：“重复执行”里的移动积木真实运行至少 2 次，并且重复贡献了篮子至少一半的位移',
    scopeLabel: '教学定向',
  },
  draftKey: `kidscoding-draft:${L02_LESSON_ID}`,
}

export function validateL02Contract(c: L02Contract): string[] {
  const errors: string[] = []
  if (!c.lessonId) errors.push('lessonId 缺失')
  if (!c.title) errors.push('title 缺失')
  if (!Array.isArray(c.goal5) || c.goal5.length !== 5 || c.goal5.some(g => !g)) errors.push('goal5 必须恰好 5 条非空')
  if (!Array.isArray(c.hints) || c.hints.length !== 3 || c.hints.some(h => !h)) errors.push('hints 必须恰好 3 条非空')
  if (c.engine !== 'scratch-vm') errors.push('engine 必须是 scratch-vm')
  if (c.draftKey !== `kidscoding-draft:${c.lessonId}`) errors.push('draftKey 与 lessonId 不一致')
  if (!c.judging.scopeLabel) errors.push('scopeLabel 缺失')
  return errors
}

export type Prediction = {
  question: string
  /** 数字预测：篮子最后停在 x 等于多少。 */
  numberLabel: string
  choiceLabel: string
  choices: [string, string]
}

export type LevelContent = {
  id: LevelId
  layer: 1 | 2 | 3
  layerName: '探索与预测' | '独立挑战' | '迁移应用'
  title: string
  /** 给孩子看的任务说明：只写目标，不写积木排列。 */
  task: string
  /** 本关“现在要做什么”。 */
  step: string
  /** 本关是否是只读演示（探索层）：脚本固定，孩子只预测和观察。 */
  readOnly: boolean
  prediction?: Prediction
  /** 三级提示：1 方向，2 知识点，3 局部做法。本关专属，不含完整答案。 */
  hints: [string, string, string]
  /** 通过之后才显示的反思问题。 */
  reflection: string[]
}

export function levelSituation(level: LevelParams): string {
  const side = level.fruitX > L02_PARAMS.basketStartX ? '右边' : '左边'
  return `水果在 x=${level.fruitX}（篮子的${side}），篮子从 x=${L02_PARAMS.basketStartX} 出发。`
}

export const L02_DEMO_REPEAT = 2
export const L02_DEMO_STEP = 20

export const L02_CONTENT: Record<LevelId, LevelContent> = {
  explore: {
    id: 'explore',
    layer: 1,
    layerName: '探索与预测',
    title: '第一关：先猜一猜',
    task: `${levelSituation(L02_LEVELS.explore)}下面这段程序已经搭好（只能看，不能改）：重复 ${L02_DEMO_REPEAT} 次，每次把篮子的 x 增加 ${L02_DEMO_STEP}。先猜结果，再点“运行作品”看真实的舞台。`,
    step: '先写下你的预测，再运行，比一比',
    readOnly: true,
    prediction: {
      question: '运行之前先判断：',
      numberLabel: '篮子最后会停在 x 等于多少？',
      choiceLabel: '能接住水果吗？',
      choices: ['能接住', '接不住'],
    },
    hints: [
      '先看水果的 x 和篮子的 x，水果在哪一边？',
      '“重复 2 次，每次增加 20”一共让 x 变多少？想想以前学过的：次数 × 每次。',
      '把你算出来的篮子位置，和水果的位置比一比，相差多少？篮子能接住的范围是 40。',
    ],
    reflection: [
      '你的预测和真实结果一样吗？差在哪里？',
      '篮子要想接住，还差多远？',
    ],
  },
  solve: {
    id: 'solve',
    layer: 2,
    layerName: '独立挑战',
    title: '第二关：自己搭程序',
    task: `${levelSituation(L02_LEVELS.solve)}用“当绿旗被点击”和“重复执行”，自己搭一个程序，让篮子走到水果下面，在水果落地时接住它。先自己算一算，再动手。`,
    step: '搭好脚本，运行一次，看接没接住',
    readOnly: false,
    hints: [
      '先看：水果在篮子的哪一边？篮子一共要走多远？',
      '“将 x 坐标增加”改变位置，“重复执行 N 次”把里面的积木做 N 遍。一共走多远 = 次数 × 每次走的。',
      '试试先选一个你喜欢的“每次走的”，数数要走几次才够远；然后让“重复执行”帮你走。数字要自己算。',
    ],
    reflection: [
      '你用了“重复执行”多少次、每次走多少？别的数字组合也行吗？',
      '如果水果在 x=-100，你的程序要改哪里？',
    ],
  },
  transferLeft: {
    id: 'transferLeft',
    layer: 3,
    layerName: '迁移应用',
    title: '第三关 A：水果换到了左边',
    task: `${levelSituation(L02_LEVELS.transferLeft)}上一关的程序不能直接用了。改一改你的程序，让篮子接住它。`,
    step: '想一想要改哪里，再改程序并运行',
    readOnly: false,
    hints: [
      '水果在篮子的哪一边？在 L01 里，x 变小是往哪边走？',
      '往左走要让 x 变小：“将 x 坐标增加”里填负数也可以。',
      '想想从 0 走到 -100，要几个你喜欢的大步；上一关的数字别直接抄。',
    ],
    reflection: [
      '往左走和往右走，程序里哪个数字不一样？',
      '你是怎么想到要用负数的？',
    ],
  },
  transferFast: {
    id: 'transferFast',
    layer: 3,
    layerName: '迁移应用',
    title: '第三关 B：水果掉得更快',
    task: `${levelSituation(L02_LEVELS.transferFast)}这次水果掉得很快，只要 ${framesToLand(L02_LEVELS.transferFast)} 帧就落地。篮子来不及就会漏接。改一改你的程序。`,
    step: '看看篮子是不是太慢，再调整重复次数和每次走的',
    readOnly: false,
    hints: [
      '运行一次看看：水果落地时，篮子走到哪里了？是不是还没到？',
      `“重复执行”每一圈要用一帧，水果 ${framesToLand(L02_LEVELS.transferFast)} 帧就落地，所以重复次数不能太多，每次要走大一点。`,
      '先想：你的程序在水果落地之前能重复几圈？这几圈每圈走多远才能凑够要走的距离？',
    ],
    reflection: [
      '水果掉得快时，为什么不能重复很多次、每次走很小一步？',
      '你是先算再改，还是先试再改？',
    ],
  },
}

export const L02_ACTIVITY_NOTE =
  '范围标注：教学定向。积木只提供“当绿旗被点击”“将 x 坐标增加”“重复执行”三种；' +
  '系统只能根据真实运行判断“这一次运行的行为是否满足要求”，不能证明你是否理解了原因，也不能评价开放创作。'
