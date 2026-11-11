/**
 * A1-U4-L02 建立数据使用许可：给 L01 的问题列一张数据使用许可清单
 * （每项数据要不要许可、向谁申请、许可覆盖什么、不覆盖什么），
 * 能说清“默认拒绝”是什么意思，并能对一张“看起来能用、其实许可没过”
 * 的数据表说不。
 *
 * 前置 A1-U4-L01《提出校园真实问题》教的是“提出值得用 AI 试试的
 * 真实问题”；本课给 L01 选出的问题做许可清单——L01 的三例都是聚合计数，
 * 本课要给它们逐项确认许可状态；个人记录类题目 L01 已拒答，本课再确认
 * 一次：缺许可即停。
 *
 * 诚实边界（课堂上明说）：
 * - 设计包 §5 的同意范围一字不改复述四条（见 PERMISSION_RULES），
 *   其中“监护人同意如何映射到某个儿童档案”在仓内无对应设计、未核实；
 *   本节只教许可清单的写法与默认拒绝的纪律，不假装系统里的映射机制
 *   已经存在；映射机制本身为待填 stub（试点实现时以设计批件为准）。
 * - 否决题数据表为新增合成数据，明码标注，无真实个人信息；清单是课堂文档，
 *   不改变任何系统许可状态；本课不收集、不上传学生数据，不调用外部模型。
 * - 清单全过只表示本次课堂练习合格，不等于能直接做真实校园项目；
 *   真实项目还须过教师确认。
 * - 日志与方法证据只记计数（分类几项、清单几行、否决题几项、scope 题
 *   是否答对、不覆盖事项选对几项），不记学生写的原文、不记学生身份。
 */

export const L02_LESSON_ID = 'A1-U4-L02'
export const L02_LESSON_TITLE = '建立数据使用许可'
export const L02_ROUTE = '/learn/ai-python-lab-u4-l02/A1-U4-L02'

/** 许可清单一格文字的字数上限（与 L01 三句话同款 200 字上限）。 */
export const MAX_TEXT_LENGTH = 200
/** 许可清单行数：不少于 3 项（详案任务 1）。 */
export const CHECKLIST_ROWS = 3

/** 探索分类：一项数据是聚合可用，还是缺许可即停。 */
export type ExploreClassification = '聚合可用' | '缺许可即停'

/** 许可清单一行的许可状态：只写这三者，不写“大概有了”。 */
export type ChecklistStatus = '已授予' | '未授予' | '不适用'

/** 许可清单一行的默认处置：缺许可即停，不写“先用着”。 */
export type ChecklistDisposition = '停' | '可用'

/** 许可清单一行是否含个人信息。 */
export type ContainsPii = '是' | '否'

/** 否决题一行数据的默认处置。 */
export type VetoDisposition = '停' | '可用'

/** scope 选择题选项。 */
export type ScopeOption = 'A' | 'B' | 'C'

/** 许可清单一行：数据项 / 是否含个人信息 / 需何种许可 / 许可状态 / 默认处置。 */
export type ChecklistRow = {
  item: string
  containsPii: ContainsPii | null
  permissionNeeded: string
  status: ChecklistStatus | null
  disposition: ChecklistDisposition | null
}

/**
 * L02 草稿形状（字段定义见 a1-u4-l02-draft.ts 的实现；类型放这里，
 * 与 L01 的做法一致：草稿模块 import 类型，本模块不 import 草稿模块，
 * 避免值层循环引用）。
 */
export type L02Draft = {
  version: 1
  explore: Record<string, ExploreClassification | undefined>
  checklist: ChecklistRow[]
  veto: Record<string, VetoDisposition | undefined>
  scopeAnswer: ScopeOption | null
  nonCoverage: string[]
  hintLevel: 0 | 1 | 2 | 3
}

/* ------------------------------------------------------------------ */
/* 设计包 §5 同意范围四条（一字不改复述）                                */
/* ------------------------------------------------------------------ */

/** 设计包 §5 同意范围：编号、原文。 */
export type PermissionRule = { id: string; text: string }

export const PERMISSION_RULES: PermissionRule[] = [
  {
    id: 'R1',
    text: '默认拒绝：无许可记录 = 不可用，不是“先用着、以后再补”。',
  },
  {
    id: 'R2',
    text: 'scope 分离：cloud-drafts（云端草稿）同意 ≠ 外部生成式 AI 同意，两者须分别授予、分别撤销、分别记录，不得互相挪用。',
  },
  {
    id: 'R3',
    text: 'scope 由服务端写死，永不由调用方传入（仿照既有 guardian-consent 路由模式）。',
  },
  {
    id: 'R4',
    text: '许可不覆盖事项（即使有同意也默认关闭）：儿童输入用于模型训练（永不覆盖，否决项）、真实人物照片上传、跨课程持久化对话记忆、原始提示词与生成内容的保存、课节范围外的通用聊天。',
  },
]

