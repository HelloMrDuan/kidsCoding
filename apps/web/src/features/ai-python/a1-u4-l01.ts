/**
 * A1-U4-L01 提出校园真实问题：把校园生活里的问题写成
 * “要判断什么、用什么数据、做到什么样算有用”三句话，
 * 再用可行性检查四问筛掉“数据拿不到、本地做不了、许可过不了”的题目。
 *
 * 前置 A1-U3-L06《制作学习问答助手》教的是“助手什么时候该回答、
 * 什么时候必须拒绝”；本课用同样的边界判断筛题目——个人记录类题目
 * 一律拒答、不开题。
 *
 * 诚实边界（课堂上明说）：
 * - 校园真实问题不等于真实校园数据：课堂上用的必须是聚合计数或合成数据，
 *   绝不拿真实学生记录（姓名、班级、成绩、消费记录）当课上数据。
 * - 三个讨论例均为课堂讨论例，不含任何真实校园数据；数据一律是聚合计数。
 * - 问题卡全过只表示本次课堂练习合格，不等于能直接做真实校园项目；
 *   真实项目还须过 L02 许可清单与教师确认。
 * - 日志与方法证据只记计数（分类几条、问题卡是否齐全、可行性检查几问、
 *   迁移几个场景），不记学生写的原文、不记学生身份。
 */

export const L01_LESSON_ID = 'A1-U4-L01'
export const L01_LESSON_TITLE = '提出校园真实问题'
export const L01_ROUTE = '/learn/ai-python-lab-u4-l01/A1-U4-L01'

/** 问题陈述一句话的字数上限（与 L02 自加句同款 200 字上限）。 */
export const MAX_STATEMENT_LENGTH = 200
/** 可行性检查一条备注的字数上限。 */
export const MAX_NOTE_LENGTH = 100

/** 探索分类：一条问题描述是有效问题，还是模糊需求。 */
export type ExploreClassification = '有效' | '模糊'

/** 可行性检查一问的结论：通过，或不可行。 */
export type FeasibilityAnswer = '通过' | '不可行'

/** 问题卡选例：三例讨论卡之一。 */
export type ProblemExampleId = 'E1' | 'E2' | 'E3'

/** 迁移场景：两个新校园场景之一。 */
export type TransferScenarioId = 'T1' | 'T2'

/** 成绩选择题选项。 */
export type GradesOption = 'A' | 'B' | 'C'

/** 三句问题陈述：要判断什么 / 用什么数据 / 做到什么样算有用。 */
export type ProblemStatement = { target: string; data: string; success: string }

/**
 * L01 草稿形状（字段定义见 a1-u4-l01-draft.ts 的实现；类型放这里，
 * 与 L06 的做法一致：草稿模块 import 类型，本模块不 import 草稿模块，
 * 避免值层循环引用）。
 */
export type L01Draft = {
  version: 1
  explore: Record<string, ExploreClassification | undefined>
  chosenExample: ProblemExampleId | null
  statement: ProblemStatement
  feasibility: Record<string, FeasibilityAnswer | undefined>
  feasibilityNotes: Record<string, string>
  transferScenario: TransferScenarioId | null
  transferStatement: ProblemStatement
  gradesAnswer: GradesOption | null
  hintLevel: 0 | 1 | 2 | 3
}

/* ------------------------------------------------------------------ */
/* 探索：六条问题描述（有效 3、模糊 3）                                  */
/* ------------------------------------------------------------------ */

/** 一条探索描述：问题原文、正确答案、分类后揭示的原因。 */
export type ExploreItem = {
  id: string
  text: string
  kind: ExploreClassification
  reason: string
}

