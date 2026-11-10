/**
 * A1-U3-L05 引用核对编辑器插槽（CitationEditorSlot）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md
 * 与 L06 的插槽打法。外壳只负责布局、抽屉、文件菜单与自动保存；
 * 规则卡、资料册、八项核对、判定与作品总结全部在本插槽。
 *
 * 与 L06 的差别（本课独有）：
 * - 资料册 5 张卡全部是课堂示例资料，页面首行明说不是真实联网搜索
 *   结果；待核对的 AI 回答 8 项各带一个引用栏，含“（无引用）”边界。
 * - 每项的判断是四选一 verdict（可信 / 编造数字 / 编造来源 / 证据不足），
 *   不用自由文本；点“检查八项”时有未选项要明确提示“还有 X 项没选”。
 *
 * 本课新增的 testid（E2E 与单测对应）：
 * ai-u3-l05-source-{A|B|C|D|E} / ai-u3-l05-item-{E1|E2|P1|P2|P3|P4|T1|T2} /
 * ai-u3-l05-verdict-{id}-{trusted|digit|source|insufficient} /
 * ai-u3-l05-check / ai-u3-l05-notice / ai-u3-l05-result /
 * ai-u3-l05-verdict / ai-u3-l05-work / ai-u3-l05-draft-status。
 *
 * 判定三层分离：插槽内只展示本次核对的判定（八项逐项 + 结论 +
 * 方法证据），不写表示完全掌握的字样；编辑后旧判定失效，须重新点“检查八项”。
 * 草稿状态行只显示已选数，不显示提示揭示态（外壳抽屉揭示态不回写
 * 草稿，插槽不得显示它无法更新的计数）。
 */

'use client'

import { useRef, useState } from 'react'
import type { EditorSlotProps, JudgmentResult } from '../lessons/workspace/workspace-slots'
import { buildCitationJudgment } from './a1-u3-l05-adapter'
import { coerceDraft, type L05Draft } from './a1-u3-l05-draft'
import {
  CHECK_ITEMS,
  LESSON_STEPS,
  SOURCE_CARDS,
  VERDICTS,
  checkVerdicts,
  type CheckResult,
  type Verdict,
} from './a1-u3-l05'

const VERDICT_TESTID: Record<Verdict, 'trusted' | 'digit' | 'source' | 'insufficient'> = {
  可信: 'trusted',
  编造数字: 'digit',
  编造来源: 'source',
  证据不足: 'insufficient',
}

const LEVEL_TITLES: Record<1 | 2 | 3, string> = {
  1: '探索预测：先猜再核对',
  2: '独立练习：自己核对四条',
  3: '迁移应用：新资料新回答',
}

export type CitationSlotProps = EditorSlotProps & {
  /**
   * 判定上报（#481 课程侧一半，OPS-025 通道）。检查八项时上报三层判定，
   * 编辑后上报 null 使旧判定失效。外壳尚未接 onJudgment 时该回调恒为
   * undefined，插槽行为不变（判定仍在插槽内展示）。
   */
  onJudgment?: (judgment: JudgmentResult | null) => void
}