/** 同意范围四条的编号。 */
export const PERMISSION_RULE_IDS = ['R1', 'R2', 'R3', 'R4'] as const

/* ------------------------------------------------------------------ */
/* 探索：六项数据（聚合可用 3、缺许可即停 3）                            */
/* ------------------------------------------------------------------ */

/** 一项探索数据：数据原文、正确答案、分类后揭示的原因。 */
export type ExploreItem = {
  id: string
  text: string
  kind: ExploreClassification
  reason: string
}

export const EXPLORE_ITEMS: ExploreItem[] = [
  {
    id: 'A1',
    text: '每日各窗口剩菜总重量（聚合计数）。',
    kind: '聚合可用',
    reason: '聚合可用：聚合计数不含个人信息，走“聚合数据可用、仍须教师确认来源”一栏。',
  },
  {
    id: 'A2',
    text: '各排每日借出册数（聚合计数）。',
    kind: '聚合可用',
    reason: '聚合可用：聚合计数不含个人信息，走“聚合数据可用、仍须教师确认来源”一栏。',
  },
  {
    id: 'A3',
    text: '各点每日投放袋数（聚合计数）。',
    kind: '聚合可用',
    reason: '聚合可用：聚合计数不含个人信息，走“聚合数据可用、仍须教师确认来源”一栏。',
  },
  {
    id: 'P1',
    text: '全班同学姓名与班级名单。',
    kind: '缺许可即停',
    reason:
      '缺许可即停：姓名与班级是个人记录，缺许可即停；不得以“匿名化一下”绕过——学生无法验证匿名化是否彻底。',
  },
  {
    id: 'P2',
    text: '每人每次考试成绩。',
    kind: '缺许可即停',
    reason:
      '缺许可即停：成绩是个人记录，许可过不了，后果还敏感——缺许可即停，不得以“匿名化一下”绕过。',
  },
  {
    id: 'P3',
    text: '每人食堂消费记录。',
    kind: '缺许可即停',
    reason:
      '缺许可即停：消费记录是个人记录，缺许可即停；不得以“匿名化一下”绕过——学生无法验证匿名化是否彻底。',
  },
]

/** 探索数据的编号（判定与草稿只认这些编号）。 */
export const EXPLORE_IDS = ['A1', 'A2', 'A3', 'P1', 'P2', 'P3'] as const

/* ------------------------------------------------------------------ */
/* 否决题：混有个人记录的合成数据表（新增合成数据，明码标注）              */
/* ------------------------------------------------------------------ */

/** 否决题一行：数据原文、正确默认处置、判后揭示的原因。 */
export type VetoItem = {
  id: string
  text: string
  expected: VetoDisposition
  reason: string
}

export const VETO_ITEMS: VetoItem[] = [
  {
    id: 'W1',
    text: '各窗口剩菜总重量（聚合计数）。',
    expected: '可用',
    reason: '聚合计数不含个人信息，许可状态“不适用”，默认处置“可用”（仍须教师确认来源）。',
  },
  {
    id: 'W2',
    text: '各排每日借出册数（聚合计数）。',
    expected: '可用',
    reason: '聚合计数不含个人信息，许可状态“不适用”，默认处置“可用”（仍须教师确认来源）。',
  },
  {
    id: 'W3',
    text: '全班同学姓名与成绩。',
    expected: '停',
    reason: '个人记录，许可未授予，默认处置“停”；不得以“匿名化一下”绕过。',
  },
  {
    id: 'W4',
    text: '每人食堂消费金额。',
    expected: '停',
    reason: '个人记录，许可未授予，默认处置“停”；不得以“匿名化一下”绕过。',
  },
]

/** 否决题的编号（判定与草稿只认这些编号）。 */
export const VETO_IDS = ['W1', 'W2', 'W3', 'W4'] as const

/* ------------------------------------------------------------------ */
/* scope 分离选择题：为什么 cloud-drafts 同意不能调生成式模型             */
/* ------------------------------------------------------------------ */

/** scope 选择题：题干、三选项、正确答案。 */
export const SCOPE_QUESTION = {
  question: '为什么“已经有 cloud-drafts 同意”不能直接用来调生成式模型？',
  options: [
    {
      id: 'A' as const,
      text: 'scope 分离：cloud-drafts 同意与外部生成式 AI 同意互不通用，须分别授予',
    },
    { id: 'B' as const, text: '因为 cloud-drafts 同意过期了' },
    { id: 'C' as const, text: '因为生成式模型不认云端草稿的格式' },
  ],
  answer: 'A' as const,
  /** 答错后的反馈：错不在过期或格式，而在两种同意互不通用。 */
  wrongFeedback: '不对，再想想：不是过期、也不是格式问题，是两种同意互不通用。',
  correctFeedback: '答对了：scope 分离，两种同意互不通用，须分别授予、分别撤销、分别记录。',
} as const