export const EXPLORE_ITEMS: ExploreItem[] = [
  {
    id: 'E1',
    text: '食堂剩菜称重统计：判断“哪类菜品剩得多”，数据是每日各窗口剩菜总重量（聚合计数）。',
    kind: '有效',
    reason: '有效：判断目标是分类（哪类剩得多），数据是聚合计数，本地规则就能做，不碰个人信息。',
  },
  {
    id: 'E2',
    text: '图书馆热门书架补书提醒：判断“哪排书架最常被借空”，数据是各排每日借出册数（聚合计数）。',
    kind: '有效',
    reason: '有效：判断目标是排序（哪排最常被借空），数据是聚合计数，本地规则就能做，不碰个人信息。',
  },
  {
    id: 'E3',
    text: '校园垃圾分类投放点满溢提醒：判断“哪个投放点最快满”，数据是各点每日投放袋数（聚合计数）。',
    kind: '有效',
    reason: '有效：判断目标是排序（哪个最快满），数据是聚合计数，本地规则就能做，不碰个人信息。',
  },
  {
    id: 'V1',
    text: '“让食堂更好吃”。',
    kind: '模糊',
    reason: '模糊：没有判断目标、没有数据、没有成功标准——不知道要判断什么、做到什么样算有用。',
  },
  {
    id: 'V2',
    text: '“用全班真实成绩预测谁会考砸”。',
    kind: '模糊',
    reason:
      '禁题：用了全班真实成绩，是个人记录，许可过不了，后果还敏感——不能当课堂题目，请换题。',
  },
  {
    id: 'V3',
    text: '“提高图书馆效率”。',
    kind: '模糊',
    reason: '模糊：没有具体成功标准——不知道做到什么样算“提高”，没法判断做没做成。',
  },
]

/** 探索描述的编号（判定与草稿只认这些编号）。 */
export const EXPLORE_IDS = ['E1', 'E2', 'E3', 'V1', 'V2', 'V3'] as const

/* ------------------------------------------------------------------ */
/* 问题卡：三例讨论卡（均为聚合计数，不含真实数据）                      */
/* ------------------------------------------------------------------ */

/** 一例讨论卡：标题、判断目标、数据（聚合计数）。 */
export type ProblemExample = {
  id: ProblemExampleId
  title: string
  target: string
  data: string
}

export const PROBLEM_EXAMPLES: ProblemExample[] = [
  {
    id: 'E1',
    title: '食堂剩菜称重统计',
    target: '判断“哪类菜品剩得多”',
    data: '每日各窗口剩菜总重量（聚合计数）',
  },
  {
    id: 'E2',
    title: '图书馆热门书架补书提醒',
    target: '判断“哪排书架最常被借空”',
    data: '各排每日借出册数（聚合计数）',
  },
  {
    id: 'E3',
    title: '校园垃圾分类投放点满溢提醒',
    target: '判断“哪个投放点最快满”',
    data: '各点每日投放袋数（聚合计数）',
  },
]

/* ------------------------------------------------------------------ */
/* 可行性检查四问（缺一即不可行，须换题或缩题）                          */
/* ------------------------------------------------------------------ */

/** 一问可行性检查：编号、问题、括号里的判断要点。 */
export type FeasibilityQuestion = { id: string; text: string }

export const FEASIBILITY_QUESTIONS: FeasibilityQuestion[] = [
  { id: 'Q1', text: '数据能不能拿到？（聚合计数还是个人记录）' },
  { id: 'Q2', text: '标签清不清楚？（每条数据有没有明确类别）' },
  { id: 'Q3', text: '本地平面能不能做？（规则 + 计数，还是必须调模型）' },
  { id: 'Q4', text: '许可过不过？（缺许可即停，见 L02）' },
]

/** 可行性检查的编号（判定与草稿只认这些编号）。 */
export const FEASIBILITY_IDS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

/* ------------------------------------------------------------------ */
/* 迁移：两个新校园场景（均为聚合计数）                                  */
/* ------------------------------------------------------------------ */

/** 一个迁移场景：编号、标题、判断目标、数据（聚合计数）。 */
export type TransferScenario = {
  id: TransferScenarioId
  title: string
  target: string
  data: string
}

export const TRANSFER_SCENARIOS: TransferScenario[] = [
  {
    id: 'T1',
    title: '操场器材借用提醒',
    target: '判断“哪种器材最常被借空”',
    data: '各器材每日借出次数（聚合计数）',
  },
  {
    id: 'T2',
    title: '校园失物招领分类',
    target: '判断“哪类失物最常出现”',
    data: '每周各类别失物登记件数（聚合计数）',
  },
]

