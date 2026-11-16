// G2-U3-L06《水果接力挑战》课程契约与教学活动。
// 契约字段与 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md 一一对应；本地结构类型与共享 LessonContract 兼容。
//
// 课程文案不含任何标准答案：三级提示逐级给方向、知识点、局部做法，从不给完整积木排列。
// 参考做法只在“通过本关之后”的环节出现（见 reference.ts）。
// 教学定位与数值是【提议】（rulingStatus = 'proposed'），见 docs/curriculum/g2-u3-l06/TEACHING-PLAN.md。
// 课程目标来自台账与详细目录：focusConcept =「随机」；组合随机落果、篮子移动、碰撞记分和结束条件；
// 成功接到 5 颗或倒计时结束后能显示结果；错误路线是过期水果继续加分或比赛结束后仍能移动。

import { L06_LESSON_ID, L06_LEVELS, type LevelId, type LevelParams } from './params'

export type L06Contract = {
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

export const L06_CONTRACT: L06Contract = {
  lessonId: L06_LESSON_ID,
  title: '水果接力挑战',
  goal5: [
    '今天学：用“随机”决定每颗水果从哪里落下来——每次的位置都不一样，谁也不能提前知道',
    '要解决的问题：水果一颗接一颗地落（接力），接住一颗得一分；同一颗不能重复得分，时间一到就不能再得分',
    '学完你能：写出完整的水果接力游戏——随机落果、篮子接住、碰到才记分、接到 5 颗或倒计时结束显示结果',
    '和前几课的联系：L04 你学会用“如果碰到篮子”记分，L05 你用倒计时决定游戏结束；这节课把它们和“随机”组合成一个完整游戏',
    '现在要做：先预测，再看一局完整的演示，然后自己搭出这个游戏',
  ],
  brief: '水果会从上面一个接一个地落下来，每次出现的位置都是随机的。移动篮子去接：接到 5 颗就赢，倒计时结束也会显示结果。先预测，再动手，再看真实结果。',
  step: '先预测，再看演示，然后自己搭',
  hints: [
    '先想一想：每颗水果出现的位置，是程序第几块积木决定的？如果没有那块积木，水果每次会在哪里出现？',
    '接力就是“落完一颗，再来一颗”：想想哪块积木能让出生、下落、检查这一串动作一直重复下去。',
    '得分要放在“如果碰到篮子”里面，得分之后让水果隐藏，它就不会被重复记分了。',
  ],
  engine: 'scratch-vm',
  judging: {
    stageRule: '舞台结果：这局是否按结束条件真的结束（接满 5 颗获胜，或倒计时归零），显示的结果与舞台上真实的得分、时间一致',
    taskRule: '任务结果：逐颗核算——每次得分之前必须刚确认过“碰到篮子？”是真的，每颗水果最多记一次分，倒计时结束后不得再加分，碰到篮子却没记分也算漏',
    knowledgeRule: '知识证据：每一次出生点的 x 都来自真实“随机”积木的求值，且一局里出现过至少 3 个互不相同的出生点；只说明本次程序满足随机要求，不等于已经掌握，理解需要进一步解释或练习',
    scopeLabel: '教学定向',
  },
  draftKey: `kidscoding-draft:${L06_LESSON_ID}`,
}

export function validateL06Contract(c: L06Contract): string[] {
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
  /** 数字预测：一局大约会出生几颗水果。 */
  numberLabel: string
  choiceLabel: string
  choices: [string, string]
}

export type LevelContent = {
  id: LevelId
  layer: 1 | 2 | 3
  layerName: '探索理解' | '独立解决' | '迁移创作'
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
  const speed = level.fruitSpeed === L06_LEVELS.solve.fruitSpeed ? '水果落下的速度正常' : '水果落得更快'
  return `本关规则：接到 ${level.winTarget} 颗获胜，倒计时 ${level.timeLimitSeconds} 秒结束也会显示结果（${speed}）。`
}

export const L06_CONTENT: Record<LevelId, LevelContent> = {
  explore: {
    id: 'explore',
    layer: 1,
    layerName: '探索理解',
    title: '第一关：先猜一猜',
    task: `${levelSituation(L06_LEVELS.explore)}下面这段程序已经搭好（只能看，不能改），它就是完整的水果接力游戏。先猜一猜，再点“运行作品”：用鼠标或手指移动篮子，试着接住水果，看一局是怎么结束的。`,
    step: '先写下你的预测，再运行，移动篮子接水果',
    readOnly: true,
    prediction: {
      question: '运行之前先判断：',
      numberLabel: '一局里大约会出生几颗水果？（填一个数字）',
      choiceLabel: '下一颗水果，会和上一颗出现在同一个地方吗？',
      choices: ['会', '不会'],
    },
    hints: [
      '注意看每颗水果出现的位置：和上一颗比，是每次都一样，还是每次都不同？',
      '篮子会跟着你的鼠标（或手指）走。水果落到篮子附近时，怎样才能接住它？',
      '看右上角的时间：倒计时结束时，就算没接满，游戏也会显示结果。',
    ],
    reflection: [
      '你预测水果会出生几颗，真实运行出生了几颗？位置一共出现过几种？',
      '为什么谁也不能提前知道下一颗水果会出现在哪里？',
    ],
  },
  solve: {
    id: 'solve',
    layer: 2,
    layerName: '独立解决',
    title: '第二关：自己搭游戏',
    task: `${levelSituation(L06_LEVELS.solve)}用给出的积木自己搭出完整的水果接力游戏：水果每次在随机位置出生、落下，碰到篮子记一分并消失，落完一颗再来下一颗。篮子和倒计时已经准备好了，你只需要搭水果的脚本。`,
    step: '搭好脚本，运行一次，移动篮子接水果，看结果',
    readOnly: false,
    hints: [
      '先想一想：一颗水果的一生是“出生 → 落下 → 被接住或落地 → 消失”，接力就是把这一生一直重复。',
      '出生时要用上“随机”：哪块积木能让水果每次出现在不同的 x 位置？',
      '记分要放在“如果碰到篮子”里面，记完分让水果隐藏；下落的每一步都要检查一次有没有碰到。',
    ],
    reflection: [
      '你的程序里，“随机”用在了哪里？去掉它，游戏会变成什么样？',
      '为什么记分要放在“如果”里面？放在外面会发生什么？',
    ],
  },
  transferFix: {
    id: 'transferFix',
    layer: 3,
    layerName: '迁移创作',
    title: '第三关 A：找出毛病并修好',
    task: `${levelSituation(L06_LEVELS.transferFix)}这段程序已经搭好了，但它有毛病：水果没碰到篮子也会得分，同一颗还会被记很多次分。先运行一次看看账目有多乱，再动手把它修好：只有碰到篮子才记分，每颗只记一次。`,
    step: '先运行看毛病，再改程序，重新运行验证',
    readOnly: false,
    hints: [
      '先运行一次，数一数：一颗水果落到地上，得分变了几次？它碰到篮子了吗？',
      '毛病出在“将得分增加”放的位置：它现在在“如果”的里面还是外面？',
      '光把记分放进“如果”还不够：水果碰到篮子以后如果不消失，下一步还碰着，会再记一次。',
    ],
    reflection: [
      '你改了哪两处？各自解决了什么毛病？',
      '修好之前，一颗落到地上的水果得了几分？为什么？',
    ],
  },
  transferFast: {
    id: 'transferFast',
    layer: 3,
    layerName: '迁移创作',
    title: '第三关 B：水果落得更快',
    task: `${levelSituation(L06_LEVELS.transferFast)}水果落得更快了。把你第二关的程序思路搬过来（可以重新搭一份），让游戏在快速度下照样规则正确：随机出生、碰到才记分、每颗一次。`,
    step: '搭好脚本，运行一次，看看快速度下还对不对',
    readOnly: false,
    hints: [
      '水果更快，落到地面的步数就更少：“重复执行”的次数要跟着变多还是变少？',
      '下落的每一步都检查一次“碰到篮子？”，速度再快也不会错过接住的那一刻。',
      '如果得分是 0，先想想：是篮子没接到，还是检查的次数在水果落地之前就用完了？',
    ],
    reflection: [
      '速度变快以后，你改了哪个数字？为什么？',
      '检查次数留多少余量比较稳妥？太少和太多分别有什么问题？',
    ],
  },
}

export const L06_ACTIVITY_NOTE =
  '范围标注：教学定向。积木只提供“当绿旗被点击”“一直重复”“重复执行”“随机出生”“下落一步”“如果碰到篮子”“将得分增加”“隐藏”八种；' +
  '篮子跟随指针移动、舞台倒计时是课程准备好的部分；系统只能根据真实运行判断“这一次运行的行为是否满足要求”，不能证明你是否理解了原因，也不能评价开放创作。'
