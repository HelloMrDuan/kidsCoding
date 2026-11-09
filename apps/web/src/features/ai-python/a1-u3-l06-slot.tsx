/**
 * A1-U3-L06 问答助手编辑器插槽（QaEditorSlot）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md
 * 与 L03 的插槽打法。外壳只负责布局、抽屉、文件菜单与自动保存；
 * 规则卡、提问预测、核对、错误示例、迁移提问、判定与作品总结全部在本插槽。
 *
 * 与旧试点演示 u3-local-lab.tsx 的 L06 区差别（外壳承担的部分已删）：
 * - 删三级提示按钮与提示区（外壳任务抽屉顺序揭示，提示揭示态不写草稿）；
 * - 删本地保存状态行与恢复默认按钮（外壳文件菜单与自动保存承担）；
 * - 删本地 localStorage 保存（外壳信封草稿 kidscoding-draft:A1-U3-L06）。
 *
 * 本课新增的 testid（E2E 与单测对应）：
 * ai-u3-l06-predict-{Q}-answer / -refuse / ai-u3-l06-ask-{Q} /
 * ai-u3-l06-reply-{Q} / ai-u3-l06-check / ai-u3-l06-result /
 * ai-u3-l06-verdict / ai-u3-l06-work / ai-u3-l06-custom-input /
 * ai-u3-l06-custom-predict-answer / -refuse / ai-u3-l06-custom-ask /
 * ai-u3-l06-custom-result / ai-u3-l06-error-{ans2|ans3}-{pass|digit|source} /
 * ai-u3-l06-draft-status。
 *
 * 判定三层分离：插槽内只展示本次核对的判定（八问逐项 + 结论 +
 * 方法证据），不写“已掌握”；编辑后旧判定失效，须重新点“核对八问”。
 * 草稿状态行只显示已问数与迁移提问数，不显示 hintLevel（外壳抽屉揭示态
 * 不回写草稿，旧 L02 教训：插槽不得显示它无法更新的计数）。
 * 预测前不显示问题分类：分类是学生要学的东西，问完才揭示。
 */

'use client'

import { useRef, useState } from 'react'
import type { EditorSlotProps, JudgmentResult } from '../lessons/workspace/workspace-slots'
import { buildQaJudgment } from './a1-u3-l06-adapter'
import { coerceDraft, type L06Draft } from './a1-u3-l06-draft'
import {
  EMPTY_QUESTION_NOTICE,
  ERROR_EXAMPLES,
  HALLUCINATION_KINDS,
  MAX_CUSTOM_COUNT,
  MAX_CUSTOM_LENGTH,
  QA_PAIRS,
  answerQuestion,
  checkCustomQuestion,
  checkErrorExample,
  checkQaDrill,
  type QaCheckResult,
  type QaPrediction,
} from './a1-u3-l06'

const ERROR_KIND_TESTID: Record<string, 'pass' | 'digit' | 'source'> = {
  通过: 'pass',
  编造数字: 'digit',
  编造来源: 'source',
}

export type QaSlotProps = EditorSlotProps & {
  /**
   * 判定上报（#481 课程侧一半，OPS-025 通道）。核对八问时上报三层判定，
   * 编辑后上报 null 使旧判定失效。外壳尚未接 onJudgment 时该回调恒为
   * undefined，插槽行为不变（判定仍在插槽内展示）。
   */
  onJudgment?: (judgment: JudgmentResult | null) => void
}

