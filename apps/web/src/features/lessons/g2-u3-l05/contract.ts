// G2-U3-L05《倒计时游戏结束》课程契约与教学活动。
// 契约字段与 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md 一一对应；本地结构类型与共享 LessonContract 兼容。
//
// 课程文案不含任何标准答案：三级提示逐级给方向、知识点、局部做法，从不给完整积木排列。
// 参考做法只在“通过本关之后”的环节出现（见 reference.ts）。
// 教学定位与数值是（rulingStatus = 'proposed'），见 docs/curriculum/g2-u3-l05/TEACHING-PLAN.md。
// 首席已同意本课核心方向按“计时与游戏结束”核对（focusConcept 已按此修正本课自己的目录条目）；
// 数字（起点秒数、帧上限、得分间隔）来自 params.ts 与真实 VM 的实测，不在文案里另写一份。

import { L05_LESSON_ID, L05_LEVELS, type LevelId, type LevelParams} from './params'

export type L05Contract = {
lessonId: string
title: string
/** 恰 5 条：学什么 / 解决什么问题 / 学完能做什么 / 和上节课的联系 / 当前步骤。 */
goal5: [string, string, string, string, string]
brief: string
step: string
hints: [string, string, string]
engine: 'scratch-vm'
judging: { stageRule: string; taskRule: string; knowledgeRule: string; scopeLabel: '教学定向' | '开放创作'}
draftKey: `kidscoding-draft:${string}`
}

export const L05_CONTRACT: L05Contract = {
lessonId: L05_LESSON_ID,
title: '倒计时游戏结束',
goal5: [
'今天学：用变量 timeLeft 做倒计时——每过 1 秒减少 1，数到 0 就结束游戏',
'要解决的问题：让电脑自己知道“时间到了”，不用人盯着数次数；时间还不能变成负数',
'学完你能：写出“重复执行直到 timeLeft 小于 1”的倒计时，归零时广播“游戏结束”，并让得分在归零后不再变化',
'和上节课的联系：上节课你用“如果”判断球碰没碰到篮子；这节课用“重复直到”加判断，让倒计时自己决定什么时候结束',
'现在要做：先预测一段没有判断的程序会把时间数成几，再自己搭一个会准时结束的倒计时',
],
brief: '限时接水果比赛要有倒计时：从 10 秒数到 0，时间一到就广播“游戏结束”，得分停住。先看一段没有判断的程序会出什么问题，再自己搭一个靠判断结束的倒计时。',
step: '先预测，再运行，再自己搭',
hints: [
'先想一想：如果只写“重复 15 次”，可是只需要减 10 次就到 0 了，多出来的次数会把 timeLeft 变成几？',
'“重复执行直到〈timeLeft < 1〉”会自己检查 timeLeft：还没小于 1 就继续，小于 1 就停下来。',
'广播要放在重复的外面、后面：先数完，再通知大家“游戏结束”。',
],
engine: 'scratch-vm',
judging: {
stageRule: '舞台结果：读取这一次运行里 timeLeft 的变化——必须真的从大于 0 一路数到 0（一直是 0 不算数过）',
taskRule: '任务结果：倒计时从本关要求的秒数开始、从不为负、“游戏结束”恰好广播一次、广播时已经归零、倒计时期间得过分、广播之后得分不再变化',
knowledgeRule: '知识证据：广播之前，真实 VM 里“timeLeft < 1”这个判断真的被求值过，并且在结束的那一刻为真；看的是结束是不是由判断决定（写死次数在起点相同的关卡里行为一样，只有这条能区分）。只说明本次程序满足判断要求，不等于已经掌握，理解需要进一步解释或练习',
scopeLabel: '教学定向',
},
draftKey: `kidscoding-draft:${L05_LESSON_ID}`,
}

export function validateL05Contract(c: L05Contract): string[] {
const errors: string[] = []
if (!c.lessonId) errors.push('lessonId 缺失')
if (!c.title) errors.push('title 缺失')
if (!Array.isArray(c.goal5) || c.goal5.length!== 5 || c.goal5.some(g =>!g)) errors.push('goal5 必须恰好 5 条非空')
if (!Array.isArray(c.hints) || c.hints.length!== 3 || c.hints.some(h =>!h)) errors.push('hints 必须恰好 3 条非空')
if (c.engine!== 'scratch-vm') errors.push('engine 必须是 scratch-vm')
if (c.draftKey!== `kidscoding-draft:${c.lessonId}`) errors.push('draftKey 与 lessonId 不一致')
if (!c.judging.scopeLabel) errors.push('scopeLabel 缺失')
return errors
}

export type Prediction = {
question: string
/** 数字预测：演示程序跑完，timeLeft 最后会变成几（可以是负数）。 */
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
return `本关要求：倒计时从 ${level.startSeconds} 秒开始，每秒减少 1，数到 0 广播“游戏结束”。`
}

