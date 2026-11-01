/**
 * A1-U3 local-plane pilot: the U3 local layer, local plane only.
 *
 * Basis: the chief-reviewed U3 detailed-plan draft (U3-L01 → L06, local
 * layer only). Every worked example in this module comes from that draft;
 * the two items the draft leaves for pilot implementation are authored here
 * and marked synthetic: the L02 passage (5 paragraphs, points A/B/C) and
 * the L06 question bank (8 pairs, drawn from U1/U2 conclusions already in
 * the drafts). No other dataset is introduced, and U1/U2 data and scores
 * are never modified.
 *
 * Hard boundaries (same as the U1 pilot):
 * - Local plane only. No gateway code, no supplier, no external model call,
 *   no supplier key anywhere. The generative layer of every lesson is
 *   direction-only in the draft and is NOT implemented here; the lab page
 *   says so on every section.
 * - No student code runs anywhere in this pilot: all outputs are computed
 *   by these pure functions from fixed synthetic data plus the user's
 *   selection, never hand-filled. There is no sandbox involved, so no
 *   shared sandbox file is touched.
 * - Nothing in this module claims a lesson is complete, playable, or
 *   verified. A1-U3 lessons stay todo / outline_not_playable in the
 *   catalog and ledger; this pilot is reachable only by its direct URL.
 */

export const U3_PILOT_LESSON_IDS = [
  'A1-U3-L01',
  'A1-U3-L02',
  'A1-U3-L03',
  'A1-U3-L04',
  'A1-U3-L05',
  'A1-U3-L06',
] as const

export type U3PilotLessonId = (typeof U3_PILOT_LESSON_IDS)[number]

export const U3_PILOT_STAGE_TITLES: Record<string, string> = {
  'A1-U3-L01': 'L01 建立安全的模型调用',
  'A1-U3-L02': 'L02 实现文本摘要',
  'A1-U3-L03': 'L03 结构化 JSON 输出',
  'A1-U3-L04': 'L04 检索可信资料',
  'A1-U3-L05': 'L05 引用与幻觉核对',
  'A1-U3-L06': 'L06 制作学习问答助手',
}

export function u3PilotRoute(lessonId: string): string | null {
  return (U3_PILOT_LESSON_IDS as readonly string[]).includes(lessonId)
    ? `/learn/ai-python-lab-u3/${lessonId}`
    : null
}

export const U3_PILOT_E2E_SPEC = 'tests/e2e/ai-python-a1-u3.spec.ts'

/* ------------------------------------------------------------------ */
/* L01: the five-step call gate (draft §L01, design package §2.3/§4)  */
/* ------------------------------------------------------------------ */

/**
 * Teaching note: the pilot displays the failed gate step so students can
 * learn the five steps. The production gateway (pending approval) must
 * return ONLY the generic refusal, never which step failed, so the refusal
 * text below is deliberately generic.
 */
export const GATE_GENERIC_REFUSAL = '这次调用不能通过，已为你准备了本地替代任务。'

export type GateSubCheck = 'pii' | 'sensitive' | 'age' | 'scope' | 'length' | 'injection'

export type GateRequest = {
  authenticated: boolean
  consentScope: 'generative' | 'cloud-drafts' | 'none'
  containsPii: boolean
  containsSensitive: boolean
  ageAppropriate: boolean
  inScope: boolean
  withinLength: boolean
  injectionSafe: boolean
  modelInAllowlist: boolean
  withinQuota: boolean
}

export type GateVerdict = {
  allowed: boolean
  failedStep: 1 | 2 | 3 | 4 | 5 | null
  failedSubCheck: GateSubCheck | null
  refusal: string | null
  localTask: string
}

function refuse(step: 1 | 2 | 3 | 4 | 5, sub: GateSubCheck | null, localTask: string): GateVerdict {
  return { allowed: false, failedStep: step, failedSubCheck: sub, refusal: GATE_GENERIC_REFUSAL, localTask }
}