/* ------------------------------------------------------------------ */
/* 许可不覆盖事项：即使有同意也默认关闭（5 项真 + 2 项干扰）               */
/* ------------------------------------------------------------------ */

/** 不覆盖事项一候选项：编号、文本、是否真为“即使有同意也不覆盖”。 */
export type NonCoverageItem = {
  id: string
  text: string
  notCovered: boolean
}

export const NON_COVERAGE_ITEMS: NonCoverageItem[] = [
  { id: 'N1', text: '儿童输入用于模型训练（永不覆盖，否决项）', notCovered: true },
  { id: 'N2', text: '真实人物照片上传', notCovered: true },
  { id: 'N3', text: '跨课程持久化对话记忆', notCovered: true },
  { id: 'N4', text: '原始提示词与生成内容的保存', notCovered: true },
  { id: 'N5', text: '课节范围外的通用聊天', notCovered: true },
  { id: 'N6', text: '云端草稿保存（cloud-drafts 同意覆盖的范围）', notCovered: false },
  { id: 'N7', text: '本地规则计算（本地平面可做，不需外部许可）', notCovered: false },
]

/** 真为“即使有同意也不覆盖”的事项编号（判定只认这些）。 */
export const NON_COVERAGE_IDS = ['N1', 'N2', 'N3', 'N4', 'N5'] as const

/* ------------------------------------------------------------------ */
/* 判定：探索 / 许可清单 / 迁移，三者全过才算本课合格（fail-closed）      */
/* ------------------------------------------------------------------ */

/** 一格清单文字是否有效：非空且 1–200 字（按去空格后长度）。 */
export function isTextValid(text: unknown): text is string {
  return (
    typeof text === 'string' &&
    text.trim().length >= 1 &&
    text.trim().length <= MAX_TEXT_LENGTH
  )
}

/** 一项探索数据的核对结果。 */
export type ExploreCheck = {
  id: string
  text: string
  picked: ExploreClassification | null
  expected: ExploreClassification
  passed: boolean
  detail: string
}

/** 六项探索数据一次核对的完整结果。 */
export type ExploreCheckResult = {
  checks: ExploreCheck[]
  passedCount: number
  totalChecks: number
  passed: boolean
}

/**
 * 核对探索分类：逐项对照答案，分类与预期一致才算通过。
 * 未分类、分类错，一律未通过（fail-closed）。
 */