export function CitationEditorSlot({ initial, onChange, editable, onJudgment }: CitationSlotProps) {
  const [draft, setDraft] = useState<L05Draft>(() => coerceDraft(initial))
  const [result, setResult] = useState<CheckResult | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const lastReportedRef = useRef(false)

  function persist(next: L05Draft) {
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

  /** 编辑（选 verdict）后：清核对结果与未选提示，并使旧判定失效。 */
  function edit(next: L05Draft) {
    persist(next)
    setResult(null)
    setNotice(null)
    invalidateJudgment()
  }

  function pick(itemId: keyof L05Draft['verdicts'], verdict: Verdict) {
    if (draft.verdicts[itemId] === verdict) return
    edit({ ...draft, verdicts: { ...draft.verdicts, [itemId]: verdict } })
  }

  function check() {
    const next = checkVerdicts(draft)
    setResult(next)
    if (next.unpickedIds.length > 0) {
      setNotice(`还有 ${next.unpickedIds.length} 项没选：${next.unpickedIds.join('、')}。`)
    } else {
      setNotice(null)
    }
    lastReportedRef.current = true
    onJudgment?.(buildCitationJudgment(next, draft))
  }

  const judgment = result ? buildCitationJudgment(result, draft) : null
  const pickedCount = Object.values(draft.verdicts).filter((v) => v !== null).length

  if (!editable) {
    return (
      <div className="kc-stack" data-testid="ai-u3-l05-slot-readonly">
        <p>本课为只读预览：先看资料册，再看八项 AI 回答与当前选择。</p>
        {CHECK_ITEMS.map((item) => (
          <div key={item.id}>
            <p>
              {item.id}：{item.quote}
            </p>
            {draft.verdicts[item.id] !== null && <p>已选：{draft.verdicts[item.id]}</p>}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="kc-stack">
      <p>
        课堂示例资料，不是真实联网搜索结果：下面 5 张资料卡和 8 条 AI 回答全是课堂编的例子，
        只用来练核对，不能当真去查、去引用。
      </p>

      <h3>规则卡：核对四步</h3>
      <ol>
        {LESSON_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <h3>资料册（示例）</h3>
      {SOURCE_CARDS.map((card) => (
        <div key={card.id} data-testid={`ai-u3-l05-source-${card.id}`}>
          <p>
            资料 {card.id}：{card.title}
          </p>
          <p>出处：{card.source}</p>
          <p>{card.text}</p>
        </div>
      ))}

      {([1, 2, 3] as const).map((level) => (
        <div key={level}>
          <h3>{LEVEL_TITLES[level]}</h3>
          {CHECK_ITEMS.filter((item) => item.level === level).map((item) => {
            const picked = draft.verdicts[item.id]
            const checked = result?.checks.find((check) => check.id === item.id)
            return (
              <div key={item.id} data-testid={`ai-u3-l05-item-${item.id}`}>
                <p>
                  {item.id}：{item.quote}
                </p>
                <p>引用：{item.sourceLabel}</p>
                <div>
                  {VERDICTS.map((verdict) => (
                    <button
                      key={verdict}
                      type="button"
                      data-testid={`ai-u3-l05-verdict-${item.id}-${VERDICT_TESTID[verdict]}`}
                      aria-pressed={picked === verdict}
                      onClick={() => pick(item.id, verdict)}
                    >
                      {verdict}
                    </button>
                  ))}
                </div>
                {checked && <p>{checked.detail}</p>}
              </div>
            )
          })}
        </div>
      ))}

      <button type="button" data-testid="ai-u3-l05-check" onClick={check}>
        检查八项
      </button>

      {notice && <p data-testid="ai-u3-l05-notice">{notice}</p>}

      {result && judgment && (
        <div data-testid="ai-u3-l05-result">
          <ul>
            {result.checks.map((check) => (
              <li key={check.id}>
                {check.id}：{check.passed ? '通过' : '未通过'}——{check.detail}
              </li>
            ))}
          </ul>
          <p data-testid="ai-u3-l05-verdict">{judgment.layers[1].detail}</p>
          <p>{judgment.conclusion}</p>
          <p>{judgment.methodEvidence}</p>
        </div>
      )}

      {result?.passed && (
        <div data-testid="ai-u3-l05-work">
          <h3>作品总结</h3>
          <p>
            你的核对已通过八项：已选 {result.pickedCount}/8，选对{' '}
            {result.passedCount}/8。迁移项 T1、T2 是你的迁移验证；最终核验须用新资料新回答。
          </p>
        </div>
      )}

      {result && !result.passed && <p>先修到八项全过：改选 verdict、再点“检查八项”。</p>}

      <p data-testid="ai-u3-l05-draft-status">
        本机草稿状态：已选 {pickedCount}/8。要清空全部内容，用顶部文件菜单里的“恢复初始”。
      </p>
    </div>
  )
}