/** Fail-closed: the first failed step decides; a later step is never reached. */
export function evaluateGateCall(request: GateRequest): GateVerdict {
  if (!request.authenticated) {
    return refuse(1, null, '本地规则版练习：用纸面门禁五步复核一次本次调用。')
  }
  if (request.consentScope !== 'generative') {
    return refuse(2, null, '本地替代任务：cloud-drafts 同意不能代替生成式同意，改做本地规则版练习。')
  }
  const subChecks: { check: GateSubCheck; ok: boolean; task: string }[] = [
    { check: 'pii', ok: !request.containsPii, task: '本地替代任务：删除个人信息后重试，并做本地规则版练习。' },
    { check: 'sensitive', ok: !request.containsSensitive, task: '本地替代任务：去掉敏感信息后重试，并做本地规则版练习。' },
    { check: 'age', ok: request.ageAppropriate, task: '本地替代任务：改做课节内适龄的本地练习。' },
    { check: 'scope', ok: request.inScope, task: '本地替代任务：回到课节内限定任务，用本地规则版完成。' },
    { check: 'length', ok: request.withinLength, task: '本地替代任务：把输入缩短后重试，并做本地规则版练习。' },
    { check: 'injection', ok: request.injectionSafe, task: '本地替代任务：去掉伪造身份的说法后重试，并做本地规则版练习。' },
  ]
  for (const sub of subChecks) {
    if (!sub.ok) return refuse(3, sub.check, sub.task)
  }
  if (!request.modelInAllowlist) {
    return refuse(4, null, '本地替代任务：改用白名单内的本地练习，不调用白名单外模型。')
  }
  if (!request.withinQuota) {
    return refuse(5, null, '本地替代任务：先做本地规则版练习，等配额恢复后再说。')
  }
  return {
    allowed: true,
    failedStep: null,
    failedSubCheck: null,
    refusal: null,
    localTask: '门禁全部通过（教学演示；真实调用仍须等批与网关实测）。',
  }
}

const PASSING_REQUEST: GateRequest = {
  authenticated: true,
  consentScope: 'generative',
  containsPii: false,
  containsSensitive: false,
  ageAppropriate: true,
  inScope: true,
  withinLength: true,
  injectionSafe: true,
  modelInAllowlist: true,
  withinQuota: true,
}

export type GateCase = { id: string; label: string; request: GateRequest }

/** The draft's five refusal worked examples, plus one passing case. */
export const GATE_CASES: GateCase[] = [
  { id: 'pass', label: '通过例：五步全过', request: PASSING_REQUEST },
  {
    id: 'refuse-1',
    label: '拒绝例①：未登录学生想调模型',
    request: { ...PASSING_REQUEST, authenticated: false },
  },
  {
    id: 'refuse-2',
    label: '拒绝例②：只有 cloud-drafts 同意、无生成式同意',
    request: { ...PASSING_REQUEST, consentScope: 'cloud-drafts' },
  },
  {
    id: 'refuse-3',
    label: '拒绝例③：请求里含姓名与学校全名',
    request: { ...PASSING_REQUEST, containsPii: true },
  },
  {
    id: 'refuse-4',
    label: '拒绝例④：“随便聊点什么”通用聊天请求',
    request: { ...PASSING_REQUEST, inScope: false },
  },
  {
    id: 'refuse-5',
    label: '拒绝例⑤：超长输入',
    request: { ...PASSING_REQUEST, withinLength: false },
  },
]

/* ------------------------------------------------------------------ */
/* L02: extractive summary, three-step method + three对照 checks      */
/* ------------------------------------------------------------------ */

/**
 * Synthetic passage authored for this pilot (the draft leaves the passage
 * text for pilot implementation). Marked synthetic everywhere it appears.
 * Five paragraphs; the topic sentence is each paragraph's first sentence.
 * Points: A = 颜色是主特征, B = 分层固定划分, C = 测试集是裁判.
 */
export type SummaryPoint = 'A' | 'B' | 'C'

export type SummaryParagraph = { id: string; point: SummaryPoint; sentences: string[] }

