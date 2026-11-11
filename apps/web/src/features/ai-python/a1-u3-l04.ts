/**
 * A1-U3-L04 检索可信资料：把 U3 本地试点里的语料检索演示变成一节完整课堂。
 *
 * 复用（不重新实现）：试点已发表的语料卡 CORPUS_CARDS、评分器 scoreCards、
 * 教师关键词 RETRIEVAL_KEYWORDS 与可用筛选 usableCards（见
 * u3-local-engines.ts）。本课不改试点引擎，不调用外部模型，不接网关：
 * 学生改的是合成语料上的关键词与四问判断，不是真实数据。
 *
 * 本课新增的只是课堂交互层：关键词输入、逐卡四问作答、可用清单勾选、
 * 规则说明、五项检查、字段级错误（错在哪张卡、为什么错、如何修改）、
 * 正反例、分层提示、作品总结。判定器只给“哪几项检查没过”，不点名
 * 是哪张卡；把检查名翻译成卡级错误是本课的课堂层做的，规则与试点
 * 评分器一致，不另立规则。
 *
 * 诚实边界（课堂上明说）：
 * - 命中数只是线索，可信度是门禁：关键词命中一张卡，不代表这张卡能用。
 * - 校验只管四问是否答对，不管资料在真实世界里对不对：卡 C 的来源是
 *   可信的，只输在时间旧；卡 F 的来源也是可信的，只输在无关。
 * - 规则说明只做字面检查（四个词是否出现），不做语义理解。
 * - 五项全过只表示本次检索合格，不等于完全掌握检索与可信度判断。
 */

import {
  CORPUS_CARDS,
  RETRIEVAL_KEYWORDS,
  scoreCards,
  usableCards,
  type CorpusCard,
  type CredibilityScore,
} from './u3-local-engines'

export const L04_LESSON_ID = 'A1-U3-L04'
export const L04_LESSON_TITLE = '检索可信资料'
export const L04_ROUTE = '/learn/ai-python-lab-u3-l04/A1-U3-L04'

export { CORPUS_CARDS, RETRIEVAL_KEYWORDS, scoreCards, usableCards }
export type { CorpusCard, CredibilityScore }

/** 任务句（详案定稿：第一句逐字取自试点卡 A 的摘要句，第二句为任务指令）。 */
export const TASK_SENTENCE =
  '颜色规则把黄色判成香蕉，金帅苹果因此被判错。请检索可信资料，找出颜色规则出问题的原因。'

export type CardId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
export const CARD_IDS: CardId[] = ['A', 'B', 'C', 'D', 'E', 'F']

/** 四可信度问题（顺序即否决优先级，与试点 scoreCards 的 reason 选择顺序一致）。 */
export const CREDIBILITY_QUESTIONS = [
  { key: 'source', name: '来源可信', short: '来源' },
  { key: 'time', name: '时间新', short: '时间' },
  { key: 'evidence', name: '有证据', short: '证据' },
  { key: 'relevant', name: '相关', short: '相关' },
] as const

export type CredibilityQuestionKey = (typeof CREDIBILITY_QUESTIONS)[number]['key']

/** 一张卡的四问答案：null = 未作答。 */
export type FourAnswers = {
  source: boolean | null
  time: boolean | null
  evidence: boolean | null
  relevant: boolean | null
}

/** validateRetrieval 的输入形状：草稿的结构化作业部分（草稿另有 version/hintLevel）。 */
export type RetrievalInput = {
  keywords: string[]
  answers: Partial<Record<CardId, FourAnswers>>
  usable: string[]
  ruleText: string
}

/** 草稿字段表（对照 L03 的 FRUIT_SCHEMA_FIELDS 模式）。 */
export const L04_FIELDS = [
  {
    field: 'keywords',
    type: '字符串数组',
    required: true,
    values: '2–3 个；每个 1–10 字；每个须出现在任务句中；去重后计数',
  },
  {
    field: 'answers',
    type: '是/否（可空）',
    required: true,
    values: '每张卡四问，共 24 答；null = 未作答',
  },
  {
    field: 'usable',
    type: '字符串数组',
    required: true,
    values: '恰好 [A, B]（顺序不限）',
  },
  {
    field: 'ruleText',
    type: '字符串',
    required: true,
    values: '非空；须提到来源、时间、证据、相关',
  },
  { field: 'hintLevel', type: '数字', required: false, values: '0–3，缺省 0' },
] as const

export const L04_CHECK_NAMES = [
  '关键词有效',
  '四问答完',
  '四问答对',
  '可用清单正确',
  '规则说明完整',
] as const

export type L04CheckName = (typeof L04_CHECK_NAMES)[number]

/** 一条字段级错误：错在哪张卡、为什么错、如何修改。 */
export type L04FieldError = { field: string; why: string; fix: string }

