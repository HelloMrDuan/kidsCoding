'use client'

import { useEffect, useState } from 'react'
import {
  A0_U1_L01_COUNTER_EXAMPLE,
  A0_U1_L01_PASS_THRESHOLD,
  a0u1L01,
  evaluateA0CounterExample,
  evaluateA0Creative,
  evaluateA0U1L01,
  type A0Answer,
  type A0ToolCategory,
} from '@/content/curriculum/a0-u1-ai-lessons'

const DRAFT_KEY = 'kidscoding:classify-draft:A0-U1-L01'

const BUCKETS: { id: A0ToolCategory; label: string }[] = [
  { id: 'ai', label: 'AI 相关' },
  { id: 'traditional', label: '传统程序' },
  { id: 'non_digital', label: '非数字工具' },
]

type ToolDraft = { category: A0ToolCategory | null; reason: string }
type DraftState = {
  answers: Record<string, ToolDraft>
  counter: { category: A0ToolCategory | null; reason: string }
  creative: { name: string; category: A0ToolCategory | null; reason: string }
}

function emptyDraft(): DraftState {
  return {
    answers: Object.fromEntries(a0u1L01.tools.map((tool) => [tool.id, { category: null, reason: '' }])),
    counter: { category: null, reason: '' },
    creative: { name: '', category: null, reason: '' },
  }
}

function readDraft(): DraftState {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return emptyDraft()
    const parsed = JSON.parse(raw) as Partial<DraftState>
    const base = emptyDraft()
    if (parsed.answers) {
      for (const tool of a0u1L01.tools) {
        const saved = parsed.answers[tool.id]
        if (saved && (saved.category === null || BUCKETS.some((b) => b.id === saved.category))) {
          base.answers[tool.id] = { category: saved.category ?? null, reason: typeof saved.reason === 'string' ? saved.reason : '' }
        }
      }
    }
    if (parsed.counter) {
      base.counter = {
        category: parsed.counter.category ?? null,
        reason: typeof parsed.counter.reason === 'string' ? parsed.counter.reason : '',
      }
    }
    if (parsed.creative) {
      base.creative = {
        name: typeof parsed.creative.name === 'string' ? parsed.creative.name : '',
        category: parsed.creative.category ?? null,
        reason: typeof parsed.creative.reason === 'string' ? parsed.creative.reason : '',
      }
    }
    return base
  } catch {
    return emptyDraft()
  }
}

function toolFeedback(toolId: string, evaluation: ReturnType<typeof evaluateA0U1L01> | null): string | null {
  if (!evaluation) return null
  const item = evaluation.items.find((entry) => entry.toolId === toolId)
  if (!item) return null
  if (item.correct) return '正确：分类正确且有理由'
  if (item.given === null) return '未通过：还没有选择分类'
  if (item.given === item.expected && !item.reasonGiven) return '未通过：分类正确但没有理由，理由不能为空'
  if (!item.reasonGiven) return '未通过：分类不对，且没有理由'
  return '未通过：分类不对，请用是否从数据中识别模式重新判断'
}