export const SUMMARY_PASSAGE: SummaryParagraph[] = [
  {
    id: 'P1',
    point: 'A',
    sentences: [
      '颜色是本数据集的主特征。',
      '苹果是红色或绿色，香蕉是黄色，橙子是橙色，三类颜色基本分开。',
    ],
  },
  {
    id: 'P2',
    point: 'A',
    sentences: [
      '黄苹果是一个边界情形，它颜色是黄，按颜色规则会被判成香蕉。',
      '这正是颜色特征会撞车的地方，也是后面要复盘的错误去向。',
    ],
  },
  {
    id: 'P3',
    point: 'B',
    sentences: [
      '划分方法定死为分层固定划分：按水果分层，每类前 8 条进训练集、后 2 条进测试集，共 24 条训练、6 条测试。',
      '固定划分保证全班复现一致，不用随机划分。',
    ],
  },
  {
    id: 'P4',
    point: 'C',
    sentences: [
      '测试集是没有见过的考题，定规则时不许看测试集。',
      '在测试集上发现错误后改规则，改完的那份测试集就不再是干净的裁判。',
    ],
  },
  {
    id: 'P5',
    point: 'C',
    sentences: [
      '下一轮须换新测试样本复验，不能拿改后测试集的成绩当最终成绩。',
      '两栏成绩要分开写：练习记录与最终复验不得混写。',
    ],
  },
]

export const SUMMARY_POINTS: Record<SummaryPoint, string> = {
  A: '颜色是主特征',
  B: '分层固定划分',
  C: '测试集是裁判',
}

export type SummaryResult = { sentences: string[]; pointsCovered: SummaryPoint[] }

/**
 * The three-step method, computed: ① take each paragraph's topic sentence,
 * ② drop a point already covered, ③ keep point order A → B → C.
 * The result is 3 sentences, inside the draft's 3–5 sentence band.
 */
export function summarizePassage(paragraphs: SummaryParagraph[] = SUMMARY_PASSAGE): SummaryResult {
  const seen = new Set<SummaryPoint>()
  const sentences: string[] = []
  for (const paragraph of paragraphs) {
    if (seen.has(paragraph.point)) continue
    seen.add(paragraph.point)
    sentences.push(paragraph.sentences[0])
  }
  return { sentences, pointsCovered: [...seen] }
}

export type SummaryCheck = { name: '漏要点' | '添内容' | '改原意'; passed: boolean; detail: string }

function digitsOf(text: string): string[] {
  return text.match(/\d+/g) ?? []
}

/**
 * The draft's three对照 checks, computed from the passage (never asserted
 * by hand): every point covered; every summary sentence verbatim from the
 * passage (no added content); every number in the summary occurs in the
 * passage (no invented or altered numbers).
 */
export function checkSummary(
  result: SummaryResult,
  paragraphs: SummaryParagraph[] = SUMMARY_PASSAGE,
): SummaryCheck[] {
  const passageSentences = paragraphs.flatMap((paragraph) => paragraph.sentences)
  const passageText = passageSentences.join('')
  const points: SummaryPoint[] = ['A', 'B', 'C']
  const coverage = points.every((point) => result.pointsCovered.includes(point))
  const noAdded = result.sentences.every((sentence) => passageSentences.includes(sentence))
  const meaningOk = result.sentences
    .flatMap((sentence) => digitsOf(sentence))
    .every((digit) => passageText.includes(digit))
  return [
    {
      name: '漏要点',
      passed: coverage,
      detail: coverage ? '要点 A、B、C 全在。' : `缺要点：${points.filter((p) => !result.pointsCovered.includes(p)).join('、')}。`,
    },
    {
      name: '添内容',
      passed: noAdded,
      detail: noAdded ? '摘要每句都出自原文，无原文外内容。' : '摘要里有原文没有的句子。',
    },
    {
      name: '改原意',
      passed: meaningOk,
      detail: meaningOk ? '摘要里的数字都在原文出现，无改写数字。' : '摘要里有原文没有的数字，原意被改写。',
    },
  ]
}

/* ------------------------------------------------------------------ */
/* L03: fruit-record JSON schema + validator (draft's most complete   */
/* local layer: 4 fields, 5 checks, 4 examples + the ② variant)      */
/* ------------------------------------------------------------------ */

export type FruitRecord = {
  名称?: unknown
  颜色?: unknown
  重量?: unknown
  直径?: unknown
}