/* ------------------------------------------------------------------ */
/* 成绩选择题：为什么个人记录类题目不能当课堂题目                        */
/* ------------------------------------------------------------------ */

/** 成绩选择题：题干、三选项、正确答案。 */
export const GRADES_QUESTION = {
  question: '为什么“用全班真实成绩预测谁会考砸”不能当课堂题目？',
  options: [
    { id: 'A' as const, text: '因为它用了个人记录，许可过不了，后果还敏感' },
    { id: 'B' as const, text: '因为成绩数据太难拿到' },
    { id: 'C' as const, text: '因为 AI 算不出成绩' },
  ],
  answer: 'A' as const,
  /** 答错后的反馈：错不在数据难拿或 AI 算不出，而在许可与隐私。 */
  wrongFeedback: '不对，再想想：成绩数据拿得到，AI 也能算，问题是许可与隐私。',
  correctFeedback: '答对了：因为它用了个人记录，许可过不了，后果还敏感。',
} as const

/* ------------------------------------------------------------------ */
/* 判定：探索 / 问题卡 / 迁移，三者全过才算本课合格（fail-closed）        */
/* ------------------------------------------------------------------ */

/** 一句问题陈述是否有效：非空且 1–200 字（按去空格后长度）。 */
export function isStatementValid(text: unknown): text is string {
  return (
    typeof text === 'string' &&
    text.trim().length >= 1 &&
    text.trim().length <= MAX_STATEMENT_LENGTH
  )
}

/** 一条探索描述的核对结果。 */
export type ExploreCheck = {
  id: string
  text: string
  picked: ExploreClassification | null
  expected: ExploreClassification
  passed: boolean
  detail: string
}

/** 六条探索描述一次核对的完整结果。 */
export type ExploreCheckResult = {
  checks: ExploreCheck[]
  passedCount: number
  totalChecks: number
  passed: boolean
}

/**
 * 核对探索分类：逐条对照答案，分类与预期一致才算通过。
 * 未分类、分类错，一律未通过（fail-closed）。
 */
export function checkExplore(draft: L01Draft): ExploreCheckResult {
  const checks: ExploreCheck[] = EXPLORE_ITEMS.map((item) => {
    const picked = draft.explore[item.id] ?? null
    let passed = false
    let detail: string
    if (picked === null) {
      detail = '尚未分类：先选“有效”还是“模糊”。'
    } else if (picked === item.kind) {
      passed = true
      detail = `分类正确：${item.reason}`
    } else {
      detail = `分类错了：${item.reason}`
    }
    return { id: item.id, text: item.text, picked, expected: item.kind, passed, detail }
  })
  const passedCount = checks.filter((check) => check.passed).length
  return {
    checks,
    passedCount,
    totalChecks: EXPLORE_ITEMS.length,
    passed: passedCount === EXPLORE_ITEMS.length,
  }
}

/** 问题卡一次核对的完整结果。 */
export type ProblemCardCheck = {
  chosenExample: ProblemExampleId | null
  statementComplete: boolean
  feasibilityAnsweredCount: number
  feasibilityTotal: number
  passed: boolean
  detail: string
}

/**
 * 核对问题卡：选了例 + 三句话均非空（1–200 字）+ 四问均已答，才算通过。
 * 四问答“通过”或“不可行”都算已答——写出不可行点不丢人，硬上才丢人。
 * 未选例、缺句、缺问，一律未通过（fail-closed）。
 */