export function ClassifyLab() {
  const [draft, setDraft] = useState<DraftState>(emptyDraft)
  const [hydrated, setHydrated] = useState(false)
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateA0U1L01> | null>(null)
  const [counterFeedback, setCounterFeedback] = useState<string | null>(null)
  const [creativeFeedback, setCreativeFeedback] = useState<string | null>(null)

  // Hydration exception: the server must render the empty draft, and the
  // client loads the stored draft once after mount (otherwise the server
  // HTML and the first client render would mismatch). The save effect below
  // is guarded by `hydrated`, so the empty initial state never overwrites
  // a stored draft.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration exception, see above
    setDraft(readDraft())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      // Draft saving is best-effort; a full or blocked store must not break judging.
    }
  }, [draft, hydrated])

  const setTool = (toolId: string, patch: Partial<ToolDraft>) =>
    setDraft((prev) => ({ ...prev, answers: { ...prev.answers, [toolId]: { ...prev.answers[toolId], ...patch } } }))

  const handleSubmit = () => {
    const answers: A0Answer[] = a0u1L01.tools
      .filter((tool) => draft.answers[tool.id]?.category)
      .map((tool) => ({
        toolId: tool.id,
        category: draft.answers[tool.id].category as A0ToolCategory,
        reason: draft.answers[tool.id].reason,
      }))
    setEvaluation(evaluateA0U1L01(answers))
    if (!draft.counter.category) {
      setCounterFeedback('未通过：请先给收音机选择一个分类')
    } else {
      const result = evaluateA0CounterExample(draft.counter.category, draft.counter.reason)
      setCounterFeedback(result.correct ? '正确：会发声不等于 AI，判断有依据' : `未通过：${result.hint}`)
    }
    if (!draft.creative.name.trim()) {
      setCreativeFeedback('未通过：请先写出你举的工具名称')
    } else if (!draft.creative.category) {
      setCreativeFeedback('自创例子未通过：需要选择分类')
    } else if (!draft.creative.reason.trim()) {
      setCreativeFeedback('自创例子未通过：需要写出理由')
    } else if (evaluateA0Creative(draft.creative.category, draft.creative.reason)) {
      setCreativeFeedback('自创例子通过：有分类且有理由（理由只判定有无，不评价质量）')
    } else {
      setCreativeFeedback('自创例子未通过：需要选择分类并写出理由')
    }
  }

  return (
    <main data-testid="classify-lab" className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-xs font-bold tracking-widest text-indigo-700">实验试玩（非正式课程）</p>
      <h1 className="mt-2 text-2xl font-black text-slate-900">{a0u1L01.title}</h1>
      <p className="mt-2 leading-7 text-slate-700">{a0u1L01.story}</p>
      <p className="mt-2 leading-7 text-slate-700">分类规则：{a0u1L01.rule}。通过线：至少 {A0_U1_L01_PASS_THRESHOLD} 项分类正确且有理由。</p>
      <p className="mt-1 text-sm leading-6 text-slate-500">理由只判定有无，不评价理由质量；本试玩不保存正式成绩。</p>

      <section className="mt-6">
        <h2 className="text-lg font-black text-slate-900">给 6 种工具分类</h2>
        <div className="mt-3 flex flex-col gap-4">
          {a0u1L01.tools.map((tool) => (
            <article key={tool.id} data-testid={`classify-tool-${tool.id}`} className="rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="font-bold text-slate-900">{tool.name}</h3>
              {tool.source === 'implementer_example' ? (
                <p data-testid={`classify-tool-${tool.id}-source-note`} className="mt-1 text-xs text-slate-500">
                  示例工具（待教研复核，非详案原有内容）
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {BUCKETS.map((bucket) => {
                  const selected = draft.answers[tool.id]?.category === bucket.id
                  return (
                    <button
                      key={bucket.id}
                      type="button"
                      data-testid={`classify-tool-${tool.id}-bucket-${bucket.id}`}
                      aria-pressed={selected}
                      onClick={() => setTool(tool.id, { category: bucket.id })}
                      className={
                        selected
                          ? 'rounded-full bg-indigo-700 px-4 py-2 font-bold text-white'
                          : 'rounded-full border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700'
                      }
                    >
                      {bucket.label}
                    </button>
                  )
                })}
              </div>
              <textarea
                data-testid={`classify-tool-${tool.id}-reason`}
                value={draft.answers[tool.id]?.reason ?? ''}
                onChange={(event) => setTool(tool.id, { reason: event.target.value })}
                placeholder="写出你的理由（不能为空）"
                rows={2}
                className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
              />
              {toolFeedback(tool.id, evaluation) ? (
                <p data-testid={`classify-tool-${tool.id}-feedback`} className="mt-2 text-sm font-bold text-slate-800">
                  {toolFeedback(tool.id, evaluation)}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section data-testid="classify-counterexample" className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">反例辨析：会发声就是 AI 吗</h2>
        <p className="mt-2 text-slate-700">{A0_U1_L01_COUNTER_EXAMPLE.name}，请分类并写出理由。</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {BUCKETS.map((bucket) => {
            const selected = draft.counter.category === bucket.id
            return (
              <button
                key={bucket.id}
                type="button"
                data-testid={`classify-counterexample-bucket-${bucket.id}`}
                aria-pressed={selected}
                onClick={() => setDraft((prev) => ({ ...prev, counter: { ...prev.counter, category: bucket.id } }))}
                className={
                  selected
                    ? 'rounded-full bg-indigo-700 px-4 py-2 font-bold text-white'
                    : 'rounded-full border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700'
                }
              >
                {bucket.label}
              </button>
            )
          })}
        </div>
        <textarea
          data-testid="classify-counterexample-reason"
          value={draft.counter.reason}
          onChange={(event) => setDraft((prev) => ({ ...prev, counter: { ...prev.counter, reason: event.target.value } }))}
          placeholder="写出你的理由（不能为空）"
          rows={2}
          className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
        />
        {counterFeedback ? (
          <p data-testid="classify-counterexample-feedback" className="mt-2 text-sm font-bold text-slate-800">
            {counterFeedback}
          </p>
        ) : null}
      </section>

      <section className="mt-8 rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-black text-slate-900">我自己的一个例子</h2>
        <input
          data-testid="classify-creative-name"
          value={draft.creative.name}
          onChange={(event) => setDraft((prev) => ({ ...prev, creative: { ...prev.creative, name: event.target.value } }))}
          placeholder="写出一个课外工具的名称"
          className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          {BUCKETS.map((bucket) => {
            const selected = draft.creative.category === bucket.id
            return (
              <button
                key={bucket.id}
                type="button"
                data-testid={`classify-creative-bucket-${bucket.id}`}
                aria-pressed={selected}
                onClick={() => setDraft((prev) => ({ ...prev, creative: { ...prev.creative, category: bucket.id } }))}
                className={
                  selected
                    ? 'rounded-full bg-indigo-700 px-4 py-2 font-bold text-white'
                    : 'rounded-full border border-slate-300 bg-white px-4 py-2 font-bold text-slate-700'
                }
              >
                {bucket.label}
              </button>
            )
          })}
        </div>
        <textarea
          data-testid="classify-creative-reason"
          value={draft.creative.reason}
          onChange={(event) => setDraft((prev) => ({ ...prev, creative: { ...prev.creative, reason: event.target.value } }))}
          placeholder="写出你的理由（不能为空）"
          rows={2}
          className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-slate-900"
        />
        {creativeFeedback ? (
          <p data-testid="classify-creative-feedback" className="mt-2 text-sm font-bold text-slate-800">
            {creativeFeedback}
          </p>
        ) : null}
      </section>

      <button
        type="button"
        data-testid="classify-submit"
        onClick={handleSubmit}
        className="mt-8 rounded-full bg-indigo-700 px-6 py-3 font-bold text-white"
      >
        提交判定
      </button>
      {evaluation ? (
        <p data-testid="classify-result" className="mt-4 text-lg font-black text-slate-900">
          {evaluation.passed
            ? `通过：${evaluation.correctWithReason}/6 项分类有依据`
            : `未通过：${evaluation.correctWithReason}/6 项分类有依据，至少需要 5 项`}
        </p>
      ) : null}
    </main>
  )
}