export const FRUIT_SCHEMA_FIELDS = [
  { field: '名称', type: '字符串', required: true, values: '苹果 / 香蕉 / 橙子' },
  { field: '颜色', type: '字符串', required: true, values: '红 / 黄 / 绿 / 橙' },
  { field: '重量', type: '数字', required: true, values: '大于 0' },
  { field: '直径', type: '数字', required: false, values: '大于 0' },
] as const

export type ValidationCheckName = '字段齐全' | '类型正确' | '枚举内' | '数值范围' | '必填非空'

export type ValidationResult = { passed: boolean; failedChecks: ValidationCheckName[] }

/**
 * The draft's 5 checks. One root cause yields one failed check: the range
 * check only runs on numbers, the enum check only on non-empty strings,
 * so a type error is not double-counted as a range or enum error, and an
 * empty required string is caught by 必填非空 alone; a missing required
 * field fails 齐全 only (非空 applies to present fields).
 */
export function validateFruitRecord(record: FruitRecord): ValidationResult {
  const failed: ValidationCheckName[] = []
  const required = ['名称', '颜色', '重量'] as const
  const present = (key: keyof FruitRecord): boolean =>
    key in record && record[key] !== undefined
  if (!required.every((key) => present(key))) failed.push('字段齐全')
  if (
    required.some(
      (key) => present(key) && (record[key] === null || record[key] === ''),
    )
  ) {
    failed.push('必填非空')
  }
  const typeOk =
    (!present('名称') || typeof record.名称 === 'string') &&
    (!present('颜色') || typeof record.颜色 === 'string') &&
    (!present('重量') || typeof record.重量 === 'number') &&
    (!present('直径') || typeof record.直径 === 'number')
  if (!typeOk) failed.push('类型正确')
  const enumOk =
    (typeof record.名称 !== 'string' ||
      record.名称 === '' ||
      ['苹果', '香蕉', '橙子'].includes(record.名称)) &&
    (typeof record.颜色 !== 'string' ||
      record.颜色 === '' ||
      ['红', '黄', '绿', '橙'].includes(record.颜色))
  if (!enumOk) failed.push('枚举内')
  const rangeOk =
    (typeof record.重量 !== 'number' || record.重量 > 0) &&
    (typeof record.直径 !== 'number' || record.直径 > 0)
  if (!rangeOk) failed.push('数值范围')
  return { passed: failed.length === 0, failedChecks: failed }
}

export type JsonCase = { id: string; label: string; record: FruitRecord; expected: boolean }

/** The draft's 4 examples; ② carries the missing-required variant, so 5 judgments in total. */
export const JSON_CASES: JsonCase[] = [
  {
    id: 'ex1',
    label: '① 全对（苹果 / 红 / 182 / 7.6）',
    record: { 名称: '苹果', 颜色: '红', 重量: 182, 直径: 7.6 },
    expected: true,
  },
  {
    id: 'ex2',
    label: '② 缺字段（苹果 / 红 / 182，缺直径——直径可选，仍通过）',
    record: { 名称: '苹果', 颜色: '红', 重量: 182 },
    expected: true,
  },
  {
    id: 'ex2b',
    label: '②变体：缺颜色（必填）',
    record: { 名称: '苹果', 重量: 182, 直径: 7.6 },
    expected: false,
  },
  {
    id: 'ex3',
    label: '③ 类型错（重量写成字符串 "182"）',
    record: { 名称: '苹果', 颜色: '红', 重量: '182', 直径: 7.6 },
    expected: false,
  },
  {
    id: 'ex4',
    label: '④ 枚举外（名称写成“梨”）',
    record: { 名称: '梨', 颜色: '红', 重量: 182, 直径: 7.6 },
    expected: false,
  },
]

/* ------------------------------------------------------------------ */
/* L04: local corpus retrieval + the four credibility questions       */
/* ------------------------------------------------------------------ */

export type CorpusCard = {
  id: string
  标题: string
  来源: string
  时间: '新' | '旧'
  有证据: boolean
  相关: boolean
  摘要句: string
}