export function checkProblemCard(draft: L01Draft): ProblemCardCheck {
  const statementComplete =
    isStatementValid(draft.statement.target) &&
    isStatementValid(draft.statement.data) &&
    isStatementValid(draft.statement.success)
  const feasibilityAnsweredCount = FEASIBILITY_IDS.filter(
    (id) => draft.feasibility[id] !== undefined,
  ).length
  const passed =
    draft.chosenExample !== null &&
    statementComplete &&
    feasibilityAnsweredCount === FEASIBILITY_IDS.length
  const missing: string[] = []
  if (draft.chosenExample === null) missing.push('未选讨论例')
  if (!statementComplete) missing.push('问题陈述三句未齐')
  if (feasibilityAnsweredCount < FEASIBILITY_IDS.length) {
    missing.push(`可行性检查只答了 ${feasibilityAnsweredCount}/${FEASIBILITY_IDS.length} 问`)
  }
  return {
    chosenExample: draft.chosenExample,
    statementComplete,
    feasibilityAnsweredCount,
    feasibilityTotal: FEASIBILITY_IDS.length,
    passed,
    detail: passed
      ? '问题卡完成：已选讨论例，三句问题陈述齐全，四问可行性检查均已答。'
      : `问题卡未完成：${missing.join('；')}。`,
  }
}

/** 迁移一次核对的完整结果。 */
export type TransferCheck = {
  scenario: TransferScenarioId | null
  statementComplete: boolean
  gradesCorrect: boolean
  passed: boolean
  detail: string
}

/**
 * 核对迁移：选了场景 + 迁移三句话均非空（1–200 字）+ 成绩题答对 A，
 * 才算通过。未选场景、缺句、成绩题答错，一律未通过（fail-closed）。
 */
export function checkTransfer(draft: L01Draft): TransferCheck {
  const statementComplete =
    isStatementValid(draft.transferStatement.target) &&
    isStatementValid(draft.transferStatement.data) &&
    isStatementValid(draft.transferStatement.success)
  const gradesCorrect = draft.gradesAnswer === GRADES_QUESTION.answer
  const passed =
    draft.transferScenario !== null && statementComplete && gradesCorrect
  const missing: string[] = []
  if (draft.transferScenario === null) missing.push('未选迁移场景')
  if (!statementComplete) missing.push('迁移三句未齐')
  if (!gradesCorrect) missing.push('成绩题未答对')
  return {
    scenario: draft.transferScenario,
    statementComplete,
    gradesCorrect,
    passed,
    detail: passed
      ? '迁移完成：已选新场景，三句迁移陈述齐全，成绩题答对。'
      : `迁移未完成：${missing.join('；')}。`,
  }
}

/** 本课一次核对的完整结果：探索 + 问题卡 + 迁移。 */
export type L01CheckResult = {
  explore: ExploreCheckResult
  problemCard: ProblemCardCheck
  transfer: TransferCheck
  passed: boolean
}

/** 核对本课：探索、问题卡、迁移三者全过才算合格（fail-closed）。 */
export function checkL01(draft: L01Draft): L01CheckResult {
  const explore = checkExplore(draft)
  const problemCard = checkProblemCard(draft)
  const transfer = checkTransfer(draft)
  return {
    explore,
    problemCard,
    transfer,
    passed: explore.passed && problemCard.passed && transfer.passed,
  }
}

/* ------------------------------------------------------------------ */
/* 三级提示：逐级揭示，不一次全给                                       */
/* ------------------------------------------------------------------ */

export const HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = [
  {
    level: 1,
    title: '一级提示：看三例',
    text: '先看三例的共同点：判断目标是分类或排序，数据是计数，本地规则就能做，不碰个人信息。',
  },
  {
    level: 2,
    title: '二级提示：写三句话',
    text: '问题陈述只写三句：要判断什么、用什么数据、做到什么样算有用；成功标准要写具体数或具体动作，不写空话。',
  },
  {
    level: 3,
    title: '三级提示：换场景再分析',
    text: '换一个没做过的校园场景，重新写三句话、再做四问检查；个人记录类题目一律不开题。',
  },
]

export const LESSON_STEPS: string[] = [
  '第一步：分类六条问题描述——有效还是模糊，分类后看原因。',
  '第二步：选一例填问题卡——三句问题陈述 + 四问可行性检查。',
  '第三步：换场景迁移——选一个新场景重写三句话，再答成绩题。',
]
