/**
 * A1-U3-L02 实现文本摘要：把 U3 本地试点里的摘要演示变成一节完整课堂。
 *
 * 复用（不重新实现）：试点已发表的合成课文 SUMMARY_PASSAGE（5 段、要点
 * A/B/C）与本地判定引擎 summarizePassage / checkSummary（见
 * u3-local-engines.ts）。本课不新增试点引擎，不调用外部模型，不接网关：
 * 生成式摘要在详案里只有一句话方向，本课不实现它，课堂上明说这一点。
 *
 * 本课新增的只是课堂交互层：学生动手摘要（选句 + 自加句 → 五项检查）、
 * 事实核对（原文事实 / 合理概括 / 无依据推断）、正反例、三级提示。
 * 课文是合成数据，不是真实教材；摘要判断一律由本地纯函数算出，不手填。
 *
 * 判定语义（首席复核后补强，旧版三项检查不够用）：
 * - 光有试点三项检查时，全选 10 句也能通过（要点全、逐字、数字都在），
 *   同要点重复选句也不被拒绝，改原意只看数字是否在全文出现。
 * - 本课在试点三项之上加两项课堂检查：抽取规范（3–5 句且每要点至多一句）
 *   与结构化来源核验（每句必须与所标来源原文逐字一致，无来源的句子不通过）。
 * - 自加句没有来源：它过不了来源核验，也不能替任何要点背书（要点覆盖只算
 *   有来源的选句），带新数字的自加句同时触发改原意。
 */

import {
  SUMMARY_PASSAGE,
  SUMMARY_POINTS,
  checkSummary,
  summarizePassage,
  type SummaryCheck,
  type SummaryPoint,
  type SummaryResult,
} from './u3-local-engines'

export const L02_LESSON_ID = 'A1-U3-L02'
export const L02_LESSON_TITLE = '实现文本摘要'
export const L02_ROUTE = '/learn/ai-python-lab-u3-l02/A1-U3-L02'

export { SUMMARY_PASSAGE, SUMMARY_POINTS, summarizePassage, checkSummary }
export type { SummaryCheck, SummaryPoint, SummaryResult }

/** 每段每句的稳定编号：P1-1、P1-2、P2-1 …… 课堂选句与草稿都用它。 */
export type SentenceId = string

export function sentenceId(paragraphId: string, index: number): SentenceId {
  return `${paragraphId}-${index + 1}`
}

export function allSentenceIds(): SentenceId[] {
  return SUMMARY_PASSAGE.flatMap((paragraph) =>
    paragraph.sentences.map((_, index) => sentenceId(paragraph.id, index)),
  )
}

function sentenceById(id: SentenceId): { text: string; point: SummaryPoint } | null {
  for (const paragraph of SUMMARY_PASSAGE) {
    for (let index = 0; index < paragraph.sentences.length; index++) {
      if (sentenceId(paragraph.id, index) === id) {
        return { text: paragraph.sentences[index], point: paragraph.point }
      }
    }
  }
  return null
}

const POINT_ORDER: SummaryPoint[] = ['A', 'B', 'C']

/**
 * 学生动手摘要：按课文顺序拼出所选句子，要点按 A → B → C 归并，
 * 直接交给试点的 checkSummary 做三项对照检查，不另写判定。
 */
export function buildStudentSummary(selectedIds: SentenceId[]): SummaryResult {
  const sentences: string[] = []
  const points = new Set<SummaryPoint>()
  for (const paragraph of SUMMARY_PASSAGE) {
    for (let index = 0; index < paragraph.sentences.length; index++) {
      const id = sentenceId(paragraph.id, index)
      if (selectedIds.includes(id)) {
        sentences.push(paragraph.sentences[index])
        points.add(paragraph.point)
      }
    }
  }
  return {
    sentences,
    pointsCovered: POINT_ORDER.filter((point) => points.has(point)),
  }
}

export function sentenceText(id: SentenceId): string {
  return sentenceById(id)?.text ?? ''
}

/* ------------------------------------------------------------------ */
/* 抽取式摘要：选句（有来源）+ 自加句（无来源）的统一模型               */
/* ------------------------------------------------------------------ */

/** 一条摘要条目：选句带来源编号，自加句来源为空。 */
export type SummaryEntry = { sourceId: SentenceId | null; text: string }

export type DraftSummary = {
  entries: SummaryEntry[]
  sentences: string[]
  pointsCovered: SummaryPoint[]
}