export function QaEditorSlot({ initial, onChange, editable, onJudgment }: QaSlotProps) {
  const [draft, setDraft] = useState<L06Draft>(() => coerceDraft(initial))
  const [result, setResult] = useState<QaCheckResult | null>(null)
  const [customText, setCustomText] = useState('')
  const [customPredicted, setCustomPredicted] = useState<QaPrediction | null>(null)
  const [customNotice, setCustomNotice] = useState<string | null>(null)
  const [askNotice, setAskNotice] = useState<Record<string, string>>({})
  const lastReportedRef = useRef(false)

  function persist(next: L06Draft) {
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

  /** 编辑（预测、提问、归类、自写问题）后：清核对结果并使旧判定失效。 */
  function edit(next: L06Draft) {
    persist(next)
    setResult(null)
    invalidateJudgment()
  }

  function predict(questionId: string, predicted: QaPrediction) {
    if (draft.predictions[questionId] === predicted) return
    edit({ ...draft, predictions: { ...draft.predictions, [questionId]: predicted } })
  }

  function ask(questionId: string) {
    if (!draft.predictions[questionId]) {
      setAskNotice((current) => ({
        ...current,
        [questionId]: '请先预测：助手会回答还是拒绝？',
      }))
      return
    }
    if (draft.asked.includes(questionId)) return
    setAskNotice((current) => {
      const next = { ...current }
      delete next[questionId]
      return next
    })
    edit({ ...draft, asked: [...draft.asked, questionId] })
  }

  function check() {
    const next = checkQaDrill(draft)
    setResult(next)
    lastReportedRef.current = true
    onJudgment?.(buildQaJudgment(next, draft))
  }

  function pickErrorKind(answerId: string, kind: (typeof HALLUCINATION_KINDS)[number]) {
    if (draft.errorChecks[answerId] === kind) return
    edit({ ...draft, errorChecks: { ...draft.errorChecks, [answerId]: kind } })
  }

  function askCustom() {
    const text = customText.trim()
    if (!text) {
      setCustomNotice(EMPTY_QUESTION_NOTICE)
      return
    }
    if (!customPredicted) {
      setCustomNotice('请先预测：助手会回答还是拒绝？')
      return
    }
    if (draft.custom.length >= MAX_CUSTOM_COUNT) {
      setCustomNotice(`迁移问题最多 ${MAX_CUSTOM_COUNT} 条，先核对已有的再写新的。`)
      return
    }
    setCustomNotice(null)
    setCustomText('')
    setCustomPredicted(null)
    edit({ ...draft, custom: [...draft.custom, { text, predicted: customPredicted }] })
  }

  const judgment = result ? buildQaJudgment(result, draft) : null
  const askedCount = draft.asked.length

  if (!editable) {
    return (
      <div className="kc-stack" data-testid="ai-u3-l06-slot-readonly">
        <p>本课为只读预览：先看八问，再看当前提问与核对结果。</p>
        {QA_PAIRS.map((pair) => (
          <div key={pair.id}>
            <p>
              {pair.id}：{pair.question}
            </p>
            {draft.asked.includes(pair.id) && (
              <p>
                {answerQuestion(pair.question).answered ? '回答' : '拒答'}：
                {answerQuestion(pair.question).text}
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="kc-stack">
      <p>课程开发中：本课是本地规则问答助手，不调用外部模型、不接网关。</p>

      <p>
        规则卡：助手只答课节内的问题。事实类 4 问、方法类 2 问能答；超范围类 2
        问一律拒答；库外问题也拒答。先预测助手会回答还是拒绝，再点“问”核对。
      </p>

      {QA_PAIRS.map((pair) => {
        const predicted = draft.predictions[pair.id] ?? null
        const asked = draft.asked.includes(pair.id)
        const answer = asked ? answerQuestion(pair.question) : null
        const correct =
          asked && answer !== null && predicted !== null
            ? (predicted === '能答') === answer.answered
            : null
        return (
          <div key={pair.id} data-testid={`ai-u3-l06-question-${pair.id}`}>
            <p>
              {pair.id}：{pair.question}
            </p>
            <div>
              <button
                type="button"
                data-testid={`ai-u3-l06-predict-${pair.id}-answer`}
                aria-pressed={predicted === '能答'}
                onClick={() => predict(pair.id, '能答')}
              >
                预测：能答
              </button>
              <button
                type="button"
                data-testid={`ai-u3-l06-predict-${pair.id}-refuse`}
                aria-pressed={predicted === '拒答'}
                onClick={() => predict(pair.id, '拒答')}
              >
                预测：拒答
              </button>
              <button
                type="button"
                data-testid={`ai-u3-l06-ask-${pair.id}`}
                onClick={() => ask(pair.id)}
              >
                问
              </button>
            </div>
            {askNotice[pair.id] && <p>{askNotice[pair.id]}</p>}
            {asked && answer && (
              <div data-testid={`ai-u3-l06-reply-${pair.id}`}>
                <p>
                  {answer.answered ? '回答' : '拒答'}：{answer.text}
                </p>
                <p>分类：{pair.category}</p>
                <p>
                  {correct === null
                    ? ''
                    : correct
                      ? '预测正确。'
                      : '预测错了：再看一次关键词命中了哪一条。'}
                </p>
              </div>
            )}
          </div>
        )
      })}

      <button type="button" data-testid="ai-u3-l06-check" onClick={check}>
        核对八问
      </button>

      {result && judgment && (
        <div data-testid="ai-u3-l06-result">
          <ul>
            {result.checks.map((check) => (
              <li key={check.id}>
                {check.id}：{check.passed ? '通过' : '未通过'}——{check.detail}
              </li>
            ))}
          </ul>
          <p data-testid="ai-u3-l06-verdict">{judgment.layers[1].detail}</p>
          <p>{judgment.conclusion}</p>
          <p>{judgment.methodEvidence}</p>
        </div>
      )}

      {result?.passed && (
        <div data-testid="ai-u3-l06-work">
          <h3>作品总结</h3>
          <p>
            你的问答助手已通过八问核对：已问 {askedCount}/8，预测正确{' '}
            {result.passedCount}/8。迁移提问 {draft.custom.length} 个是你的原创作品，
            最终核验（新问题）见下。
          </p>
        </div>
      )}

      {result && !result.passed && <p>先修到八问全过：改预测、再提问、再点“核对八问”。</p>}

      <h3>错误示例：助手答错了，怎么发现？</h3>
      <p>下面两条回答是试点留下的待核对答案：逐字对照来源，点出它是“通过”“编造数字”还是“编造来源”。</p>
      {ERROR_EXAMPLES.map((example) => {
        const verdict = checkErrorExample(example)
        const picked = draft.errorChecks[example.id]
        return (
          <div key={example.id}>
            <p>
              {example.label}：{example.text}
            </p>
            <div>
              {HALLUCINATION_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  data-testid={`ai-u3-l06-error-${example.id}-${ERROR_KIND_TESTID[kind]}`}
                  aria-pressed={picked === kind}
                  onClick={() => pickErrorKind(example.id, kind)}
                >
                  {kind}
                </button>
              ))}
            </div>
            {picked !== undefined && (
              <p>
                {picked === verdict.kind
                  ? `判断正确：${verdict.kind}。${verdict.fix}`
                  : `不对，再看一次：${verdict.differences.join('')}${verdict.fix}`}
              </p>
            )}
          </div>
        )
      })}

      <h3>迁移创作：写你自己的新问题</h3>
      <p>
        各写一个能答与一个拒答的新问题，先预测再问。旧问题重复问是练习记录，
        最终核验须用新问题。
      </p>
      <label htmlFor="a1-u3-l06-custom-input">写一个新问题（最多 200 字）</label>
      <input
        id="a1-u3-l06-custom-input"
        data-testid="ai-u3-l06-custom-input"
        value={customText}
        maxLength={MAX_CUSTOM_LENGTH}
        onChange={(event) => {
          setCustomText(event.target.value)
          setCustomNotice(null)
        }}
        placeholder="例如：金帅苹果有多重？"
      />
      <div>
        <button
          type="button"
          data-testid="ai-u3-l06-custom-predict-answer"
          aria-pressed={customPredicted === '能答'}
          onClick={() => setCustomPredicted('能答')}
        >
          预测：能答
        </button>
        <button
          type="button"
          data-testid="ai-u3-l06-custom-predict-refuse"
          aria-pressed={customPredicted === '拒答'}
          onClick={() => setCustomPredicted('拒答')}
        >
          预测：拒答
        </button>
        <button type="button" data-testid="ai-u3-l06-custom-ask" onClick={askCustom}>
          问新问题
        </button>
      </div>
      {customNotice && <p>{customNotice}</p>}
      {draft.custom.length > 0 && (
        <div data-testid="ai-u3-l06-custom-result">
          {draft.custom.map((custom, index) => {
            const checked = checkCustomQuestion(custom)
            const answer = answerQuestion(custom.text)
            return (
              <div key={`${custom.text}-${index}`}>
                <p>
                  新问题 {index + 1}：{custom.text}
                </p>
                <p>
                  {answer.answered ? '回答' : '拒答'}：{answer.text}
                </p>
                <p>
                  {checked.correct
                    ? '预测正确。'
                    : '预测错了：再看一次关键词命中了哪一条。'}
                </p>
              </div>
            )
          })}
        </div>
      )}

      <p data-testid="ai-u3-l06-draft-status">
        本机草稿状态：已问 {askedCount}/8，迁移提问 {draft.custom.length} 个。
        要清空全部内容，用顶部文件菜单里的“恢复初始”。
      </p>
    </div>
  )
}
