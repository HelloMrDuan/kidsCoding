/**
 * A1-U3-L06 制作学习问答助手：把 U3 本地试点里的 8 组本地问答变成一节完整课堂。
 *
 * 复用（不重新实现）：试点已发表的本地问答库 QA_PAIRS（8 组：事实类 4、
 * 方法类 2、超范围类 2）、关键词匹配 answerQuestion、演练 runQaDrill 与
 * 引用核对 checkCitationAnswer（见 u3-local-engines.ts）。本课不改试点引擎，
 * 不调用外部模型，不接网关：学生问的是合成问题，不是真实数据。
 *
 * 本课新增的只是课堂交互层：先预测（能答/拒答）再提问、核对助手回应、
 * 识别两个错误示例（编造数字/编造来源）、写新问题迁移验证、作品总结。
 * 引擎本身只给“回答还是拒答、答了什么”；把预测与实际对照、把错误示例
 * 归类，是本课的课堂层做的，规则与引擎一致，不另立规则。
 *
 * 诚实边界（课堂上明说）：
 * - 助手是本地关键词匹配：命中数最高者胜，超范围类一律拒答，无命中即拒答。
 *   匹配错了是规则的局限，不是助手“懂了”或“不懂”。
 * - 八问演练是练习记录：看过答案再预测、重复问旧问题，不作最终成绩；
 *   最终核验须用学生自己写的新问题（迁移创作）。
 * - 拒答是正确行为：猜中“拒答”与猜中“能答”同样算通过；拒答文案固定，
 *   不是“答错了再试”。
 * - 日志与方法证据只记计数（问了几问、预测对几问、拒答几问），不记问题原文、
 *   答案原文、学生身份。
 */

import {
  ANSWERS_TO_CHECK,
  CITATION_SOURCES,
  QA_PAIRS,
  answerQuestion,
  checkCitationAnswer,
  runQaDrill,
  type AnswerToCheck,
  type CitationVerdict,
  type QaAnswer,
  type QaCategory,
  type QaLog,
  type QaPair,
} from './u3-local-engines'

export const L06_LESSON_ID = 'A1-U3-L06'
export const L06_LESSON_TITLE = '制作学习问答助手'
export const L06_ROUTE = '/learn/ai-python-lab-u3-l06/A1-U3-L06'

export { ANSWERS_TO_CHECK, CITATION_SOURCES, QA_PAIRS, answerQuestion, checkCitationAnswer, runQaDrill }
export type { AnswerToCheck, CitationVerdict, QaAnswer, QaCategory, QaLog, QaPair }

/** 八个库内问题的编号（判定与草稿只认这些编号）。 */
export const KNOWN_QUESTION_IDS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8'] as const

/** 错误示例的编号（试点 L05 的两条待核对答案）。 */
export const ERROR_EXAMPLE_IDS = ['ans2', 'ans3'] as const

/** 学生对一问的预测：助手会回答，还是会拒绝。 */
export type QaPrediction = '能答' | '拒答'

/** 学生自写的一个迁移问题及其预测。 */
export type QaCustomQuestion = { text: string; predicted: QaPrediction }

/** 错误示例的种类（学生点选的判断，与 checkCitationAnswer 的 kind 对照）。 */
export type HallucinationKind = '通过' | '编造数字' | '编造来源'

export const HALLUCINATION_KINDS: HallucinationKind[] = ['通过', '编造数字', '编造来源']

/** 自写提问上限：最多 3 条、每条最多 200 字（与 L02 自加句同款双保险）。 */
export const MAX_CUSTOM_COUNT = 3
export const MAX_CUSTOM_LENGTH = 200

/** 空问题边界文案：不调引擎，固定提示。 */
export const EMPTY_QUESTION_NOTICE = '请先写一个问题，再点提问。'

/**
 * L06 草稿形状（字段定义见 a1-u3-l06-draft.ts 的实现；类型放这里，
 * 与 L02 的做法一致：草稿模块 import 类型，本模块不 import 草稿模块，
 * 避免值层循环引用）。
 */
