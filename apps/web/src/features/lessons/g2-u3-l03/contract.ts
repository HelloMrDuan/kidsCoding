// G2-U3-L03《随机出现的礼物》课程契约与教学活动。
// 契约字段与 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md 一一对应；本地结构类型与共享 LessonContract 兼容。
//
// 课程文案不含任何标准答案：三级提示逐级给方向、知识点、局部做法，从不给完整积木排列。
// 参考做法只在“通过本关之后”的环节出现（见 reference.ts）。
// 教学定位与数值是【提议】（rulingStatus = 'proposed'），见 docs/curriculum/g2-u3-l03/TEACHING-PLAN.md。

import { L03_LESSON_ID, L03_LEVELS, L03_PARAMS, type LevelId, type LevelParams } from './params'

export type L03Contract = {
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

export const L03_CONTRACT: L03Contract = {
  lessonId: L03_LESSON_ID,
  title: '随机出现的礼物',
  goal5: [
    '今天学：让礼物每次出现在不同的位置——用“在……之间取随机数”，并且自己决定它的下界和上界',
    '要解决的问题：礼物不能总在同一个地方，也不能跑出要求的范围',
    '学完你能：把随机数限定在要求的范围里；换一个范围，也知道该改哪里',
    '和上节课的联系：上节课你自己算篮子要走多远；这节课让电脑替你随机挑位置，而你来决定它能挑的范围',
    '现在要做：先预测，再搭脚本并运行一次，看礼物出现在哪里',
  ],
  brief: '礼物每次出现的位置都不一样，可是不能跑出要求的范围。先判断，再动手，再看真实结果。',
  step: '先预测，再搭脚本并运行一次',
  hints: [
    '先看本关要求礼物出现在哪个范围（最左到最右）。',
    '“在……之间取随机数”有两个数字：第一个是最小能取到的，第二个是最大能取到的。',
    '想让礼物不跑出范围，两个数字各要怎么填？先想好，再试一次，看礼物到了哪里。',
  ],
  engine: 'scratch-vm',
  judging: {
    stageRule: '舞台结果：读取这一次礼物每次出现的 x，看有没有超出本关要求的范围',
    taskRule: '任务结果：礼物至少出现 10 次，全部在要求的范围内，并且出现在至少 3 个不同的位置（写死一个数不算随机）',
    knowledgeRule: '知识证据：真实的“取随机数”收到的上下界一直在要求的范围内，并且范围不能窄到失去随机的意义；这条只看上下界，不靠这一次的运气。只说明本次程序满足取值范围要求，不等于已经掌握，理解需要进一步解释或练习',
    scopeLabel: '教学定向',
  },
  draftKey: `kidscoding-draft:${L03_LESSON_ID}`,
}

export function validateL03Contract(c: L03Contract): string[] {
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
  /** 数字预测：这 10 次里有几次会跑出要求的范围。 */
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
  return `本关要求：礼物每次出现的位置 x 在 ${level.allowedMin} 到 ${level.allowedMax} 之间（整个舞台是 ${L03_PARAMS.stageMinX} 到 ${L03_PARAMS.stageMaxX}）。`
}

/** 演示关那段固定程序：故意用过宽的上下界。 */
export const L03_DEMO_REPEAT = L03_PARAMS.requiredDraws
export const L03_DEMO_FROM = -300
export const L03_DEMO_TO = 300

export const L03_CONTENT: Record<LevelId, LevelContent> = {
  explore: {
    id: 'explore',
    layer: 1,
    layerName: '探索与预测',
    title: '第一关：先猜一猜',
    task: `${levelSituation(L03_LEVELS.explore)}下面这段程序已经搭好（只能看，不能改）：重复 ${L03_DEMO_REPEAT} 次，每次把礼物的 x 设为“在 ${L03_DEMO_FROM} 到 ${L03_DEMO_TO} 之间取随机数”。先猜结果，再点“运行作品”看真实的舞台。这一关的随机数用了固定的种子：每个人看到的 ${L03_DEMO_REPEAT} 个位置都一样；你自己搭的关卡每次运行都不一样。`,
    step: '先写下你的预测，再运行，比一比',
    readOnly: true,
    prediction: {
      question: '运行之前先判断：',
      numberLabel: `这 ${L03_DEMO_REPEAT} 次里，有几次礼物会跑出 ${L03_LEVELS.explore.allowedMin}～${L03_LEVELS.explore.allowedMax} 的范围？（填 0～${L03_DEMO_REPEAT}）`,
      choiceLabel: `礼物会跑到整个舞台之外吗（x 小于 ${L03_PARAMS.stageMinX} 或大于 ${L03_PARAMS.stageMaxX}）？`,
      choices: ['会', '不会'],
    },
    hints: [
      '先看“取随机数”里的两个数字：它最小能取到多少？最大能取到多少？',
      `礼物的 x 在 ${L03_DEMO_FROM}～${L03_DEMO_TO} 里每个数都可能被取到。把这个范围和本关要求的 ${L03_LEVELS.explore.allowedMin}～${L03_LEVELS.explore.allowedMax} 比一比，哪一部分在要求之外？`,
      `整个舞台只有 ${L03_PARAMS.stageMinX}～${L03_PARAMS.stageMaxX}。比较“随机数能取的范围”和“舞台的范围”：随机数能取到舞台之外吗？`,
    ],
    reflection: [
      '你预测有几次跑出范围，真实运行有几次？差在哪里？',
      '要让礼物一次也不跑出来，这两个数字应该怎么改？',
    ],
  },
  solve: {
    id: 'solve',
    layer: 2,
    layerName: '独立挑战',
    title: '第二关：自己搭程序',
    task: `${levelSituation(L03_LEVELS.solve)}用“当绿旗被点击”“重复执行”和“将 x 设为（在……之间取随机数）”，自己搭一个程序，让礼物重复 ${L03_PARAMS.requiredDraws} 次出现在随机的位置，每一次都不跑出要求的范围。先自己想一想，两个数字该填多少，再动手。`,
    step: '搭好脚本，运行一次，看礼物出现在哪里',
    readOnly: false,
    hints: [
      '先看：本关要求礼物最左到哪里、最右到哪里？“取随机数”里的两个数字各管什么？',
      '第一个数字是最小能取到的，第二个数字是最大能取到的。想让礼物每次都留在要求的范围里，这两个数字都不能超出那个范围。',
      `再想：要看到 ${L03_PARAMS.requiredDraws} 个位置，“重复执行”要重复几次？如果两个数字填得一样，礼物会怎样？自己试一试，数字要自己想。`,
    ],
    reflection: [
      '你的两个数字分别是多少？别的数字也行吗？',
      '如果要求的范围换成只在右半边，你的程序要改哪里？',
    ],
  },
  transferRight: {
    id: 'transferRight',
    layer: 3,
    layerName: '迁移应用',
    title: '第三关 A：只出现在右半边',
    task: `${levelSituation(L03_LEVELS.transferRight)}上一关的两个数字不能直接用了。改一改你的程序，让礼物只在舞台的右半边出现。`,
    step: '想一想两个数字要怎么改，再改程序并运行',
    readOnly: false,
    hints: [
      '舞台右半边的 x 是正数还是负数？本关要求礼物最小到哪里、最大到哪里？',
      '上一关的下界这一关不能再用了——下界要跟着变。上界呢？',
      '先在纸上写出这一关的最小值和最大值，再填进积木。数字别直接抄上一关的。',
    ],
    reflection: [
      '这一关你改了哪个数字，为什么？',
      '如果下界填得比上界还大，会发生什么？可以试一试。',
    ],
  },
  transferMiddle: {
    id: 'transferMiddle',
    layer: 3,
    layerName: '迁移应用',
    title: '第三关 B：只出现在正中间',
    task: `${levelSituation(L03_LEVELS.transferMiddle)}这次范围窄了很多。改一改你的程序，让礼物只在舞台正中间的一小块出现，但还要真的“随机”换位置。`,
    step: '想一想范围窄了要怎么填，再改程序并运行',
    readOnly: false,
    hints: [
      '这次要求的范围变窄了。最小值和最大值分别是多少？',
      '两个数字不能超出要求的范围，可也不能挤得太近——挤得太近，礼物几乎不换位置。',
      '先用要求范围里最宽的填法试一次，再试试把范围缩小一点，看礼物的位置有什么变化。',
    ],
    reflection: [
      '范围越窄，礼物出现的位置有什么变化？',
      '为什么两个数字不能一样？',
    ],
  },
}

export const L03_ACTIVITY_NOTE =
  '范围标注：教学定向。积木只提供“当绿旗被点击”“重复执行”“将 x 设为（在……之间取随机数）”三种；' +
  '系统只能根据真实运行判断“这一次运行的行为是否满足要求”，不能证明你是否理解了原因，也不能评价开放创作。'
