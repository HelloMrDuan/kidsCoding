// G2-U3-L04《判断碰撞得分》课程契约与教学活动。
// 契约字段与 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md 一一对应；本地结构类型与共享 LessonContract 兼容。
//
// 课程文案不含任何标准答案：三级提示逐级给方向、知识点、局部做法，从不给完整积木排列。
// 参考做法只在“通过本关之后”的环节出现（见 reference.ts）。
// 教学定位与数值是【提议】（rulingStatus = 'proposed'），见 docs/curriculum/g2-u3-l04/TEACHING-PLAN.md。
// 数字（球速、帧数、得分）来自 params.ts 与真实 VM 的实测，不在文案里另写一份。

import { L04_LESSON_ID, L04_LEVELS, L04_PARAMS, type LevelId, type LevelParams } from './params'

export type L04Contract = {
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

export const L04_CONTRACT: L04Contract = {
  lessonId: L04_LESSON_ID,
  title: '判断碰撞得分',
  goal5: [
    '今天学：用“如果……那么……”做判断——只有球碰到篮子才得分，落在地上的球不算',
    '要解决的问题：同一个球只能算一次分，不能一直碰着就一直加分',
    '学完你能：写出“如果碰到篮子，就得分并让球消失”，并说出为什么要这样写',
    '和上节课的联系：上节课你用随机数决定位置；这节课让电脑自己判断“碰没碰到”，再决定要不要得分',
    '现在要做：先预测，再搭脚本并运行一次，看红球和蓝球各得了几分',
  ],
  brief: '红球会落在篮子上，蓝球会落在地上。只有碰到篮子的球才能得分，而且一个球只能得一次分。先判断，再动手，再看真实结果。',
  step: '先预测，再搭脚本并运行一次',
  hints: [
    '先想一想：红球落在篮子上的时候会停留一会儿，它一直碰着篮子。你的“检查”会做几次？',
    '“重复执行”每转一圈都会再检查一遍。如果球一直碰着篮子，每一遍检查都会是真的。',
    '想一想，怎样让球在得分之后就不再被检查到？再试一次，看红球最后得了几分。',
  ],
  engine: 'scratch-vm',
  judging: {
    stageRule: '舞台结果：读取这一次舞台上最后的得分，看是否等于本关要求',
    taskRule: '任务结果：逐个球核算——碰到篮子的红球恰好加了一次分，落在地上的蓝球一次都没有加分',
    knowledgeRule: '知识证据：每一次加分的那一刻，同一个球刚刚做的“碰到 篮子？”检查必须是真的；这条看的是条件有没有真的把关，不只看总分。只说明本次程序满足判断要求，不等于已经掌握，理解需要进一步解释或练习',
    scopeLabel: '教学定向',
  },
  draftKey: `kidscoding-draft:${L04_LESSON_ID}`,
}

export function validateL04Contract(c: L04Contract): string[] {
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
  /** 数字预测：红球最后会让得分变成几。 */
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
  const speed = level.ballSpeed === L04_LEVELS.solve.ballSpeed ? '球落得不快' : '球落得更快'
  return `本关要求：碰到篮子的红球加 ${level.points} 分，落在地上的蓝球不加分（${speed}）。`
}

/** 探索关那段固定程序重复检查的次数（足够覆盖球落到篮子上的全过程）。 */
export const L04_DEMO_REPEAT = 40

export const L04_CONTENT: Record<LevelId, LevelContent> = {
  explore: {
    id: 'explore',
    layer: 1,
    layerName: '探索与预测',
    title: '第一关：先猜一猜',
    task: `${levelSituation(L04_LEVELS.explore)}下面这段程序已经搭好（只能看，不能改）：重复检查 ${L04_DEMO_REPEAT} 次，每次“如果碰到篮子，就把得分加 1”。先猜结果，再点“运行作品”看真实的舞台。`,
    step: '先写下你的预测，再运行，比一比',
    readOnly: true,
    prediction: {
      question: '运行之前先判断：',
      numberLabel: '红球落在篮子上，最后得分会变成几分？（填一个数字）',
      choiceLabel: '落在地上的蓝球会让得分增加吗？',
      choices: ['会', '不会'],
    },
    hints: [
      '先看这段程序：“如果碰到篮子，就加 1 分”。红球落到篮子上之后，会马上消失吗？',
      '“重复执行”每转一圈就检查一遍。红球在篮子上停留的这段时间，每一遍检查结果是什么？',
      '蓝球落在地上，它碰得到篮子吗？“如果”里的条件是真的还是假的？',
    ],
    reflection: [
      '你预测得分是几，真实运行是几？差在哪里？',
      '要让红球只得一次分，程序里还缺什么？',
    ],
  },
  solve: {
    id: 'solve',
    layer: 2,
    layerName: '独立挑战',
    title: '第二关：自己搭程序',
    task: `${levelSituation(L04_LEVELS.solve)}用“当绿旗被点击”“重复执行”“如果碰到篮子”“将得分增加”和“隐藏”，自己搭一个程序：红球只得一次分，蓝球不得分。先自己想一想怎么搭，再动手。`,
    step: '搭好脚本，运行一次，看红球和蓝球各得了几分',
    readOnly: false,
    hints: [
      '先想：什么时候才应该加分？是球碰到篮子的时候，还是任何时候？',
      '“如果碰到篮子”里面放要做的事。“重复执行”要重复到球真的落到篮子上——次数太少，检查早就结束了。',
      '想一想，球得分之后怎样才不会再被算一次？自己试一试，不要直接抄上一关的程序。',
    ],
    reflection: [
      '你的程序里，“如果”起了什么作用？去掉它会怎样？',
      '“隐藏”放在“如果”里面和放在外面，结果一样吗？',
    ],
  },
  transferPoints: {
    id: 'transferPoints',
    layer: 3,
    layerName: '迁移应用',
    title: '第三关 A：每个球 2 分',
    task: `${levelSituation(L04_LEVELS.transferPoints)}上一关每个球加 1 分，这一关要加 ${L04_LEVELS.transferPoints.points} 分。改一改你的程序，别忘了落在地上的蓝球还是不能得分。`,
    step: '想一想要改哪里，再改程序并运行',
    readOnly: false,
    hints: [
      '这一关每个球要加几分？上一关的程序里，哪一块决定“加几分”？',
      '只改“加几分”就够了吗？想想蓝球：如果程序里没有“如果”，蓝球也会加分。',
      '先改好加分的数字，运行后看一看：红球加了几次、蓝球加了几次。',
    ],
    reflection: [
      '这一关你改了哪一块？为什么只改这一块？',
      '不用“如果”，把“加 1 分”的程序放在重复里，总分也可能是 2。这样对吗？为什么？',
    ],
  },
  transferFast: {
    id: 'transferFast',
    layer: 3,
    layerName: '迁移应用',
    title: '第三关 B：球落得更快',
    task: `${levelSituation(L04_LEVELS.transferFast)}球落得更快了，上一关的程序还能用吗？改一改，让红球只得一次分、蓝球不得分。`,
    step: '想一想球更快会带来什么问题，再改程序并运行',
    readOnly: false,
    hints: [
      '球落得更快，会更早还是更晚到篮子上？你的“重复执行”要检查多少次才够？',
      '“重复执行”次数太少的话，检查结束的时候球可能还没落到篮子上。',
      '先运行一次，看红球得了几分。如果是 0 分，想想是哪里的次数出了问题。',
    ],
    reflection: [
      '球变快以后，你改了哪里？为什么？',
      '检查的次数多一点好，还是越少越好？为什么？',
    ],
  },
}

export const L04_ACTIVITY_NOTE =
  '范围标注：教学定向。积木只提供“当绿旗被点击”“重复执行”“如果碰到篮子”“将得分增加”“隐藏”五种；' +
  '你的脚本会同时用在红球和蓝球上；系统只能根据真实运行判断“这一次运行的行为是否满足要求”，不能证明你是否理解了原因，也不能评价开放创作。'
