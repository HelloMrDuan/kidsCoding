// A0-U1 AI lessons: classification ("AI在哪里出现").
// Stage 1 only: lesson data plus a pure evaluation function. There is no
// routed trial page, no E2E spec, no independent teaching review and no
// child trial yet, so nothing here is a published or playable course.
// The classification rule comes from the detailed lesson plan
// (track-a0-detailed-lessons-v1.json): whether the tool recognises patterns
// from data. The detailed plan names only three tools in its setting, so
// the other three tools below are implementer-supplied examples under the
// same rule, marked `source: 'implementer_example'` and pending teaching
// review; they are not presented as ledger content.

export type A0ToolCategory = 'ai' | 'traditional' | 'non_digital'

export type A0ToolSource = 'detailed_lesson' | 'implementer_example'

export type A0Tool = {
  id: string
  name: string
  category: A0ToolCategory
  /** Why this category follows from the classification rule. */
  reason: string
  source: A0ToolSource
}

export type A0Task = { id: 'practiceA' | 'practiceB' | 'debug' | 'create'; title: string; goal: string; how: string; skill: string }

export type A0Criterion = { name: string; points: number; evidence: string }

export type A0Diagnostic = { mistake: string; help: string }

export type A0Lesson = {
  id: string
  title: string
  concept: string
  ageRange: string
  story: string
  /** The one rule every classification in this lesson must be justified by. */
  rule: string
  tools: A0Tool[]
  tasks: A0Task[]
  /** The detailed lesson's three diagnostics, verbatim in meaning. */
  diagnostics: A0Diagnostic[]
  criteria: A0Criterion[]
  extension: string
  materials: string[]
  materialsReady: boolean
  doesNotCollectPersonalData: boolean
  nextLesson: string
}

export const A0_U1_L01_PASS_THRESHOLD = 5

export const A0_U1_L01_COUNTER_EXAMPLE = {
  id: 'radio',
  name: '会发声的收音机',
  /** Sound alone is not AI: the counter-example from the detailed lesson. */
  category: 'traditional' as A0ToolCategory,
  reason: '只按固定方式播放声音，不从数据中识别模式，所以会发声不等于 AI',
}

export const a0u1L01: A0Lesson = {
  id: 'A0-U1-L01',
  title: 'AI在哪里出现',
  concept: '分类',
  ageRange: '7-13',
  story: '校园科技馆摆出导航软件、算术计算器和纸质尺子。',
  rule: '按是否从数据中识别模式，把生活工具分成 AI 相关、传统程序和非数字工具，并说明理由',
  tools: [
    { id: 'nav-software', name: '导航软件', category: 'ai', reason: '从大量路况与出行数据中识别模式，给出路线', source: 'detailed_lesson' },
    { id: 'calculator', name: '算术计算器', category: 'traditional', reason: '按固定算术规则计算，不从数据中学习模式', source: 'detailed_lesson' },
    { id: 'paper-ruler', name: '纸质尺子', category: 'non_digital', reason: '不用电、不运行程序，直接量长度', source: 'detailed_lesson' },
    { id: 'photo-flower', name: '拍照识花应用', category: 'ai', reason: '从大量花朵照片数据中识别模式，认出花的种类', source: 'implementer_example' },
    { id: 'alarm-clock', name: '电子闹钟', category: 'traditional', reason: '按设定时间固定响铃，不从数据中学习模式', source: 'implementer_example' },
    { id: 'notebook', name: '纸质笔记本', category: 'non_digital', reason: '手写记录，不用电、不运行程序', source: 'implementer_example' },
  ],
  tasks: [
    { id: 'practiceA', title: '给 6 种工具分类', goal: '至少 5 项分类有依据', how: '把 6 种工具分别放进 AI 相关、传统程序、非数字工具，并写出理由', skill: '分类' },
    { id: 'practiceB', title: '反例辨析：会发声就是 AI 吗', goal: '解释为什么“把所有会发声的设备都算成 AI”不可接受', how: '给会发声的收音机分类，并用是否从数据中识别模式来检验', skill: '边界判断' },
    { id: 'debug', title: '找错：只记关键词说不出做法', goal: '用本课分类举一个不同的情境', how: '先指出只背关键词的问题，再换一个生活工具重新分类并说明理由', skill: '纠错' },
    { id: 'create', title: '我自己的一个例子', goal: '自己举一个工具并分类、有理由', how: '写出一个课外工具、它的分类和理由，理由不能为空', skill: '自主创作' },
  ],
  diagnostics: [
    { mistake: '把所有会发声的设备都算成AI。', help: '通过是否能根据不同数据判断或生成结果重新比较。' },
    { mistake: '只记住关键词却无法解释做法', help: '让学生用本课分类举一个不同的情境。' },
    { mistake: '把AI生成文本当成已经核验的事实', help: '要求指出独立证据或明确标注不确定性。' },
  ],
  criteria: [
    { name: '作品与任务', points: 40, evidence: '对至少5项工具分类有依据，不把所有电子产品都叫人工智能。' },
    { name: '概念理解', points: 25, evidence: '能解释分类并对照本课例子' },
    { name: '风险与核验', points: 20, evidence: '识别「把所有会发声的设备都算成AI。」并提出通过是否能根据不同数据判断或生成结果重新比较。' },
    { name: '自主创作与反思', points: 15, evidence: '采访家长了解一个真实AI应用场景。' },
  ],
  extension: '采访家长了解一个真实AI应用场景。',
  materials: ['原创匿名情境卡', '课堂记录表', '教师引导话术', '家长/儿童隐私安全说明'],
  materialsReady: false,
  doesNotCollectPersonalData: true,
  nextLesson: 'A0-U1-L02 人和机器的判断',
}