/** 校验一次结构化检索作业的完整结果。 */
export type L04Validation = {
  passed: boolean
  failedChecks: L04CheckName[]
  /** scoreCards(keywords) 的逐卡结果（含命中数与否决理由），关键词无效时也照常计算。 */
  cardResults: CredibilityScore[]
  fieldErrors: L04FieldError[]
  /** 要求勾选的可用卡。 */
  usableExpected: string[]
  /** 学生勾选的可用卡（去重后）。 */
  usableGot: string[]
}

export const USABLE_EXPECTED: string[] = ['A', 'B']
export const RULE_WORDS = ['来源', '时间', '证据', '相关'] as const

function normalizeKeywords(keywords: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const keyword of keywords) {
    const trimmed = keyword.trim()
    if (trimmed === '' || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

function expectedAnswers(score: CredibilityScore): FourAnswers {
  return {
    source: score.来源可信,
    time: score.时间新,
    evidence: score.有证据,
    relevant: score.相关,
  }
}

/**
 * 校验一次结构化检索作业。五项检查（一个根因只算一项失败）：
 * 1. 关键词有效：2–3 个；每个 1–10 字；每个出现在任务句中；检索后至少命中 1 张卡。
 * 2. 四问答完：24 答全部已作答。未作答只算这一项失败，不计入检查 3。
 * 3. 四问答对：已作答的答案与 scoreCards 的 ground truth 逐项一致。
 * 4. 可用清单正确：勾选的可用卡恰好是 A、B（顺序不限）。
 * 5. 规则说明完整：ruleText 非空且提到“来源、时间、证据、相关”四词（字面检查）。
 * 关键词无效时 cardResults 仍按所给关键词计算并展示（不伪造命中数），
 * 但任务判定为未合格。
 */
export function validateRetrieval(input: RetrievalInput): L04Validation {
  const keywords = normalizeKeywords(input.keywords)
  const cardResults = scoreCards(keywords)
  const failedChecks: L04CheckName[] = []
  const fieldErrors: L04FieldError[] = []

  // 检查 1：关键词有效。
  if (keywords.length < 2 || keywords.length > 3) {
    failedChecks.push('关键词有效')
    fieldErrors.push({
      field: '关键词',
      why: `关键词须为 2–3 个，当前 ${keywords.length} 个。`,
      fix: '从任务句里挑 2–3 个关键词，例如「苹果」「颜色」「规则」。',
    })
  } else {
    const badKeyword = keywords.find(
      (keyword) => keyword.length > 10 || !TASK_SENTENCE.includes(keyword),
    )
    if (badKeyword) {
      failedChecks.push('关键词有效')
      if (badKeyword.length > 10) {
        fieldErrors.push({
          field: '关键词',
          why: `「${badKeyword}」共 ${badKeyword.length} 字，超过 10 字。`,
          fix: '把超长的关键词换成任务句里的短词，例如「苹果」「颜色」「规则」。',
        })
      } else {
        fieldErrors.push({
          field: '关键词',
          why: `「${badKeyword}」不在任务句中，关键词要从任务句里挑。`,
          fix: `把「${badKeyword}」换成任务句里的词，例如「苹果」「颜色」「规则」。`,
        })
      }
    } else if (!cardResults.some((score) => score.命中数 >= 1)) {
      failedChecks.push('关键词有效')
      fieldErrors.push({
        field: '关键词',
        why: `关键词「${keywords.join('」「')}」没有命中任何资料卡。`,
        fix: '换一组任务句里的关键词再检索，例如「苹果」「颜色」「规则」。',
      })
    }
  }

  // 检查 2：四问答完。检查 3：四问答对（只判已作答的答案）。
  const unanswered: L04FieldError[] = []
  const wrong: L04FieldError[] = []
  for (const score of cardResults) {
    const cardId = score.card.id as CardId
    const expected = expectedAnswers(score)
    const given: Partial<FourAnswers> = input.answers[cardId] ?? {}
    for (const question of CREDIBILITY_QUESTIONS) {
      const key = question.key
      const value = given[key] ?? null
      const field = `卡 ${cardId}·${question.short}`
      if (value === null) {
        unanswered.push({
          field,
          why: `卡 ${cardId} 的“${question.name}”还没回答。`,
          fix:
            key === 'source'
              ? `看卡 ${cardId} 的来源是不是可信来源（课节指定教材、公开百科、旧版手册、可信来源），再回答。`
              : key === 'time'
                ? `看卡 ${cardId} 的时间是“新”还是“旧”，再回答。`
                : key === 'evidence'
                  ? `读卡 ${cardId} 的摘要句，看有没有证据，再回答。`
                  : `看卡 ${cardId} 的摘要句和水果分类任务有没有关系，再回答。`,
        })
      } else if (value !== expected[key]) {
        const want = expected[key] ? '是' : '否'
        const got = value ? '是' : '否'
        const fix =
          key === 'source'
            ? `卡 ${cardId} 的来源是“${score.card.来源}”${
                expected[key]
                  ? '，属于可信来源'
                  : '，不在可信来源（课节指定教材、公开百科、旧版手册、可信来源）里'
              }，应答“${want}”。`
            : key === 'time'
              ? `卡 ${cardId} 的时间是“${score.card.时间}”，应答“${want}”。`
              : key === 'evidence'
                ? `卡 ${cardId} 的摘要句里${expected[key] ? '有证据' : '没有证据'}，应答“${want}”。`
                : `卡 ${cardId} 的摘要句和水果分类任务${expected[key] ? '有关' : '无关'}，应答“${want}”。`
        wrong.push({
          field,
          why: `卡 ${cardId}《${score.card.标题}》的“${question.name}”是“${want}”，你答的是“${got}”。`,
          fix,
        })
      }
    }
  }
  if (unanswered.length > 0) {
    failedChecks.push('四问答完')
    fieldErrors.push(...unanswered)
  }
  if (wrong.length > 0) {
    failedChecks.push('四问答对')
    fieldErrors.push(...wrong)
  }

  // 检查 4：可用清单正确。
  const usableGot = [...new Set(input.usable)]
  const missing = USABLE_EXPECTED.filter((id) => !usableGot.includes(id))
  const extra = usableGot.filter((id) => !USABLE_EXPECTED.includes(id))
  if (missing.length > 0 || extra.length > 0) {
    failedChecks.push('可用清单正确')
    if (usableGot.length === 0) {
      fieldErrors.push({
        field: '可用清单',
        why: '清单是空的，一张卡也没选。',
        fix: '把 A、B 加进可用清单。',
      })
    } else {
      for (const id of missing) {
        fieldErrors.push({
          field: '可用清单',
          why: `清单里少了卡 ${id}，卡 ${id} 四问全过，是可用资料。`,
          fix: `把卡 ${id} 加进可用清单。`,
        })
      }
      for (const id of extra) {
        const score = cardResults.find((s) => s.card.id === id)
        const reason = score?.否决理由
        fieldErrors.push({
          field: '可用清单',
          why: `清单里多了卡 ${id}${reason ? `，卡 ${id} 的否决理由是“${reason}”` : ''}，不能用。`,
          fix: `把卡 ${id} 从可用清单里去掉，只留 A、B。`,
        })
      }
    }
  }

  // 检查 5：规则说明完整（字面检查：四个词是否出现）。
  const ruleText = input.ruleText
  const missingWords = RULE_WORDS.filter((word) => !ruleText.includes(word))
  if (ruleText.trim() === '') {
    failedChecks.push('规则说明完整')
    fieldErrors.push({
      field: '规则说明',
      why: '规则说明是空的，还没写。',
      fix: '用一句话说清你的提示词规则，要提到来源、时间、证据、相关。',
    })
  } else if (missingWords.length > 0) {
    failedChecks.push('规则说明完整')
    const wordHint: Record<string, string> = {
      来源: '资料要来自可信来源才可用。',
      时间: '资料要是新的，旧资料不能用。',
      证据: '资料要有证据，没证据不能用。',
      相关: '资料要和任务有关才可用。',
    }
    for (const word of missingWords) {
      fieldErrors.push({
        field: '规则说明',
        why: `规则说明里没提到“${word}”。`,
        fix: `在规则说明里加上“${word}”一问：${wordHint[word]}`,
      })
    }
  }

  return {
    passed: failedChecks.length === 0,
    failedChecks,
    cardResults,
    fieldErrors,
    usableExpected: [...USABLE_EXPECTED],
    usableGot,
  }
}

/**
 * 方法证据（对照 L03 的 methodEvidenceForRecord）：数字全部来自实算。
 * “可用”指检索到的卡里四问全过的卡（教师关键词下为 A、B；跑题关键词
 * 下检索到的卡里没有可用的，写“可用 0 张”）。
 */
export function methodEvidenceForRetrieval(
  input: RetrievalInput,
  validation: L04Validation,
): string {
  const keywords = normalizeKeywords(input.keywords)
  if (keywords.length === 0) {
    return '方法证据：尚未写关键词（先从任务句里挑 2–3 个关键词）。'
  }
  const retrieved = validation.cardResults.filter((score) => score.命中数 >= 1)
  const usableRetrieved = usableCards(retrieved)
  const retrievedIds = retrieved.map((score) => score.card.id)
  const usableIds = usableRetrieved.map((score) => score.card.id)
  const head = `方法证据：提示词 ${keywords.length} 个（${keywords.join('、')}），检索到 ${
    retrieved.length
  } 张${retrieved.length > 0 ? `（${retrievedIds.join('、')}）` : ''}，可用 ${
    usableRetrieved.length
  } 张${usableRetrieved.length > 0 ? `（${usableIds.join('、')}）` : ''}`
  const ruleText = input.ruleText
  if (ruleText.trim() === '') return `${head}；规则说明尚未写。`
  const missingWords = RULE_WORDS.filter((word) => !ruleText.includes(word))
  if (missingWords.length > 0) return `${head}；规则说明缺“${missingWords.join('、')}”一问。`
  return `${head}；规则说明提到了来源、时间、证据、相关四问。`
}

/* ------------------------------------------------------------------ */
/* 正反例：点按钮把例子填进编辑区，学生改它、校验它、修它               */
/* ------------------------------------------------------------------ */

export type RetrievalExample = { id: string; label: string; draft: RetrievalInput }

/** 24 答全对的答案表（ground truth：A、B 全过；C 输时间；D、E 输来源；F 输相关）。 */
export function correctAnswers(): Record<CardId, FourAnswers> {
  return {
    A: { source: true, time: true, evidence: true, relevant: true },
    B: { source: true, time: true, evidence: true, relevant: true },
    C: { source: true, time: false, evidence: true, relevant: true },
    D: { source: false, time: true, evidence: false, relevant: true },
    E: { source: false, time: true, evidence: false, relevant: true },
    F: { source: true, time: true, evidence: true, relevant: false },
  }
}

const GOOD_RULE = '从任务句里挑关键词；来源、时间、证据、相关四问全过才可用。'

function withAnswer(
  answers: Record<CardId, FourAnswers>,
  cardId: CardId,
  key: CredibilityQuestionKey,
  value: boolean,
): Record<CardId, FourAnswers> {
  return { ...answers, [cardId]: { ...answers[cardId], [key]: value } }
}

export const RETRIEVAL_EXAMPLES: RetrievalExample[] = [
  {
    id: 'good',
    label: '正确检索',
    draft: {
      keywords: [...RETRIEVAL_KEYWORDS],
      answers: correctAnswers(),
      usable: ['A', 'B'],
      ruleText: GOOD_RULE,
    },
  },
  {
    id: 'bad-source',
    label: '编造来源（D 判可信）',
    draft: {
      keywords: [...RETRIEVAL_KEYWORDS],
      answers: withAnswer(correctAnswers(), 'D', 'source', true),
      usable: ['A', 'B', 'D'],
      ruleText: GOOD_RULE,
    },
  },
  {
    id: 'outdated',
    label: '过期资料（C 判可用）',
    draft: {
      keywords: [...RETRIEVAL_KEYWORDS],
      answers: withAnswer(correctAnswers(), 'C', 'time', true),
      usable: ['A', 'B', 'C'],
      ruleText: GOOD_RULE,
    },
  },
  {
    id: 'irrelevant',
    label: '无关资料（F 判可用）',
    draft: {
      keywords: [...RETRIEVAL_KEYWORDS],
      answers: withAnswer(correctAnswers(), 'F', 'relevant', true),
      usable: ['A', 'B', 'F'],
      ruleText: GOOD_RULE,
    },
  },
  {
    id: 'bad-keywords',
    label: '关键词跑题',
    draft: {
      keywords: ['恐龙', '灭绝'],
      answers: correctAnswers(),
      usable: ['A', 'B'],
      ruleText: GOOD_RULE,
    },
  },
  {
    id: 'missing-rule',
    label: '规则说明缺一项',
    draft: {
      keywords: [...RETRIEVAL_KEYWORDS],
      answers: correctAnswers(),
      usable: ['A', 'B'],
      ruleText: '从任务句里挑关键词；来源、时间、证据三问全过才可用。',
    },
  },
]

/* ------------------------------------------------------------------ */
/* 三级提示：逐级揭示，不一次全给                                       */
/* ------------------------------------------------------------------ */

export const HINTS: { level: 1 | 2 | 3; title: string; text: string }[] = [
  {
    level: 1,
    title: '一级提示：方向',
    text: '先读任务句：从任务句里挑 2–3 个关键词；命中数是线索，可信度是门禁。',
  },
  {
    level: 2,
    title: '二级提示：方法',
    text: '每张卡问四问：来源可信吗？时间新吗？有证据吗？与任务相关吗？一问不过就不可用。',
  },
  {
    level: 3,
    title: '三级提示：对照',
    text: '对照否决理由的顺序：来源、时间、证据、相关——先看来源，再看时间，再看证据，最后看相关。',
  },
]

export const LESSON_STEPS: string[] = [
  '第一步：读任务句，写关键词——从任务句里挑 2–3 个关键词，点检索，看命中数。',
  '第二步：逐卡回答四问，勾选可用清单——来源、时间、证据、相关，一问不过就不可用。',
  '第三步：写规则说明，点校验修到通过——说清你的提示词规则，再解释一个失败的例子。',
]