/** Synthetic local corpus (draft-given, marked synthetic). */
export const CORPUS_CARDS: CorpusCard[] = [
  {
    id: 'A',
    标题: '水果分类规则卡',
    来源: '课节指定教材',
    时间: '新',
    有证据: true,
    相关: true,
    摘要句: '颜色规则把黄色判成香蕉，金帅苹果因此被判错。',
  },
  {
    id: 'B',
    标题: '颜色特征说明',
    来源: '公开百科',
    时间: '新',
    有证据: true,
    相关: true,
    摘要句: '颜色是主特征，红色与绿色归苹果，黄色归香蕉，橙子归橙子。',
  },
  {
    id: 'C',
    标题: '旧版分类手册',
    来源: '旧版手册',
    时间: '旧',
    有证据: true,
    相关: true,
    摘要句: '旧版手册说重量能分清苹果和橙子，但新数据已更新，区间已经重叠。',
  },
  {
    id: 'D',
    标题: '无来源小抄',
    来源: '不明',
    时间: '新',
    有证据: false,
    相关: true,
    摘要句: '小抄写着答案但没有来源，也没有证据。',
  },
  {
    id: 'E',
    标题: '商家推销文',
    来源: '商家',
    时间: '新',
    有证据: false,
    相关: true,
    摘要句: '买我们的神奇果汁，包治百病，快来抢购！',
  },
  {
    id: 'F',
    标题: '恐龙灭绝之谜',
    来源: '可信来源',
    时间: '新',
    有证据: true,
    相关: false,
    摘要句: '恐龙灭绝的原因至今仍有争论，与水果分类无关。',
  },
]

/**
 * Published materials (教材 / 百科 / 手册) count as trusted sources;
 * 商家 and 不明 do not. This follows the draft's verdicts: C is rejected
 * for being outdated (not for its source), D for no source, E for its
 * merchant source, F for irrelevance.
 */
const TRUSTED_SOURCES = ['课节指定教材', '公开百科', '旧版手册', '可信来源']

export type CredibilityScore = {
  card: CorpusCard
  命中数: number
  来源可信: boolean
  时间新: boolean
  有证据: boolean
  相关: boolean
  可用: boolean
  否决理由: string | null
}

export function scoreCards(keywords: string[], cards: CorpusCard[] = CORPUS_CARDS): CredibilityScore[] {
  return cards.map((card) => {
    const text = `${card.标题}${card.摘要句}`
    const hits = keywords.filter((keyword) => text.includes(keyword)).length
    const sourceOk = TRUSTED_SOURCES.includes(card.来源)
    const timeOk = card.时间 === '新'
    const evidenceOk = card.有证据
    const relevantOk = card.相关
    const usable = sourceOk && timeOk && evidenceOk && relevantOk
    const reason = !sourceOk
      ? '来源不可信'
      : !timeOk
        ? '资料过期'
        : !evidenceOk
          ? '无证据'
          : !relevantOk
            ? '与任务无关'
            : null
    return {
      card,
      命中数: hits,
      来源可信: sourceOk,
      时间新: timeOk,
      有证据: evidenceOk,
      相关: relevantOk,
      可用: usable,
      否决理由: reason,
    }
  })
}

/** Teacher-picked keywords from the task sentence (draft: 2–3 keywords). */
export const RETRIEVAL_KEYWORDS = ['苹果', '颜色', '规则']

export function usableCards(scores: CredibilityScore[]): CredibilityScore[] {
  return scores.filter((score) => score.可用)
}

/* ------------------------------------------------------------------ */
/* L05: verbatim citation checking + the three hallucination types    */
/* ------------------------------------------------------------------ */

export type SourceSentence = { id: string; text: string }

/** Source sentences the answers are checked against (U1 draft facts). */
export const CITATION_SOURCES: SourceSentence[] = [
  { id: 'S1', text: '金帅苹果重 168 克。' },
  { id: 'S2', text: '颜色规则把黄色判成香蕉。' },
  { id: 'S3', text: '规则 v2 加了重量分支：黄色且重量达到 150 克就判成苹果。' },
]

export type ClaimToCheck = { text: string; sourceId: string }

export type AnswerToCheck = {
  id: string
  label: string
  text: string
  claims: ClaimToCheck[]
  citedSources: string[]
}