/**
 * 草稿摘要：选句按课文顺序排在前，自加句按加入顺序排在后。
 * 要点覆盖只算有来源的选句——自加句就算写了要点词，也不能替要点背书。
 */
export function buildDraftSummary(selectedIds: SentenceId[], customTexts: string[]): DraftSummary {
  const entries: SummaryEntry[] = []
  const points = new Set<SummaryPoint>()
  for (const paragraph of SUMMARY_PASSAGE) {
    for (let index = 0; index < paragraph.sentences.length; index++) {
      const id = sentenceId(paragraph.id, index)
      if (selectedIds.includes(id)) {
        entries.push({ sourceId: id, text: paragraph.sentences[index] })
        points.add(paragraph.point)
      }
    }
  }
  for (const text of customTexts) {
    entries.push({ sourceId: null, text })
  }
  return {
    entries,
    sentences: entries.map((entry) => entry.text),
    pointsCovered: POINT_ORDER.filter((point) => points.has(point)),
  }
}

/** 课堂检查项：试点三项名 + 本课新增两项名。 */
export type L02CheckName = SummaryCheck['name'] | '抽取规范' | '来源核验'

export type L02Check = { name: L02CheckName; passed: boolean; detail: string }

/**
 * 课堂五项检查：试点三项 + 抽取规范 + 结构化来源核验。
 * 试点三项直接复用 checkSummary，不改试点引擎。
 */
export function checkDraftSummary(summary: DraftSummary): L02Check[] {
  const pilot = checkSummary({ sentences: summary.sentences, pointsCovered: summary.pointsCovered })
  const count = summary.sentences.length
  const perPoint = new Map<SummaryPoint, number>()
  for (const entry of summary.entries) {
    if (entry.sourceId === null) continue
    const found = sentenceById(entry.sourceId)
    if (found) perPoint.set(found.point, (perPoint.get(found.point) ?? 0) + 1)
  }
  const repeated = POINT_ORDER.filter((point) => (perPoint.get(point) ?? 0) > 1)
  const extractPassed = count >= 3 && count <= 5 && repeated.length === 0
  const extractDetail =
    count < 3
      ? `只有 ${count} 句，摘要至少 3 句。`
      : count > 5
        ? `${count} 句，摘要至多 5 句；全文照搬不是摘要。`
        : repeated.length > 0
          ? `要点 ${repeated.join('、')} 重复出现，同一要点只留一句。`
          : '句数与要点去重都合规（本课 3 个要点，标准摘要 3 句）。'
  const unsourced = summary.entries.filter((entry) => entry.sourceId === null).length
  const tampered = summary.entries.filter(
    (entry) => entry.sourceId !== null && sentenceById(entry.sourceId)?.text !== entry.text,
  ).length
  const sourcePassed = unsourced === 0 && tampered === 0
  const sourceDetail =
    unsourced > 0 && tampered > 0
      ? `${unsourced} 句无来源、${tampered} 句与所标来源不一致，无法核验。`
      : unsourced > 0
        ? `${unsourced} 句无来源，无法核验——自加句不能算作摘录。`
        : tampered > 0
          ? `${tampered} 句与所标来源原文不一致，原文被改写。`
          : '每句都与所标来源原文逐字一致。'
  return [
    ...pilot,
    { name: '抽取规范', passed: extractPassed, detail: extractDetail },
    { name: '来源核验', passed: sourcePassed, detail: sourceDetail },
  ]
}

/* ------------------------------------------------------------------ */
/* 事实核对：原文事实 / 合理概括 / 无依据推断                           */
/* ------------------------------------------------------------------ */

export type FactKind = '原文事实' | '合理概括' | '无依据推断'

export type FactStatement = {
  id: string
  text: string
  kind: FactKind
  explanation: string
}

/**
 * 口径（课堂上明说，判定按此执行）：
 * - 原文事实：课文里直接写了（原句或同义转述，不加新信息）。
 * - 合理概括：由课文多处信息合并、归纳得出，没有引入课文外的事实。
 * - 无依据推断：课文里没有、也推不出来的说法，包括编造的数字与因果。
 */
