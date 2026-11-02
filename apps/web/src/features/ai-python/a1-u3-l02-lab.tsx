'use client'

import { useState, useSyncExternalStore } from 'react'
import {
  BAD_SUMMARIES,
  FACT_STATEMENTS,
  GOOD_SUMMARY,
  HINTS,
  L02_LESSON_TITLE,
  SUMMARY_METHOD_STEPS,
  SUMMARY_PASSAGE,
  SUMMARY_POINTS,
  buildDraftSummary,
  checkDraftSummary,
  type FactKind,
  type L02Check,
} from './a1-u3-l02'
import {
  getDraftSnapshot,
  getServerDraftSnapshot,
  restoreDefaultDraft,
  storeDraft,
  subscribeDraft,
  type L02Draft,
} from './a1-u3-l02-draft'

function CheckLines({ checks }: { checks: L02Check[] }) {
  return (
    <div className="mt-2 space-y-1">
      {checks.map((check) => (
        <p key={check.name} className="text-sm leading-7 text-[#18243a]">
          {check.name}：{check.passed ? '通过' : '失败'}——{check.detail}
        </p>
      ))}
    </div>
  )
}

export function AiPythonU3L02Lab() {
  const draft = useSyncExternalStore(subscribeDraft, getDraftSnapshot, getServerDraftSnapshot)
  const [saveError, setSaveError] = useState(false)
  const [summaryChecks, setSummaryChecks] = useState<L02Check[] | null>(null)
  const [factsChecked, setFactsChecked] = useState(false)
  const [customInput, setCustomInput] = useState('')

  // Persist a draft edit and surface a visible "not saved" state when the
  // browser storage write fails, instead of silently dropping the edit.
  function persist(next: L02Draft) {
    setSaveError(!storeDraft(next))
  }

  function toggleSentence(id: string) {
    const selected = draft.selected.includes(id)
      ? draft.selected.filter((item) => item !== id)
      : [...draft.selected, id]
    persist({ ...draft, selected })
    setSummaryChecks(null)
  }

  function addCustom() {
    const text = customInput.trim()
    if (text === '') return
    persist({ ...draft, custom: [...draft.custom, text] })
    setCustomInput('')
    setSummaryChecks(null)
  }

  function removeCustom(index: number) {
    persist({ ...draft, custom: draft.custom.filter((_, i) => i !== index) })
    setSummaryChecks(null)
  }

  function setFact(id: string, value: string) {
    persist({
      ...draft,
      facts: { ...draft.facts, [id]: value === '' ? undefined : (value as FactKind) },
    })
    setFactsChecked(false)
  }

  function resetAll() {
    persist(restoreDefaultDraft())
    setSummaryChecks(null)
    setFactsChecked(false)
  }

  const draftSummary = buildDraftSummary(draft.selected, draft.custom)
  const factScore = FACT_STATEMENTS.filter(
    (statement) => draft.facts[statement.id] === statement.kind,
  ).length

  return (
    <main data-testid="ai-u3-l02-lab" className="mx-auto max-w-3xl bg-[#f3f6fb] px-4 py-8">
      <p className="rounded-[14px] border border-[#e7edf5] bg-white p-4 text-sm leading-7 text-[#6f7d92]">
        课程开发中（未发布、未通过独立复核）。本课复用 U3 本地试点已发表的合成课文与本地判定引擎，不调用外部模型。
      </p>
      <h1 data-testid="ai-u3-l02-lesson-heading" className="mt-4 text-2xl font-black text-[#18243a]">
        A1-U3-L02 {L02_LESSON_TITLE}
      </h1>
      <p className="mt-2 text-sm leading-7 text-[#6f7d92]">
        本课练的是“忠实”：摘要不能漏要点、不能添内容、不能改原意，还要合抽取规范、过来源核验。生成式摘要只一句话方向，本课不实现、不调用外部模型。
      </p>

      <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
        <h2 className="text-lg font-black text-[#18243a]">课文全文（合成数据）</h2>
        <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
          以下 5 段课文是试点新增合成数据，非真实教材；每段第一句是主题句；要点 A、B、C 标在段首。
        </p>
        <div data-testid="ai-u3-l02-passage" className="mt-3 space-y-3">
          {SUMMARY_PASSAGE.map((paragraph) => (
            <p key={paragraph.id} className="text-sm leading-7 text-[#18243a]">
              <span className="font-bold">
                {paragraph.id}（要点 {paragraph.point}：{SUMMARY_POINTS[paragraph.point]}）
              </span>
              {paragraph.sentences.join('')}
            </p>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
        <h2 className="text-lg font-black text-[#18243a]">摘要三步法</h2>
        <ul className="mt-2 space-y-1">
          {SUMMARY_METHOD_STEPS.map((step) => (
            <li key={step} className="text-sm leading-7 text-[#18243a]">{step}</li>
          ))}
        </ul>
        <p className="mt-2 text-sm leading-7 text-[#6f7d92]">
          三项对照检查：漏要点（A、B、C 全了吗）、添内容（每句都在原文里吗）、改原意（数字对吗）。
        </p>
      </section>

      <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
        <h2 className="text-lg font-black text-[#18243a]">练习 A：动手摘要</h2>
        <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
          勾选进摘要的句子，也可自加一句自己的话；点“检查摘要”看五项检查。本课 3 个要点，标准摘要 3 句；全文照搬、要点重复、无来源的句子都会被判违规。
        </p>
        <div className="mt-3 space-y-2">
          {SUMMARY_PASSAGE.map((paragraph) =>
            paragraph.sentences.map((sentence, index) => {
              const id = `${paragraph.id}-${index + 1}`
              return (
                <label key={id} className="flex items-start gap-2 text-sm leading-7 text-[#18243a]">
                  <input
                    type="checkbox"
                    data-testid={`ai-u3-l02-pick-${id}`}
                    checked={draft.selected.includes(id)}
                    onChange={() => toggleSentence(id)}
                    className="mt-1"
                  />
                  <span>
                    {id}：{sentence}
                  </span>
                </label>
              )
            }),
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            data-testid="ai-u3-l02-custom-input"
            value={customInput}
            onChange={(event) => setCustomInput(event.target.value)}
            placeholder="自加一句自己的话（无来源，通不过来源核验）"
            className="w-full rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
          />
          <button
            type="button"
            data-testid="ai-u3-l02-add-custom"
            onClick={addCustom}
            className="shrink-0 rounded-[14px] border border-[#e7edf5] bg-white px-4 py-2 text-sm text-[#18243a]"
          >
            加入摘要
          </button>
        </div>
        <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
          试试触发错误：自加一句原文没有的话看添内容，自加一句带新数字的话看改原意。
        </p>
        {draftSummary.entries.length > 0 && (
          <div data-testid="ai-u3-l02-entries" className="mt-3 space-y-1 rounded-[14px] bg-[#f3f6fb] p-4">
            <p className="text-sm font-bold text-[#18243a]">当前摘要条目：</p>
            {draftSummary.entries
              .filter((entry) => entry.sourceId !== null)
              .map((entry) => (
                <p key={entry.sourceId as string} className="flex items-start justify-between gap-2 text-sm leading-7 text-[#18243a]">
                  <span>
                    {entry.sourceId}：{entry.text}
                  </span>
                  <button
                    type="button"
                    data-testid={`ai-u3-l02-remove-${entry.sourceId}`}
                    onClick={() => toggleSentence(entry.sourceId as string)}
                    className="shrink-0 text-[#6f7d92]"
                  >
                    移除
                  </button>
                </p>
              ))}
            {draft.custom.map((text, index) => (
              <p key={`custom-${index}`} className="flex items-start justify-between gap-2 text-sm leading-7 text-[#18243a]">
                <span>
                  自加：{text}
                </span>
                <button
                  type="button"
                  data-testid={`ai-u3-l02-remove-custom-${index}`}
                  onClick={() => removeCustom(index)}
                  className="shrink-0 text-[#6f7d92]"
                >
                  移除
                </button>
              </p>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            data-testid="ai-u3-l02-check-summary"
            onClick={() => setSummaryChecks(checkDraftSummary(draftSummary))}
            className="rounded-[14px] bg-[#2463eb] px-6 py-2 text-sm font-bold text-white"
          >
            检查摘要
          </button>
          {HINTS.map((hint) => (
            <button
              key={hint.level}
              type="button"
              data-testid={`ai-u3-l02-hint-${hint.level}`}
              onClick={() => persist({ ...draft, hintLevel: hint.level })}
              className="rounded-[14px] border border-[#e7edf5] bg-white px-4 py-2 text-sm text-[#18243a]"
            >
              {hint.title}
            </button>
          ))}
        </div>
        {draft.hintLevel > 0 && (
          <div data-testid="ai-u3-l02-hint-text" className="mt-3 space-y-1 rounded-[14px] bg-[#eef4ff] p-4">
            {HINTS.filter((hint) => hint.level <= draft.hintLevel).map((hint) => (
              <p key={hint.level} className="text-sm leading-7 text-[#18243a]">
                {hint.title}：{hint.text}
              </p>
            ))}
          </div>
        )}
        {summaryChecks !== null && (
          <div data-testid="ai-u3-l02-summary-checks" className="mt-3 rounded-[14px] bg-[#f3f6fb] p-4">
            <p className="text-sm font-bold text-[#18243a]">
              你的摘要（{draftSummary.sentences.length} 句）：
            </p>
            {draftSummary.sentences.map((sentence, index) => (
              <p key={`${sentence}-${index}`} className="text-sm leading-7 text-[#18243a]">{sentence}</p>
            ))}
            <CheckLines checks={summaryChecks} />
          </div>
        )}
      </section>

      <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
        <h2 className="text-lg font-black text-[#18243a]">正反例：对照着看</h2>
        <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
          好摘要与三类坏摘要的检查结果都由本地引擎实算，不是手填的。
        </p>
        <div className="mt-3 space-y-4">
          {[GOOD_SUMMARY, ...BAD_SUMMARIES].map((example) => (
            <div key={example.id} className="rounded-[14px] border border-[#e7edf5] p-4">
              <p className="text-sm font-bold text-[#18243a]">{example.label}</p>
              {example.result.sentences.map((sentence) => (
                <p key={sentence} className="text-sm leading-7 text-[#18243a]">{sentence}</p>
              ))}
              <CheckLines checks={example.checks} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
        <h2 className="text-lg font-black text-[#18243a]">练习 B：事实核对</h2>
        <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
          给每条说法分类：原文事实（课文直接写了）、合理概括（多处信息归纳，无课外事实）、无依据推断（课文没有也推不出来）。添内容即错，忠实先于文采。
        </p>
        <div className="mt-3 space-y-3">
          {FACT_STATEMENTS.map((statement) => (
            <div key={statement.id}>
              <p className="text-sm leading-7 text-[#18243a]">
                {statement.id}：{statement.text}
              </p>
              <select
                data-testid={`ai-u3-l02-fact-${statement.id}`}
                value={draft.facts[statement.id] ?? ''}
                onChange={(event) => setFact(statement.id, event.target.value)}
                className="mt-1 w-full rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
              >
                <option value="">请选择分类</option>
                <option value="原文事实">原文事实</option>
                <option value="合理概括">合理概括</option>
                <option value="无依据推断">无依据推断</option>
              </select>
              {factsChecked && (
                <p data-testid={`ai-u3-l02-fact-result-${statement.id}`} className="mt-1 text-sm leading-7 text-[#18243a]">
                  {draft.facts[statement.id] === statement.kind
                    ? `正确：${statement.kind}。${statement.explanation}`
                    : `不对：应为${statement.kind}。${statement.explanation}`}
                </p>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          data-testid="ai-u3-l02-check-facts"
          onClick={() => setFactsChecked(true)}
          className="mt-3 rounded-[14px] bg-[#2463eb] px-6 py-2 text-sm font-bold text-white"
        >
          核对
        </button>
        {factsChecked && (
          <p data-testid="ai-u3-l02-fact-score" className="mt-2 text-sm leading-7 text-[#18243a]">
            本次核对：{factScore} / {FACT_STATEMENTS.length} 条正确。
          </p>
        )}
      </section>

      <section className="mt-6 rounded-[14px] border border-[#e7edf5] bg-white p-4">
        <h2 className="text-lg font-black text-[#18243a]">本机草稿与总结</h2>
        <p data-testid="ai-u3-l02-draft-status" className="mt-2 text-sm leading-7 text-[#6f7d92]">
          本机草稿状态：已选 {draft.selected.length} 句，自加 {draft.custom.length} 句；事实核对已选{' '}
          {Object.values(draft.facts).filter(Boolean).length} / {FACT_STATEMENTS.length} 条；
          提示已揭示到 {draft.hintLevel === 0 ? '未揭示' : `${draft.hintLevel} 级`}。
          {saveError ? '本机草稿未能保存：浏览器存储不可用，刷新后草稿不会恢复；刚才的修改没有存下来。' : null}
        </p>
        <button
          type="button"
          data-testid="ai-u3-l02-reset"
          onClick={resetAll}
          className="mt-2 rounded-[14px] border border-[#e7edf5] bg-white px-4 py-2 text-sm text-[#18243a]"
        >
          恢复默认（清空选择）
        </button>
        <p className="mt-3 text-sm leading-7 text-[#18243a]">
          总结：摘要三步是找主题句、删重复、按要点重组；三项检查是漏要点、添内容、改原意；“添内容即错”，忠实先于文采。生成式摘要只一句话方向，本课不调用外部模型；清除浏览器数据会丢草稿。
        </p>
      </section>
    </main>
  )
}