/** The draft's 3 answers to check (synthetic, given text, not student-generated). */
export const ANSWERS_TO_CHECK: AnswerToCheck[] = [
  {
    id: 'ans1',
    label: '① 引用逐字正确',
    text: '金帅苹果重 168 克，颜色规则把它判成香蕉。',
    claims: [
      { text: '金帅苹果重 168 克', sourceId: 'S1' },
      { text: '颜色规则把它判成香蕉', sourceId: 'S2' },
    ],
    citedSources: ['S1', 'S2'],
  },
  {
    id: 'ans2',
    label: '② 数字被改（168 克写成 186 克）',
    text: '金帅苹果重 186 克，颜色规则把它判成香蕉。',
    claims: [
      { text: '金帅苹果重 186 克', sourceId: 'S1' },
      { text: '颜色规则把它判成香蕉', sourceId: 'S2' },
    ],
    citedSources: ['S1', 'S2'],
  },
  {
    id: 'ans3',
    label: '③ 来源不存在（引用了语料库外的一张“资料”）',
    text: '根据《水果日报》的报道，金帅苹果重 168 克。',
    claims: [{ text: '金帅苹果重 168 克', sourceId: 'S1' }],
    citedSources: ['水果日报'],
  },
]

export type CitationVerdict = {
  passed: boolean
  kind: '通过' | '编造数字' | '编造来源'
  differences: string[]
  fix: string
}

/**
 * The verbatim three-step check, computed: ① every cited source must exist
 * in the local corpus, ② every claim's digits must match its source
 * sentence's digits. A claim whose digits differ is an invented number;
 * a cited source outside the corpus is an invented source.
 */
export function checkCitationAnswer(answer: AnswerToCheck): CitationVerdict {
  const sourceById = new Map(CITATION_SOURCES.map((source) => [source.id, source.text]))
  const differences: string[] = []
  for (const cited of answer.citedSources) {
    if (!sourceById.has(cited)) {
      differences.push(`引用来源“${cited}”不在本地语料库中。`)
    }
  }
  for (const claim of answer.claims) {
    const sourceText = sourceById.get(claim.sourceId)
    if (sourceText === undefined) continue
    const claimDigits = digitsOf(claim.text).join(',')
    const sourceDigits = digitsOf(sourceText).join(',')
    if (claimDigits !== sourceDigits) {
      differences.push(`原句是“${sourceText}”，回答写成“${claim.text}”，数字不一致。`)
    }
  }
  if (differences.some((difference) => difference.includes('不在本地语料库中'))) {
    return {
      passed: false,
      kind: '编造来源',
      differences,
      fix: '删除该引用，无来源主张标“未核实”。',
    }
  }
  if (differences.length > 0) {
    return {
      passed: false,
      kind: '编造数字',
      differences,
      fix: '改回 168 克并标出原句出处（金帅苹果重 168 克）。',
    }
  }
  return { passed: true, kind: '通过', differences: [], fix: '无需修改。' }
}

/* ------------------------------------------------------------------ */
/* L06: local Q&A assistant — classification, matching, refusal, log  */
/* ------------------------------------------------------------------ */

export type QaCategory = '事实类' | '方法类' | '超范围类'

export type QaPair = {
  id: string
  question: string
  category: QaCategory
  keywords: string[]
  answer: string | null
  refusal: string | null
}

/**
 * Synthetic local knowledge base authored for this pilot (the draft leaves
 * the 8 pairs' full text for pilot implementation). Every answer is drawn
 * from U1 conclusions already in the U1 draft — no new knowledge is
 * introduced. Counts: 事实类 4, 方法类 2, 超范围类 2.
 */