export const FACT_STATEMENTS: FactStatement[] = [
  {
    id: 'F1',
    text: '苹果是红色或绿色，香蕉是黄色，橙子是橙色。',
    kind: '原文事实',
    explanation: 'P1 第二句原话，课文里直接写了。',
  },
  {
    id: 'F2',
    text: '训练集共 24 条，测试集共 6 条。',
    kind: '原文事实',
    explanation: 'P3 主题句原话：每类前 8 条进训练集、后 2 条进测试集，共 24 条训练、6 条测试。',
  },
  {
    id: 'G1',
    text: '颜色是区分这三类水果的主要依据，但不是万无一失的。',
    kind: '合理概括',
    explanation: '由 P1（颜色是主特征）与 P2（黄苹果边界情形会被判错）合并归纳，没有引入课文外的事实。',
  },
  {
    id: 'G2',
    text: '测试集的成绩只有在没被用来改规则时才算数。',
    kind: '合理概括',
    explanation: '由 P4（改完的测试集不再是干净的裁判）与 P5（两栏成绩不得混写）归纳得出，没有引入课文外的事实。',
  },
  {
    id: 'U1',
    text: '黄苹果比红苹果更甜，所以更容易被判错。',
    kind: '无依据推断',
    explanation: '课文从没提过甜度，更没说甜度与判错有因果关系；“更甜”和“所以”都是编造的。',
  },
  {
    id: 'U2',
    text: '下一轮复验要用 10 条新样本。',
    kind: '无依据推断',
    explanation: '课文只说“下一轮须换新测试样本复验”，从没给过下一批的数量；10 条是编造的数字。',
  },
]

export function judgeFact(id: string, choice: FactKind): { correct: boolean; expected: FactKind; explanation: string } {
  const statement = FACT_STATEMENTS.find((item) => item.id === id)
  if (!statement) return { correct: false, expected: '原文事实', explanation: '没有这条说法。' }
  return { correct: choice === statement.kind, expected: statement.kind, explanation: statement.explanation }
}

/* ------------------------------------------------------------------ */
/* 正反例：好摘要与三类坏摘要，五项检查结果一律实算，不手填             */
/* ------------------------------------------------------------------ */

export type SummaryExample = {
  id: string
  label: string
  result: DraftSummary
  checks: L02Check[]
}

function example(id: string, label: string, result: DraftSummary): SummaryExample {
  return { id, label, result, checks: checkDraftSummary(result) }
}

export const GOOD_SUMMARY: SummaryExample = example(
  'good',
  '好摘要：三步法输出',
  buildDraftSummary(['P1-1', 'P3-1', 'P4-1'], []),
)

export const BAD_SUMMARIES: SummaryExample[] = [
  example('missing', '反例①：漏了要点 C', buildDraftSummary(['P1-1', 'P3-1'], [])),
  example('added', '反例②：添了一句原文没有的话', buildDraftSummary(['P1-1', 'P3-1', 'P4-1'], ['黄苹果最甜。'])),
  example(
    'digit',
    '反例③：改了原文数字（24 条改成 30 条）',
    {
      entries: [
        { sourceId: 'P1-1', text: '颜色是本数据集的主特征。' },
        {
          sourceId: 'P3-1',
          text: '划分方法定死为分层固定划分：按水果分层，每类前 8 条进训练集、后 2 条进测试集，共 30 条训练、6 条测试。',
        },
        { sourceId: 'P4-1', text: '测试集是没有见过的考题，定规则时不许看测试集。' },
      ],
      sentences: [
        '颜色是本数据集的主特征。',
        '划分方法定死为分层固定划分：按水果分层，每类前 8 条进训练集、后 2 条进测试集，共 30 条训练、6 条测试。',
        '测试集是没有见过的考题，定规则时不许看测试集。',
      ],
      pointsCovered: ['A', 'B', 'C'],
    },
  ),
]

/* ------------------------------------------------------------------ */
/* 三级提示：逐级揭示，不一次全给                                       */
/* ------------------------------------------------------------------ */

export const HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = [
  { level: 1, title: '一级提示：方向', text: '先读每段第一句，那就是这段的主题句。' },
  { level: 2, title: '二级提示：方法', text: '同一要点只留第一次出现的那句，再按 A → B → C 的顺序排。' },
  { level: 3, title: '三级提示：对照', text: '写完逐句回原文查：每句都在原文里吗？A、B、C 全了吗？数字对吗？有来源吗？' },
]

export const SUMMARY_METHOD_STEPS: string[] = [
  '第一步：找主题句——每段第一句就是主题句。',
  '第二步：删重复——同一要点只留第一次出现的那句。',
  '第三步：按要点重组——按 A → B → C 的顺序排成 3 句（本课 3 个要点）。',
]