export type L06Draft = {
  version: 1
  predictions: Record<string, QaPrediction | undefined>
  asked: string[]
  custom: QaCustomQuestion[]
  errorChecks: Record<string, HallucinationKind | undefined>
  hintLevel: 0 | 1 | 2 | 3
}

/** 一问的核对结果：预测与助手实际是否一致。 */
export type QaCheck = {
  id: string
  question: string
  category: QaCategory
  predicted: QaPrediction | null
  asked: boolean
  answered: boolean
  passed: boolean
  detail: string
}

/** 八问一次核对的完整结果。 */
export type QaCheckResult = {
  checks: QaCheck[]
  passedCount: number
  totalChecks: number
  passed: boolean
}

/**
 * 核对八问：逐条跑试点 answerQuestion，预测与实际一致且已问过才算通过。
 * 未问、未预测、预测错，一律未通过（fail-closed）。
 */
export function checkQaDrill(draft: L06Draft): QaCheckResult {
  const checks: QaCheck[] = QA_PAIRS.map((pair) => {
    const predicted = draft.predictions[pair.id] ?? null
    const asked = draft.asked.includes(pair.id)
    const answer = answerQuestion(pair.question)
    let passed = false
    let detail: string
    if (!asked) {
      detail = '尚未提问：先预测能答还是拒答，再点“问”。'
    } else if (predicted === null) {
      detail = '尚未预测：先猜助手会回答还是拒绝，再点“问”。'
    } else if ((predicted === '能答') === answer.answered) {
      passed = true
      detail = answer.answered ? '预测正确：助手回答了。' : '预测正确：助手拒答了。'
    } else if (predicted === '能答') {
      detail = '预测错了：你猜能答，助手拒答了。'
    } else {
      detail = '预测错了：你猜拒答，助手回答了。'
    }
    return {
      id: pair.id,
      question: pair.question,
      category: pair.category,
      predicted,
      asked,
      answered: answer.answered,
      passed,
      detail,
    }
  })
  const passedCount = checks.filter((check) => check.passed).length
  return {
    checks,
    passedCount,
    totalChecks: QA_PAIRS.length,
    passed: passedCount === QA_PAIRS.length,
  }
}

/** 一条自写提问的核对：助手实际答/拒与学生预测是否一致。 */
export function checkCustomQuestion(custom: QaCustomQuestion): {
  answered: boolean
  correct: boolean
} {
  const answer = answerQuestion(custom.text)
  return {
    answered: answer.answered,
    correct: (custom.predicted === '能答') === answer.answered,
  }
}

/* ------------------------------------------------------------------ */
/* 错误示例：试点 L05 的两条待核对答案（ans2 编造数字、ans3 编造来源）  */
/* ------------------------------------------------------------------ */

export const ERROR_EXAMPLES: AnswerToCheck[] = ANSWERS_TO_CHECK.filter((answer) =>
  (ERROR_EXAMPLE_IDS as readonly string[]).includes(answer.id),
)

/** 核对一条错误示例：返回试点引用核对的实算结论。 */
export function checkErrorExample(answer: AnswerToCheck): CitationVerdict {
  return checkCitationAnswer(answer)
}

/* ------------------------------------------------------------------ */
/* 三级提示：逐级揭示，不一次全给                                       */
/* ------------------------------------------------------------------ */

export const HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = [
  { level: 1, title: '一级提示：看规则卡', text: '先看规则卡：能答的问题都在本地知识库里，超范围的一律拒答；先看八问的分类，再猜。' },
  { level: 2, title: '二级提示：先预测再问', text: '猜一猜助手会回答还是拒绝，问完对照结果；猜错就看关键词命中了哪一条。' },
  { level: 3, title: '三级提示：迁移用新问题', text: '写一个新问题，先猜它会答还是拒，再问助手验证；旧问题重复问不作最终成绩。' },
]

export const LESSON_STEPS: string[] = [
  '第一步：读规则卡——8 个问题，事实类 4、方法类 2、超范围类 2。',
  '第二步：逐个预测、提问、核对——猜答还是拒，问完对照，再识别两个错误示例。',
  '第三步：写新问题迁移验证——各写一个能答与一个拒答的新问题，预测正确才是掌握。',
]