export const QA_PAIRS: QaPair[] = [
  {
    id: 'Q1',
    question: '金帅苹果为什么被颜色规则判成香蕉？',
    category: '事实类',
    keywords: ['金帅苹果', '颜色', '香蕉'],
    answer: '因为它是黄色的，按颜色规则黄色判成香蕉；这是颜色特征在黄苹果上撞车的例子。',
    refusal: null,
  },
  {
    id: 'Q2',
    question: '规则 v2 为什么能把金帅苹果判对？',
    category: '事实类',
    keywords: ['规则 v2', '金帅苹果', '重量'],
    answer: '规则 v2 加了重量分支：黄色且重量达到 150 克就判成苹果，金帅苹果 168 克，所以判对了。',
    refusal: null,
  },
  {
    id: 'Q3',
    question: '为什么原测试集在改过规则后不能再当最终裁判？',
    category: '事实类',
    keywords: ['测试集', '规则', '裁判'],
    answer: '因为规则是在看过测试集错误后改的，原测试集已经不再干净；最终复验须换一批新测试样本。',
    refusal: null,
  },
  {
    id: 'Q4',
    question: '为什么颜色是本数据集的主特征？',
    category: '事实类',
    keywords: ['颜色', '主特征', '数据集'],
    answer: '因为颜色在三类之间基本分开：苹果红或绿、香蕉黄、橙子橙，只有黄苹果这类边界情形会撞车。',
    refusal: null,
  },
  {
    id: 'Q5',
    question: '怎么做一次分层划分？',
    category: '方法类',
    keywords: ['分层', '划分'],
    answer: '按水果分层，每类前 8 条进训练集、后 2 条进测试集，共 24 条训练、6 条测试；固定划分保证全班复现一致。',
    refusal: null,
  },
  {
    id: 'Q6',
    question: '怎么用混淆矩阵找错误集中在哪一格？',
    category: '方法类',
    keywords: ['混淆矩阵', '错误', '格'],
    answer: '行是真实标签、列是预测标签，对角线是判对；看非对角线格子，苹果行香蕉列的 1 就是唯一的错误去向。',
    refusal: null,
  },
  {
    id: 'Q7',
    question: '随便聊点什么吧。',
    category: '超范围类',
    keywords: ['聊'],
    answer: null,
    refusal: '这个问题超出课节限定任务，我不能回答；请回到课节内的任务来。',
  },
  {
    id: 'Q8',
    question: '恐龙为什么灭绝？',
    category: '超范围类',
    keywords: ['恐龙'],
    answer: null,
    refusal: '这个问题超出课节限定任务，我不能回答；请回到课节内的任务来。',
  },
]

export type QaAnswer = {
  pair: QaPair | null
  answered: boolean
  category: QaCategory | null
  text: string
}

/**
 * Matching rule (draft): extract keyword hits per bank entry; the best
 * hit wins. Out-of-scope wins never answer — scope is the gate, hits are
 * only the clue. No hit at all refuses and points back to the lesson list.
 */
export function answerQuestion(questionText: string): QaAnswer {
  let best: QaPair | null = null
  let bestHits = 0
  for (const pair of QA_PAIRS) {
    const hits = pair.keywords.filter((keyword) => questionText.includes(keyword)).length
    if (hits > bestHits) {
      best = pair
      bestHits = hits
    }
  }
  if (best === null || bestHits === 0) {
    return {
      pair: null,
      answered: false,
      category: null,
      text: '这个问题在本地知识库里没有匹配条目，我不能回答；请看课节目录，回到课节内的任务来。',
    }
  }
  if (best.category === '超范围类' || best.answer === null) {
    return {
      pair: best,
      answered: false,
      category: '超范围类',
      text: best.refusal ?? '这个问题超出课节限定任务，我不能回答。',
    }
  }
  return { pair: best, answered: true, category: best.category, text: best.answer }
}

/**
 * The log records ONLY category counts and answered/refused counts — never
 * question text, never answer text, never student identity. That absence
 * of raw text is itself a checked property of this pilot.
 */
export type QaLog = {
  byCategory: Record<QaCategory, number>
  answered: number
  refused: number
}

export function runQaDrill(): { log: QaLog; results: QaAnswer[] } {
  const results = QA_PAIRS.map((pair) => answerQuestion(pair.question))
  const log: QaLog = {
    byCategory: { 事实类: 0, 方法类: 0, 超范围类: 0 },
    answered: 0,
    refused: 0,
  }
  for (const pair of QA_PAIRS) log.byCategory[pair.category] += 1
  for (const result of results) {
    if (result.answered) log.answered += 1
    else log.refused += 1
  }
  return { log, results }
}