export const a0u1AiLessons: Record<string, A0Lesson> = {
  'A0-U1-L01': a0u1L01,
}

export function getA0Lesson(id: string): A0Lesson | undefined {
  return a0u1AiLessons[id]
}

export type A0Answer = { toolId: string; category: A0ToolCategory; reason: string }

export type A0ItemResult = { toolId: string; expected: A0ToolCategory; given: A0ToolCategory | null; reasonGiven: boolean; correct: boolean }

export type A0Evaluation = {
  total: number
  /** Classifications that are both in the right category and justified. */
  correctWithReason: number
  passed: boolean
  items: A0ItemResult[]
}

/**
 * The lesson judge: a classification counts only when its category matches
 * the lesson data AND its reason is non-empty. "分类有依据" is the pass
 * rule, so a right category without a reason never counts.
 */
export function evaluateA0U1L01(answers: A0Answer[]): A0Evaluation {
  const byId = new Map(answers.map((a) => [a.toolId, a]))
  const items = a0u1L01.tools.map((tool) => {
    const answer = byId.get(tool.id)
    const reasonGiven = !!answer && answer.reason.trim().length > 0
    const correct = !!answer && answer.category === tool.category && reasonGiven
    return { toolId: tool.id, expected: tool.category, given: answer ? answer.category : null, reasonGiven, correct }
  })
  const correctWithReason = items.filter((item) => item.correct).length
  return { total: items.length, correctWithReason, passed: correctWithReason >= A0_U1_L01_PASS_THRESHOLD, items }
}

/** The boundary test: sound alone must never classify as AI. */
export function evaluateA0CounterExample(category: A0ToolCategory, reason: string): { correct: boolean; hint: string } {
  const reasonGiven = reason.trim().length > 0
  if (category === 'ai') return { correct: false, hint: '会发声不等于 AI：请用是否从数据中识别模式重新判断' }
  if (!reasonGiven) return { correct: false, hint: '分类需要依据：请写出理由' }
  return { correct: true, hint: '' }
}

/** A creative example counts when it names a category and justifies it. */
export function evaluateA0Creative(category: A0ToolCategory | null, reason: string): boolean {
  return category !== null && reason.trim().length > 0
}
