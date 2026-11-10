/**
 * A1-U3-L04 检索编辑器插槽（RetrievalEditorSlot）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md
 * 与 L02/L03 的插槽打法。外壳只负责布局、抽屉、文件菜单与自动保存；
 * 语料表、关键词检索、逐卡四问、可用清单、规则说明、校验、卡级报错、
 * 判定与作品总结全部在本插槽。
 *
 * 与骨架占位 textarea 的差别：
 * - 语料表 6 张卡逐行展示标题 / 来源 / 时间 / 摘要句；点“检索”后
 *   追加命中数列与“检索到 / 未检索到”标记。
 * - 关键词单行输入（空格或“、”分隔），输入即拆分、去重；校验时才判。
 * - 每卡四组“是 / 否”按钮，未作答态与已作答态视觉区分。
 * - 每卡一个“加入可用清单”勾选框。
 * - 规则说明多行输入，占位文案写明须提到四词。
 * - 6 个示例按钮载入预填草稿，学生改它、校验它、修它。
 *
 * 保留并与 L02/L03/L06 一致的 testid 惯例（ai-u3-l04-*）：
 * ai-u3-l04-corpus / ai-u3-l04-task / ai-u3-l04-keywords /
 * ai-u3-l04-retrieve / ai-u3-l04-hits-* / ai-u3-l04-found-* /
 * ai-u3-l04-q-*-yes|no / ai-u3-l04-usable-* / ai-u3-l04-rule /
 * ai-u3-l04-example-* / ai-u3-l04-check / ai-u3-l04-result /
 * ai-u3-l04-verdict / ai-u3-l04-work / ai-u3-l04-draft-status。
 *
 * 判定三层分离：插槽内只展示本次校验的判定（五项逐项 + 结论 +
 * 方法证据），结论只写合格/未合格；编辑后旧判定失效，须重新点校验。
 * 草稿状态行只显示编辑进度（关键词个数、四问已答数、清单张数、
 * 规则说明字数），不显示 hintLevel（外壳抽屉揭示态不回写草稿，
 * 旧 L02 教训：插槽不得显示它无法更新的计数）。
 */

'use client'

import { useMemo, useRef, useState } from 'react'
import type { EditorSlotProps, JudgmentResult } from '../lessons/workspace/workspace-slots'
import { buildA1U3L04Judgment } from './a1-u3-l04-adapter'
import { coerceDraft, type L04Draft } from './a1-u3-l04-draft'
import {
  CARD_IDS,
  CORPUS_CARDS,
  CREDIBILITY_QUESTIONS,
  L04_CHECK_NAMES,
  RETRIEVAL_EXAMPLES,
  TASK_SENTENCE,
  scoreCards,
  validateRetrieval,
  type CardId,
  type CredibilityQuestionKey,
  type FourAnswers,
  type L04Validation,
  type RetrievalInput,
} from './a1-u3-l04'

function splitKeywords(text: string): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of text.split(/[\s、，,]+/)) {
    const trimmed = part.trim()
    if (trimmed === '' || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
  }
  return out
}

function emptyAnswers(): FourAnswers {
  return { source: null, time: null, evidence: null, relevant: null }
}

function answeredCountOf(draft: L04Draft): number {
  let count = 0
  for (const cardId of CARD_IDS) {
    const answers = draft.answers[cardId]
    if (!answers) continue
    for (const question of CREDIBILITY_QUESTIONS) {
      if (answers[question.key] !== null && answers[question.key] !== undefined) count += 1
    }
  }
  return count
}

/**
 * 语料表：6 张卡逐行展示标题 / 来源 / 时间 / 摘要句。
 * 点“检索”后追加命中数列与“检索到 / 未检索到”标记；未点检索前
 * 命中数列显示“—”。取值范围列自然宽度超过 375px 视口，必须包一层
 * 横向滚动，否则整页横向溢出（L03 的字段表同款做法）。
 */