export function checkExplore(draft: L02Draft): ExploreCheckResult {
  const checks: ExploreCheck[] = EXPLORE_ITEMS.map((item) => {
    const picked = draft.explore[item.id] ?? null
    let passed = false
    let detail: string
    if (picked === null) {
      detail = '尚未分类：先选“聚合可用”还是“缺许可即停”。'
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

/** 许可清单一行核对的完整结果。 */
export type ChecklistRowCheck = {
  index: number
  itemComplete: boolean
  dispositionConsistent: boolean
  passed: boolean
  detail: string
}

/** 许可清单一次核对的完整结果。 */
export type ChecklistCheckResult = {
  rows: ChecklistRowCheck[]
  completedRows: number
  totalRows: number
  passed: boolean
  detail: string
}

/**
 * 核对许可清单：3 行逐行核对。每行须五列齐全（数据项与需何种许可各 1–200 字、
 * 是否含个人信息、许可状态、默认处置均已选），且默认处置与许可状态一致：
 * - 含个人信息却写许可状态“不适用”——错，个人记录必须有许可；
 * - 许可状态“未授予”却处置不是“停”——错，缺许可即停；
 * - 许可状态“已授予”或“不适用”却处置不是“可用”——错。
 * 缺格、不一致，一律未通过（fail-closed）。
 */
export function checkChecklist(draft: L02Draft): ChecklistCheckResult {
  const rows: ChecklistRowCheck[] = draft.checklist.map((row, index) => {
    const itemComplete =
      isTextValid(row.item) &&
      row.containsPii !== null &&
      isTextValid(row.permissionNeeded) &&
      row.status !== null &&
      row.disposition !== null
    let dispositionConsistent = false
    let consistencyDetail = ''
    if (!itemComplete) {
      consistencyDetail = '五列未齐'
    } else if (row.containsPii === '是' && row.status === '不适用') {
      consistencyDetail = '个人记录必须有许可，不能写“不适用”'
    } else if (row.status === '未授予' && row.disposition !== '停') {
      consistencyDetail = '许可未授予，默认处置必须是“停”'
    } else if (row.status !== '未授予' && row.disposition !== '可用') {
      consistencyDetail = '许可已授予或不适用，默认处置才是“可用”'
    } else {
      dispositionConsistent = true
    }
    const passed = itemComplete && dispositionConsistent
    return {
      index,
      itemComplete,
      dispositionConsistent,
      passed,
      detail: passed
        ? `第 ${index + 1} 行完成：五列齐全，默认处置与许可状态一致。`
        : `第 ${index + 1} 行未完成：${consistencyDetail}。`,
    }
  })
  const completedRows = rows.filter((row) => row.passed).length
  const passed = completedRows === CHECKLIST_ROWS && rows.length === CHECKLIST_ROWS
  return {
    rows,
    completedRows,
    totalRows: CHECKLIST_ROWS,
    passed,
    detail: passed
      ? '许可清单完成：3 行五列齐全，默认处置与许可状态一致。'
      : `许可清单未完成：${rows.filter((row) => !row.passed).map((row) => row.detail).join('；')}。`,
  }
}

/** 迁移一次核对的完整结果。 */
export type TransferCheck = {
  vetoPassedCount: number
  vetoTotal: number
  vetoPassed: boolean
  scopeCorrect: boolean
  nonCoverageCorrect: boolean
  nonCoveragePickedCount: number
  passed: boolean
  detail: string
}

/**
 * 核对迁移：否决题 4 行默认处置全对 + scope 题答对 A + 不覆盖事项恰好选对
 * 5 项（不多不少），才算通过。缺行、答错、多选、漏选，一律未通过（fail-closed）。
 */
export function checkTransfer(draft: L02Draft): TransferCheck {
  const vetoPassedCount = VETO_ITEMS.filter(
    (item) => draft.veto[item.id] === item.expected,
  ).length
  const vetoPassed = vetoPassedCount === VETO_ITEMS.length
  const scopeCorrect = draft.scopeAnswer === SCOPE_QUESTION.answer
  const picked = new Set(draft.nonCoverage)
  const nonCoverageCorrect =
    picked.size === NON_COVERAGE_IDS.length &&
    NON_COVERAGE_IDS.every((id) => picked.has(id))
  const passed = vetoPassed && scopeCorrect && nonCoverageCorrect
  const missing: string[] = []
  if (!vetoPassed) missing.push(`否决题只对了 ${vetoPassedCount}/${VETO_ITEMS.length} 项`)
  if (!scopeCorrect) missing.push('scope 题未答对')
  if (!nonCoverageCorrect) {
    const truePicked = [...picked].filter((id) =>
      (NON_COVERAGE_IDS as readonly string[]).includes(id),
    ).length
    missing.push(`不覆盖事项选对了 ${truePicked}/5 项，共选了 ${picked.size} 项`)
  }
  return {
    vetoPassedCount,
    vetoTotal: VETO_ITEMS.length,
    vetoPassed,
    scopeCorrect,
    nonCoverageCorrect,
    nonCoveragePickedCount: draft.nonCoverage.length,
    passed,
    detail: passed
      ? '迁移完成：否决题 4 项全对，scope 题答对，不覆盖事项 5 项全选对。'
      : `迁移未完成：${missing.join('；')}。`,
  }
}

/** 本课一次核对的完整结果：探索 + 许可清单 + 迁移。 */
export type L02CheckResult = {
  explore: ExploreCheckResult
  checklist: ChecklistCheckResult
  transfer: TransferCheck
  passed: boolean
}

/** 核对本课：探索、许可清单、迁移三者全过才算合格（fail-closed）。 */
export function checkL02(draft: L02Draft): L02CheckResult {
  const explore = checkExplore(draft)
  const checklist = checkChecklist(draft)
  const transfer = checkTransfer(draft)
  return {
    explore,
    checklist,
    transfer,
    passed: explore.passed && checklist.passed && transfer.passed,
  }
}

/* ------------------------------------------------------------------ */
/* 三级提示：逐级揭示，不一次全给                                       */
/* ------------------------------------------------------------------ */

export const HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = [
  {
    level: 1,
    title: '一级提示：先分两堆',
    text: '清单先按“含不含个人信息”分两堆，再谈许可。',
  },
  {
    level: 2,
    title: '二级提示：只写三态',
    text: '许可状态只写“已授予 / 未授予 / 不适用”，不写“大概有了”；默认处置一律写“停”，不写“先用着”。',
  },
  {
    level: 3,
    title: '三级提示：缺许可即停',
    text: '缺许可的项一律停；“匿名化一下”不是绕过许可的理由；cloud-drafts 同意不能挪用给生成式模型。',
  },
]

export const LESSON_STEPS: string[] = [
  '第一步：分类六项数据——聚合可用还是缺许可即停，分类后看原因。',
  '第二步：给 L01 的问题填一张许可清单——五列齐全，缺许可即停。',
  '第三步：否决题与 scope 分离——对混有个人记录的合成数据表说不，再答 scope 题。',
]