/** 探索关那段固定程序固定重复的次数：故意比需要的 10 次多，让 timeLeft 变成负数。 */
export const L05_DEMO_REPEAT = 15

export const L05_CONTENT: Record<LevelId, LevelContent> = {
explore: {
id: 'explore',
layer: 1,
layerName: '探索与预测',
title: '第一关：先猜一猜',
task: `${levelSituation(L05_LEVELS.explore)}下面这段程序已经搭好（只能看，不能改）：把 timeLeft 设为 ${L05_LEVELS.explore.startSeconds}，然后重复 ${L05_DEMO_REPEAT} 次“等待 1 秒、timeLeft 减少 1”，最后广播“游戏结束”。它没有用任何判断。先猜结果，再点“运行作品”看真实的舞台。`,
step: '先写下你的预测，再运行，比一比',
readOnly: true,
prediction: {
question: '运行之前先判断：',
numberLabel: '这段程序跑完，timeLeft 最后会变成几？（填一个数字，可以填负数）',
choiceLabel: '广播“游戏结束”以后，水果的得分还会不会再变？',
choices: ['会', '不会'],
},
hints: [
`重复 ${L05_DEMO_REPEAT} 次，可是只需要减 ${L05_LEVELS.explore.startSeconds} 次就到 0 了。多出来的次数会发生什么事？`,
'timeLeft 到 0 以后还会继续减少吗？这段程序里有没有什么东西能拦住它？',
'水果每半秒加 1 分，但它自己有个条件：timeLeft 大于 0 才加。timeLeft 变成负数以后，它还加吗？',
],
reflection: [
'你预测 timeLeft 最后是几？真实运行是几？差在哪里？',
'为什么 timeLeft 会变成负数？这段程序里少了什么？',
],
},
solve: {
id: 'solve',
layer: 2,
layerName: '独立挑战',
title: '第二关：自己搭倒计时',
task: `${levelSituation(L05_LEVELS.solve)}自己搭一个程序：从 ${L05_LEVELS.solve.startSeconds} 秒开始，每过 1 秒 timeLeft 减少 1，数到 0 就广播“游戏结束”。timeLeft 不能变成负数。想一想：怎样让电脑自己知道“数到 0 了”，不用你替它数次数？`,
step: '搭好脚本，运行一次，看 timeLeft 和得分对不对',
readOnly: false,
hints: [
'先想：你要重复做的是“等待 1 秒、减少 1”，一共要做多少次？这个次数应该由谁说了算——你，还是 timeLeft？',
'“重复执行直到〈timeLeft < 1〉”会一直重复，直到 timeLeft 小于 1 才停。把等待和减少放进它里面试试。',
'别忘了：数到 0 之后还要广播“游戏结束”。广播放在重复的外面、后面，才是“数完才通知”。',
],
reflection: [
'你的程序是怎样知道“时间到了”的？它检查的是什么？',
`如果把开始的秒数改成 ${L05_LEVELS.transferShort.startSeconds}，你的程序要改几个地方？为什么？`,
],
},
transferShort: {
id: 'transferShort',
layer: 3,
layerName: '迁移应用',
title: '第三关：只数 6 秒',
task: `${levelSituation(L05_LEVELS.transferShort)}这一关只从 ${L05_LEVELS.transferShort.startSeconds} 秒开始倒数。把上一关的程序改一改（或者重新搭）：靠判断结束的程序，只改开始的秒数就够了；靠数次数的程序，可要重新数一遍。`,
step: '想一想要改哪里，再改程序并运行',
readOnly: false,
hints: [
`这一关从 ${L05_LEVELS.transferShort.startSeconds} 秒开始。如果你的程序靠“重复几次”来结束，次数要跟着改；靠判断的话不用。`,
'先只改“将 timeLeft 设为”的数字，再运行看看结果对不对。',
'如果广播太早或太晚，看一看结束的那一刻 timeLeft 是不是刚好 0。',
],
reflection: [
'这一关你改了哪里？为什么只改那里？',
'靠判断结束和靠数次数结束，换一个开始秒数的时候有什么不同？',
],
},
}

export const L05_ACTIVITY_NOTE =
'范围标注：教学定向。积木只提供“当绿旗被点击”“将 timeLeft 设为”“重复执行直到〈timeLeft < 1〉”“等待”“将 timeLeft 减少”“重复执行（固定次数）”“广播 游戏结束”；' +
'倒计时和得分都由真实 Scratch VM 运行，时间用虚拟时钟走（走得比真实时间快，但每一秒的数值和真实等待时一样）；' +
'舞台上的水果脚本是课程带来的，你改不了它。系统只能根据真实运行判断“这一次运行的行为是否满足要求”，不能证明你是否理解了原因，也不能评价开放创作。'