function CorpusTable({
  scores,
  retrieved,
}: {
  scores: ReturnType<typeof scoreCards>
  retrieved: boolean
}) {
  return (
    <div className="overflow-x-auto" data-testid="ai-u3-l04-corpus">
      <table>
        <thead>
          <tr>
            <th>卡</th>
            <th>标题</th>
            <th>来源</th>
            <th>时间</th>
            <th>摘要句</th>
            <th>命中数</th>
            <th>检索结果</th>
          </tr>
        </thead>
        <tbody>
          {CORPUS_CARDS.map((card) => {
            const score = scores.find((item) => item.card.id === card.id)
            const hits = score?.命中数 ?? 0
            return (
              <tr key={card.id}>
                <td>{card.id}</td>
                <td>{card.标题}</td>
                <td>{card.来源}</td>
                <td>{card.时间}</td>
                <td>{card.摘要句}</td>
                <td data-testid={`ai-u3-l04-hits-${card.id}`}>{retrieved ? hits : '—'}</td>
                <td data-testid={`ai-u3-l04-found-${card.id}`}>
                  {!retrieved ? '—' : hits >= 1 ? '检索到' : '未检索到'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export type RetrievalSlotProps = EditorSlotProps & {
  /**
   * 判定上报（#481 课程侧一半，OPS-025 通道）。校验时上报三层判定，
   * 编辑后上报 null 使旧判定失效。外壳尚未接 onJudgment 时该回调恒为
   * undefined，插槽行为不变（判定仍在插槽内展示）。
   */
  onJudgment?: (judgment: JudgmentResult | null) => void
}

export function A1U3L04EditorSlot({ initial, onChange, editable, onJudgment }: RetrievalSlotProps) {
  const [draft, setDraft] = useState<L04Draft>(() => coerceDraft(initial))
  const [keywordsText, setKeywordsText] = useState(draft.keywords.join(' '))
  const [retrieved, setRetrieved] = useState(draft.keywords.length > 0)
  const [result, setResult] = useState<L04Validation | null>(null)
  const lastReportedRef = useRef(false)

  const scores = useMemo(() => scoreCards(draft.keywords), [draft.keywords])

  function persist(next: L04Draft) {
    setDraft(next)
    onChange(next)
  }

  /** 编辑后旧判定失效：只在曾上报过判定时才报 null，避免无判定时的空报。 */
  function invalidateJudgment() {
    if (lastReportedRef.current) {
      lastReportedRef.current = false
      onJudgment?.(null)
    }
  }

  function handleKeywordsChange(text: string) {
    setKeywordsText(text)
    persist({ ...draft, keywords: splitKeywords(text) })
    setResult(null)
    invalidateJudgment()
  }

  function handleRetrieve() {
    setRetrieved(true)
  }

  function handleAnswer(cardId: CardId, key: CredibilityQuestionKey, value: boolean) {
    const next: L04Draft = {
      ...draft,
      answers: {
        ...draft.answers,
        [cardId]: { ...emptyAnswers(), ...draft.answers[cardId], [key]: value },
      },
    }
    persist(next)
    setResult(null)
    invalidateJudgment()
  }

  function handleUsableToggle(cardId: CardId, checked: boolean) {
    const next: L04Draft = {
      ...draft,
      usable: checked
        ? [...new Set([...draft.usable, cardId])]
        : draft.usable.filter((id) => id !== cardId),
    }
    persist(next)
    setResult(null)
    invalidateJudgment()
  }

  function handleRuleChange(text: string) {
    persist({ ...draft, ruleText: text })
    setResult(null)
    invalidateJudgment()
  }

  function loadExample(example: RetrievalInput) {
    const next: L04Draft = {
      version: 1,
      keywords: [...example.keywords],
      answers: JSON.parse(JSON.stringify(example.answers)) as L04Draft['answers'],
      usable: [...example.usable],
      ruleText: example.ruleText,
      hintLevel: draft.hintLevel,
    }
    setKeywordsText(next.keywords.join(' '))
    setRetrieved(true)
    persist(next)
    setResult(null)
    invalidateJudgment()
  }

  function check() {
    const validation = validateRetrieval(draft)
    setResult(validation)
    lastReportedRef.current = true
    onJudgment?.(buildA1U3L04Judgment(validation, draft))
  }

  const judgment = result ? buildA1U3L04Judgment(result, draft) : null

  if (!editable) {
    return (
      <div className="kc-stack">
        <p>本课为只读预览：先读任务句与语料表，再看当前作业的校验结果。</p>
        <p data-testid="ai-u3-l04-task">任务句：{TASK_SENTENCE}</p>
        <CorpusTable scores={scores} retrieved={draft.keywords.length > 0} />
        <p>
          关键词：{draft.keywords.join('、') || '（未写）'}；可用清单：
          {draft.usable.join('、') || '（未选）'}；规则说明：{draft.ruleText || '（未写）'}
        </p>
      </div>
    )
  }

  return (
    <div className="kc-stack">
      <p>课程开发中：本课为本地规则资料检索，不调用外部模型、不接网关。</p>

      <p data-testid="ai-u3-l04-task">任务句：{TASK_SENTENCE}</p>

      <CorpusTable scores={scores} retrieved={retrieved} />

      <label htmlFor="a1-u3-l04-keywords-input">
        关键词（从任务句里挑 2–3 个，用空格或“、”分隔）
      </label>
      <input
        id="a1-u3-l04-keywords-input"
        data-testid="ai-u3-l04-keywords"
        type="text"
        value={keywordsText}
        onChange={(event) => handleKeywordsChange(event.target.value)}
        placeholder="苹果 颜色 规则"
      />

      <button type="button" data-testid="ai-u3-l04-retrieve" onClick={handleRetrieve}>
        检索
      </button>

      {CORPUS_CARDS.map((card) => {
        const cardId = card.id as CardId
        const answers = draft.answers[cardId] ?? emptyAnswers()
        return (
          <div key={card.id}>
            <h3>
              卡 {card.id}《{card.标题}》
            </h3>
            {CREDIBILITY_QUESTIONS.map((question) => {
              const key = question.key
              const value = answers[key]
              return (
                <div key={question.key}>
                  <span>
                    {question.name}？
                  </span>
                  <button
                    type="button"
                    data-testid={`ai-u3-l04-q-${cardId}-${key}-yes`}
                    aria-pressed={value === true}
                    style={
                      value === true
                        ? { fontWeight: 700, borderColor: 'var(--brand)', background: 'var(--canvas)' }
                        : undefined
                    }
                    onClick={() => handleAnswer(cardId, key, true)}
                  >
                    是
                  </button>
                  <button
                    type="button"
                    data-testid={`ai-u3-l04-q-${cardId}-${key}-no`}
                    aria-pressed={value === false}
                    style={
                      value === false
                        ? { fontWeight: 700, borderColor: 'var(--brand)', background: 'var(--canvas)' }
                        : undefined
                    }
                    onClick={() => handleAnswer(cardId, key, false)}
                  >
                    否
                  </button>
                </div>
              )
            })}
            <label>
              <input
                type="checkbox"
                data-testid={`ai-u3-l04-usable-${cardId}`}
                checked={draft.usable.includes(cardId)}
                onChange={(event) => handleUsableToggle(cardId, event.target.checked)}
              />
              加入可用清单
            </label>
          </div>
        )
      })}

      <label htmlFor="a1-u3-l04-rule-input">规则说明</label>
      <textarea
        id="a1-u3-l04-rule-input"
        data-testid="ai-u3-l04-rule"
        value={draft.ruleText}
        onChange={(event) => handleRuleChange(event.target.value)}
        rows={3}
        placeholder="用一句话说清你的提示词规则（要提到来源、时间、证据、相关）"
      />

      <div>
        <span>例子：</span>
        {RETRIEVAL_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            data-testid={`ai-u3-l04-example-${example.id}`}
            onClick={() => loadExample(example.draft)}
          >
            {example.label}
          </button>
        ))}
      </div>

      <button type="button" data-testid="ai-u3-l04-check" onClick={check}>
        执行校验
      </button>

      {result && judgment && (
        <div data-testid="ai-u3-l04-result">
          <ul>
            {L04_CHECK_NAMES.map((checkName) => (
              <li key={checkName}>
                {checkName}：{result.failedChecks.includes(checkName) ? '失败' : '通过'}
              </li>
            ))}
          </ul>
          {result.fieldErrors.map((error) => (
            <p key={error.field}>
              「{error.field}」{error.why}
              {error.fix}
            </p>
          ))}
          <p data-testid="ai-u3-l04-verdict">{judgment.layers[1].detail}</p>
          <p>{judgment.conclusion}</p>
          <p>{judgment.methodEvidence}</p>
        </div>
      )}

      {result?.passed && (
        <div data-testid="ai-u3-l04-work">
          <h3>作品总结</h3>
          <p>本次检索合格：</p>
          <p>关键词：{draft.keywords.join('、')}</p>
          <p>可用资料：{draft.usable.join('、')}</p>
          <p>提示词规则：{draft.ruleText}</p>
          <p>{judgment?.methodEvidence}</p>
        </div>
      )}

      {result && !result.passed && <p>先修到五项全过：按上面报错逐条改，改完再点校验。</p>}

      <p data-testid="ai-u3-l04-draft-status">
        本机草稿状态：关键词 {draft.keywords.length} 个，四问已答 {answeredCountOf(draft)}
        /24，可用清单 {draft.usable.length} 张，规则说明 {draft.ruleText.length} 字。
        要清空全部内容，用顶部文件菜单里的“恢复初始”。
      </p>
    </div>
  )
}
