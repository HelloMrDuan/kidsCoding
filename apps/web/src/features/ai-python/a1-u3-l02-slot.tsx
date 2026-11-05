'use client'

/**
 * A1-U3-L02 摘要编辑插槽：统一工作区的 EditorSlot。
 *
 * 外壳承担的部分（本文件不再有）：顶部标题与保存 chip、任务抽屉、
 * 三级提示、方法步骤、适用边界、文件菜单（新建/保存/导出/导入/
 * 恢复初始）、反馈容器外壳与三端布局。插槽只负责课程活动本身：
 * 课文阅读、五活动页签、检查按钮、判定明细、改后预测、错误解释、
 * 方法总结与草稿状态行。
 *
 * 数据流：外壳以 initial 传入信封解包后的草稿（或初始空草稿），
 * 插槽每次编辑都以 onChange 回传完整草稿；外壳负责 debounced 自动
 * 保存、课节切换先存后载与保存失败提示。插槽不写 localStorage。
 * 判定结果（summaryChecks 等）只放组件 state，不进草稿（外壳规则：
 * 判定永不写进草稿，恢复后须重新检查才出结果）。
 * 恢复初始走外壳文件菜单：外壳以新 key 重挂插槽，initial 回到空草稿。
 */
import { useState } from 'react'

import type { EditorSlotProps } from '../lessons/workspace/workspace-slots'
import { L02_CONTRACT, TRANSFER_PASSAGE, TRANSFER_POINTS } from './a1-u3-l02-contract'
import {
  BAD_SUMMARIES,
  FACT_STATEMENTS,
  GOOD_SUMMARY,
  PREDICTION_RESULTS,
  SUMMARY_PASSAGE,
  SUMMARY_POINTS,
  buildDraftSummary,
  buildTransferSummary,
  checkDraftSummary,
  checkTransferSummary,
  judgePrediction,
  type FactKind,
  type L02Check,
  type L02CheckName,
} from './a1-u3-l02'
import {
  MAX_CUSTOM_COUNT,
  MAX_CUSTOM_LENGTH,
  coerceDraft,
  type L02Draft,
} from './a1-u3-l02-draft'
import type { SummaryParagraph, SummaryPoint } from './u3-local-engines'

type Tab = 'predict' | 'independent' | 'transfer' | 'facts' | 'summary'

const TABS: { id: Tab; label: string }[] = [
  { id: 'predict', label: '第一层：探索预测' },
  { id: 'independent', label: '第二层：独立摘要' },
  { id: 'transfer', label: '第三层：迁移' },
  { id: 'facts', label: '事实核对' },
  { id: 'summary', label: '总结' },
]

const CHECK_NAMES: L02CheckName[] = ['漏要点', '添内容', '改原意', '抽取规范', '来源核验']

function CheckLines({ checks }: { checks: L02Check[] }) {
  return (
    <div className="mt-2 space-y-1">
      {checks.map((check) => (
        <p key={check.name} className="text-sm leading-7 text-[#18243a]">
          {check.name}：{check.passed ? '通过' : '失败'}——{check.detail}
        </p>
      ))}
      <p className="text-sm leading-7 text-[#6f7d92]">
        注意：改原意只做数字规则检查（数字在全文出现即通过），不能证明语义完全正确；完整核验以来源核验为准。
      </p>
    </div>
  )
}

/**
 * 三层判定呈现（规范 WORKSPACE-API 第三节）：检查结果、任务判定、
 * 方法证据三行分别呈现，不得混为一谈；任何位置不写“已掌握”。
 */
function JudgeBlock({
  checks,
  verdictTestId,
  sourcedCount,
  customCount,
  pointsCovered,
}: {
  checks: L02Check[]
  verdictTestId: string
  sourcedCount: number
  customCount: number
  pointsCovered: SummaryPoint[]
}) {
  const passed = checks.every((check) => check.passed)
  const failed = checks.filter((check) => !check.passed)
  return (
    <div className="mt-3 rounded-[14px] bg-[#f3f6fb] p-4">
      <p className="text-sm font-bold text-[#18243a]">检查结果：</p>
      <CheckLines checks={checks} />
      <p data-testid={verdictTestId} className="mt-2 text-sm font-bold text-[#18243a]">
        任务判定：
        {passed
          ? '合格：五项全部通过。'
          : `未合格：还有 ${failed.length} 项未通过（${failed.map((check) => check.name).join('、')}）。`}
      </p>
      <p className="text-sm leading-7 text-[#6f7d92]">
        方法证据：摘要共 {sourcedCount + customCount} 句，其中 {sourcedCount} 句来自课文原文
        {customCount > 0 ? `，${customCount} 句是自加句错误实验（不算摘录）` : '，无自加句'}；要点覆盖
        {pointsCovered.length > 0 ? ` ${pointsCovered.join('、')}` : ' 无'}。
      </p>
    </div>
  )
}

function PassagePanel({
  passage,
  points,
  testId,
  title,
  note,
}: {
  passage: SummaryParagraph[]
  points: Record<SummaryPoint, string>
  testId: string
  title: string
  note: string
}) {
  return (
    <section className="rounded-[14px] border border-[#e7edf5] bg-white p-4">
      <h2 className="text-lg font-black text-[#18243a]">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-[#6f7d92]">{note}</p>
      <div data-testid={testId} className="mt-3 space-y-3">
        {passage.map((paragraph) => (
          <p key={paragraph.id} className="text-sm leading-7 text-[#18243a]">
            <span className="font-bold">
              {paragraph.id}（要点 {paragraph.point}：{points[paragraph.point]}）
            </span>
            {paragraph.sentences.join('')}
          </p>
        ))}
      </div>
    </section>
  )
}

export function SummaryEditorSlot({ initial, onChange, editable }: EditorSlotProps) {
  const [draft, setDraft] = useState<L02Draft>(() => coerceDraft(initial))
  const [tab, setTab] = useState<Tab>('predict')
  const [summaryChecks, setSummaryChecks] = useState<L02Check[] | null>(null)
  const [transferChecks, setTransferChecks] = useState<L02Check[] | null>(null)
  const [factsChecked, setFactsChecked] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [customNotice, setCustomNotice] = useState<string | null>(null)
  const [predictNotice, setPredictNotice] = useState<Record<string, string>>({})
  const [postPredict, setPostPredict] = useState<'pass' | 'fail' | null>(null)
  const [postResult, setPostResult] = useState<string | null>(null)
  const [transferPostPredict, setTransferPostPredict] = useState<'pass' | 'fail' | null>(null)
  const [transferPostResult, setTransferPostResult] = useState<string | null>(null)

  // Every edit updates slot state and reports the full draft to the shell
  // via onChange; the shell owns autosave, save status and failure notice.
  function persist(next: L02Draft) {
    setDraft(next)
    onChange(next)
  }

  function toggleSentence(id: string) {
    const selected = draft.selected.includes(id)
      ? draft.selected.filter((item) => item !== id)
      : [...draft.selected, id]
    persist({ ...draft, selected })
    setSummaryChecks(null)
    setPostResult(null)
  }

  function toggleTransferSentence(id: string) {
    const selected = draft.transferSelected.includes(id)
      ? draft.transferSelected.filter((item) => item !== id)
      : [...draft.transferSelected, id]
    persist({ ...draft, transferSelected: selected })
    setTransferChecks(null)
    setTransferPostResult(null)
  }

  function addCustom() {
    const text = customInput.trim()
    if (text === '') return
    if (draft.custom.length >= MAX_CUSTOM_COUNT) {
      setCustomNotice(`自加句最多 ${MAX_CUSTOM_COUNT} 句，已达上限。`)
      return
    }
    if (text.length > MAX_CUSTOM_LENGTH) {
      setCustomNotice(`自加句过长（最多 ${MAX_CUSTOM_LENGTH} 字），请缩短后再加入。`)
      return
    }
    persist({ ...draft, custom: [...draft.custom, text] })
    setCustomInput('')
    setCustomNotice(null)
    setSummaryChecks(null)
    setPostResult(null)
  }

  function removeCustom(index: number) {
    persist({ ...draft, custom: draft.custom.filter((_, i) => i !== index) })
    setCustomNotice(null)
    setSummaryChecks(null)
    setPostResult(null)
  }

  function setFact(id: string, value: string) {
    persist({
      ...draft,
      facts: { ...draft.facts, [id]: value === '' ? undefined : (value as FactKind) },
    })
    setFactsChecked(false)
  }

  const draftSummary = buildDraftSummary(draft.selected, draft.custom)
  const transferSummary = buildTransferSummary(draft.transferSelected)
  const factScore = FACT_STATEMENTS.filter(
    (statement) => draft.facts[statement.id] === statement.kind,
  ).length
  function checkIndependent() {
    const checks = checkDraftSummary(draftSummary)
    if (postPredict !== null) {
      const actualPass = checks.every((check) => check.passed)
      setPostResult(
        (postPredict === 'pass') === actualPass
          ? '你猜对了：这次检查的结果和你预测的一样。'
          : '你没猜对：这次检查的结果和你预测的不一样，对照上面的检查结果想想差在哪一项。',
      )
      setPostPredict(null)
    }
    setSummaryChecks(checks)
    if (!draft.hasChecked) persist({ ...draft, hasChecked: true })
  }

  function checkTransfer() {
    const checks = checkTransferSummary(transferSummary)
    if (transferPostPredict !== null) {
      const actualPass = checks.every((check) => check.passed)
      setTransferPostResult(
        (transferPostPredict === 'pass') === actualPass
          ? '你猜对了：这次检查的结果和你预测的一样。'
          : '你没猜对：这次检查的结果和你预测的不一样，对照上面的检查结果想想差在哪一项。',
      )
      setTransferPostPredict(null)
    }
    setTransferChecks(checks)
    if (!draft.transferChecked) persist({ ...draft, transferChecked: true })
  }

  const passageForTab = tab === 'transfer' ? TRANSFER_PASSAGE : SUMMARY_PASSAGE
  const pointsForTab = tab === 'transfer' ? TRANSFER_POINTS : SUMMARY_POINTS

  if (!editable) {
    return (
      <div data-testid="ai-u3-l02-slot-readonly">
        <p className="text-sm leading-7 text-[#6f7d92]">
          只读模式：本课当前不可编辑，仅可阅读课文与已写摘要。
        </p>
        <PassagePanel
          passage={SUMMARY_PASSAGE}
          points={SUMMARY_POINTS}
          testId="ai-u3-l02-passage"
          title="课文全文（合成数据）"
          note="以下 5 段课文是试点新增合成数据，非真实教材；每段第一句是主题句；要点 A、B、C 标在段首。"
        />
        {draftSummary.sentences.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-sm font-bold text-[#18243a]">当前摘要：</p>
            {draftSummary.sentences.map((sentence, index) => (
              <p key={`${sentence}-${index}`} className="text-sm leading-7 text-[#18243a]">
                {sentence}
              </p>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div data-testid="ai-u3-l02-slot">
      <p className="rounded-[14px] border border-[#e7edf5] bg-white p-4 text-sm leading-7 text-[#6f7d92]">
        课程开发中（未发布、未通过独立复核）。本课复用 U3 本地试点已发表的合成课文与本地判定引擎，不调用外部模型。
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="学习活动">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            data-testid={`ai-u3-l02-tab-${item.id}`}
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? 'rounded-[14px] bg-[#2463eb] px-4 py-2 text-sm font-bold text-white'
                : 'rounded-[14px] border border-[#e7edf5] bg-white px-4 py-2 text-sm text-[#18243a]'
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {tab !== 'summary' && (
          <PassagePanel
            passage={passageForTab}
            points={pointsForTab}
            testId={tab === 'transfer' ? 'ai-u3-l02-transfer-passage' : 'ai-u3-l02-passage'}
            title={tab === 'transfer' ? '迁移课文（合成数据）' : '课文全文（合成数据）'}
            note={
              tab === 'transfer'
                ? '这篇是新课文：主题是整理书包，与主课文完全不同；每段第一句仍是主题句，要点仍是 A、B、C。'
                : '以下 5 段课文是试点新增合成数据，非真实教材；每段第一句是主题句；要点 A、B、C 标在段首。'
            }
          />
        )}

        <section
          className={`rounded-[14px] border border-[#e7edf5] bg-white p-4 ${tab === 'summary' ? 'lg:col-span-2' : ''}`}
        >
          {tab === 'predict' && (
            <div>
              <h2 className="text-lg font-black text-[#18243a]">先猜，再看结果</h2>
              <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
                下面三份候选摘要都是本地引擎算出来的真结果，不是手填的。先给每份猜一个结果：合格，还是未合格、以及最先违反哪一项；再点“揭示结果”对照。猜错没关系，猜的过程就是在学检查规则。
              </p>
              <div className="mt-3 space-y-4">
                {PREDICTION_RESULTS.map((item) => {
                  const prediction = draft.predictions[item.candidate.id]
                  const revealed = draft.revealed.includes(item.candidate.id)
                  return (
                    <div key={item.candidate.id} className="rounded-[14px] border border-[#e7edf5] p-4">
                      <p className="text-sm font-bold text-[#18243a]">{item.candidate.label}</p>
                      {item.summary.sentences.map((sentence) => (
                        <p key={sentence} className="text-sm leading-7 text-[#18243a]">
                          {sentence}
                        </p>
                      ))}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <select
                          data-testid={`ai-u3-l02-predict-verdict-${item.candidate.id}`}
                          value={prediction?.verdict ?? ''}
                          onChange={(event) => {
                            const verdict = event.target.value
                            persist({
                              ...draft,
                              predictions: {
                                ...draft.predictions,
                                [item.candidate.id]:
                                  verdict === ''
                                    ? undefined
                                    : { verdict: verdict as '合格' | '未合格', firstFailed: prediction?.firstFailed ?? '' },
                              },
                            })
                          }}
                          className="rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
                        >
                          <option value="">预测：合格还是未合格？</option>
                          <option value="合格">合格</option>
                          <option value="未合格">未合格</option>
                        </select>
                        <select
                          data-testid={`ai-u3-l02-predict-failed-${item.candidate.id}`}
                          value={prediction?.firstFailed ?? ''}
                          onChange={(event) => {
                            if (!prediction) return
                            persist({
                              ...draft,
                              predictions: {
                                ...draft.predictions,
                                [item.candidate.id]: {
                                  verdict: prediction.verdict,
                                  firstFailed: event.target.value as L02CheckName | '',
                                },
                              },
                            })
                          }}
                          className="rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
                        >
                          <option value="">如果未合格，最先违反哪一项？</option>
                          {CHECK_NAMES.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          data-testid={`ai-u3-l02-reveal-${item.candidate.id}`}
                          onClick={() => {
                            if (!prediction) {
                              setPredictNotice((prev) => ({
                                ...prev,
                                [item.candidate.id]: '先写下你的预测，再揭示结果。',
                              }))
                              return
                            }
                            setPredictNotice((prev) => ({ ...prev, [item.candidate.id]: '' }))
                            if (!revealed) {
                              persist({ ...draft, revealed: [...draft.revealed, item.candidate.id] })
                            }
                          }}
                          className="rounded-[14px] bg-[#2463eb] px-4 py-2 text-sm font-bold text-white"
                        >
                          揭示结果
                        </button>
                      </div>
                      {predictNotice[item.candidate.id] !== '' && predictNotice[item.candidate.id] !== undefined && (
                        <p className="mt-1 text-sm leading-7 text-[#d64c4c]">{predictNotice[item.candidate.id]}</p>
                      )}
                      {revealed && (
                        <div data-testid={`ai-u3-l02-predict-result-${item.candidate.id}`} className="mt-3">
                          <CheckLines checks={item.checks} />
                          <p className="mt-2 text-sm font-bold text-[#18243a]">
                            真实结果：{item.passed ? '合格。' : `未合格（${item.failedNames.join('、')}）。`}
                          </p>
                          {prediction && (
                            <p className="mt-1 text-sm leading-7 text-[#18243a]">
                              {judgePrediction(item, prediction.verdict, prediction.firstFailed)
                                ? '你猜对了。'
                                : '你没猜对，对照上面的检查结果想想差在哪一项。'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {tab === 'independent' && (
            <div>
              <h2 className="text-lg font-black text-[#18243a]">自己写摘要</h2>
              <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
                只给你课文、目标和工具，不提前给完整答案。勾选进摘要的句子，也可自加一句自己的话；点“检查摘要”看五项检查，最终合格必须五项全部通过。本课 3 个要点，标准摘要 3 句；全文照搬、要点重复、无来源的句子都会被判违规。
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
                  placeholder={`自加一句自己的话（最多 ${MAX_CUSTOM_LENGTH} 字、共最多 ${MAX_CUSTOM_COUNT} 句）`}
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
                自加句是用来练习识别添内容与来源不明的错误实验；抽取式摘要不接受无来源的自加句作为合格答案。
              </p>
              <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
                试试触发错误：自加一句原文没有的话看添内容，自加一句带新数字的话看改原意。
              </p>
              {customNotice !== null && (
                <p data-testid="ai-u3-l02-custom-notice" className="mt-1 text-sm leading-7 text-[#d64c4c]">
                  {customNotice}
                </p>
              )}
              {draftSummary.entries.length > 0 && (
                <div data-testid="ai-u3-l02-entries" className="mt-3 space-y-1 rounded-[14px] bg-[#f3f6fb] p-4">
                  <p className="text-sm font-bold text-[#18243a]">当前摘要条目：</p>
                  {draftSummary.entries
                    .filter((entry) => entry.sourceId !== null)
                    .map((entry) => (
                      <p
                        key={entry.sourceId as string}
                        className="flex items-start justify-between gap-2 text-sm leading-7 text-[#18243a]"
                      >
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
                    <p
                      key={`custom-${index}`}
                      className="flex items-start justify-between gap-2 text-sm leading-7 text-[#18243a]"
                    >
                      <span>自加：{text}</span>
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
              {draft.hasChecked && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm leading-7 text-[#18243a]">改完先猜：这次能全过吗？</span>
                  <select
                    data-testid="ai-u3-l02-post-predict"
                    value={postPredict ?? ''}
                    onChange={(event) =>
                      setPostPredict(event.target.value === '' ? null : (event.target.value as 'pass' | 'fail'))
                    }
                    className="rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
                  >
                    <option value="">先改，再猜</option>
                    <option value="pass">会全过</option>
                    <option value="fail">还有问题</option>
                  </select>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="ai-u3-l02-check-summary"
                  onClick={checkIndependent}
                  className="rounded-[14px] bg-[#2463eb] px-6 py-2 text-sm font-bold text-white"
                >
                  检查摘要
                </button>
              </div>
              {postResult !== null && (
                <p data-testid="ai-u3-l02-post-predict-result" className="mt-2 text-sm leading-7 text-[#18243a]">
                  {postResult}
                </p>
              )}
              {summaryChecks !== null && (
                <div data-testid="ai-u3-l02-summary-checks">
                  <p className="mt-3 text-sm font-bold text-[#18243a]">
                    你的摘要（{draftSummary.sentences.length} 句）：
                  </p>
                  {draftSummary.sentences.map((sentence, index) => (
                    <p key={`${sentence}-${index}`} className="text-sm leading-7 text-[#18243a]">
                      {sentence}
                    </p>
                  ))}
                  <JudgeBlock
                    checks={summaryChecks}
                    verdictTestId="ai-u3-l02-summary-verdict"
                    sourcedCount={draftSummary.entries.filter((entry) => entry.sourceId !== null).length}
                    customCount={draft.custom.length}
                    pointsCovered={draftSummary.pointsCovered}
                  />
                  {summaryChecks.some((check) => !check.passed) && (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm font-bold text-[#18243a]">
                        解释一个错误：挑一项未通过的检查，用自己的话写写为什么错。
                      </p>
                      {summaryChecks
                        .filter((check) => !check.passed)
                        .map((check) => (
                          <label key={check.name} className="block text-sm leading-7 text-[#18243a]">
                            {check.name}：{check.detail}
                            <input
                              type="text"
                              data-testid={`ai-u3-l02-explain-${check.name}`}
                              value={draft.errorExplanations[check.name] ?? ''}
                              onChange={(event) =>
                                persist({
                                  ...draft,
                                  errorExplanations: { ...draft.errorExplanations, [check.name]: event.target.value },
                                })
                              }
                              placeholder="用自己的话写为什么错"
                              className="mt-1 w-full rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
                            />
                          </label>
                        ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-6">
                <h3 className="text-lg font-black text-[#18243a]">正反例：对照着看</h3>
                {!draft.hasChecked ? (
                  <p
                    data-testid="ai-u3-l02-examples-locked"
                    className="mt-2 text-sm leading-7 text-[#6f7d92]"
                  >
                    先自己选一次、点“检查摘要”，再看正反例对照——独立做过一次，对照才有意义。
                  </p>
                ) : (
                  <div className="mt-3 space-y-4">
                    <p className="text-sm leading-7 text-[#6f7d92]">
                      好摘要与三类坏摘要的检查结果都由本地引擎实算，不是手填的。
                    </p>
                    {[GOOD_SUMMARY, ...BAD_SUMMARIES].map((example) => (
                      <div key={example.id} className="rounded-[14px] border border-[#e7edf5] p-4">
                        <p className="text-sm font-bold text-[#18243a]">{example.label}</p>
                        {example.result.sentences.map((sentence) => (
                          <p key={sentence} className="text-sm leading-7 text-[#18243a]">
                            {sentence}
                          </p>
                        ))}
                        <CheckLines checks={example.checks} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'transfer' && (
            <div>
              <h2 className="text-lg font-black text-[#18243a]">换一篇课文，再写一次</h2>
              <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
                方法不变，课文换了：找每段第一句（主题句）、同一要点只留一句、按 A → B → C
                的顺序排。没有参考答案，自己把方法搬过来；点“检查迁移摘要”看同一套五项检查。
              </p>
              <div className="mt-3 space-y-2">
                {TRANSFER_PASSAGE.map((paragraph) =>
                  paragraph.sentences.map((sentence, index) => {
                    const id = `${paragraph.id}-${index + 1}`
                    return (
                      <label key={id} className="flex items-start gap-2 text-sm leading-7 text-[#18243a]">
                        <input
                          type="checkbox"
                          data-testid={`ai-u3-l02-transfer-pick-${id}`}
                          checked={draft.transferSelected.includes(id)}
                          onChange={() => toggleTransferSentence(id)}
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
              {transferSummary.entries.length > 0 && (
                <div data-testid="ai-u3-l02-transfer-entries" className="mt-3 space-y-1 rounded-[14px] bg-[#f3f6fb] p-4">
                  <p className="text-sm font-bold text-[#18243a]">迁移摘要条目：</p>
                  {transferSummary.entries.map((entry) => (
                    <p
                      key={entry.sourceId as string}
                      className="flex items-start justify-between gap-2 text-sm leading-7 text-[#18243a]"
                    >
                      <span>
                        {entry.sourceId}：{entry.text}
                      </span>
                      <button
                        type="button"
                        data-testid={`ai-u3-l02-transfer-remove-${entry.sourceId}`}
                        onClick={() => toggleTransferSentence(entry.sourceId as string)}
                        className="shrink-0 text-[#6f7d92]"
                      >
                        移除
                      </button>
                    </p>
                  ))}
                </div>
              )}
              {draft.transferChecked && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm leading-7 text-[#18243a]">改完先猜：这次能全过吗？</span>
                  <select
                    data-testid="ai-u3-l02-transfer-post-predict"
                    value={transferPostPredict ?? ''}
                    onChange={(event) =>
                      setTransferPostPredict(event.target.value === '' ? null : (event.target.value as 'pass' | 'fail'))
                    }
                    className="rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
                  >
                    <option value="">先改，再猜</option>
                    <option value="pass">会全过</option>
                    <option value="fail">还有问题</option>
                  </select>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="ai-u3-l02-transfer-check"
                  onClick={checkTransfer}
                  className="rounded-[14px] bg-[#2463eb] px-6 py-2 text-sm font-bold text-white"
                >
                  检查迁移摘要
                </button>
              </div>
              {transferPostResult !== null && (
                <p data-testid="ai-u3-l02-transfer-post-predict-result" className="mt-2 text-sm leading-7 text-[#18243a]">
                  {transferPostResult}
                </p>
              )}
              {transferChecks !== null && (
                <div data-testid="ai-u3-l02-transfer-checks">
                  <p className="mt-3 text-sm font-bold text-[#18243a]">
                    你的迁移摘要（{transferSummary.sentences.length} 句）：
                  </p>
                  {transferSummary.sentences.map((sentence, index) => (
                    <p key={`${sentence}-${index}`} className="text-sm leading-7 text-[#18243a]">
                      {sentence}
                    </p>
                  ))}
                  <JudgeBlock
                    checks={transferChecks}
                    verdictTestId="ai-u3-l02-transfer-verdict"
                    sourcedCount={transferSummary.entries.length}
                    customCount={0}
                    pointsCovered={transferSummary.pointsCovered}
                  />
                </div>
              )}
            </div>
          )}

          {tab === 'facts' && (
            <div>
              <h2 className="text-lg font-black text-[#18243a]">事实核对</h2>
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
                      <p
                        data-testid={`ai-u3-l02-fact-result-${statement.id}`}
                        className="mt-1 text-sm leading-7 text-[#18243a]"
                      >
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
            </div>
          )}

          {tab === 'summary' && (
            <div>
              <h2 className="text-lg font-black text-[#18243a]">本课总结</h2>
              <p className="mt-1 text-sm leading-7 text-[#6f7d92]">
                只针对本课：忠实摘要 = 只写原文有的要点，不添不改；方法三步是找主题句、删重复、按要点重组；检查五项是漏要点、添内容、改原意、抽取规范、来源核验。
              </p>
              <ul className="mt-2 space-y-1">
                {L02_CONTRACT.methodSteps.map((step) => (
                  <li key={step} className="text-sm leading-7 text-[#18243a]">
                    {step}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-7 text-[#6f7d92]">
                一次检查全过只表示本次摘要合格，不等于完全掌握；换一篇课文还能写对，才算真正会了。生成式摘要只一句话方向，本课不调用外部模型；清除浏览器数据会丢草稿。
              </p>
              <label className="mt-3 block text-sm leading-7 text-[#18243a]">
                用一句话写下你学会的摘要方法：
                <input
                  type="text"
                  data-testid="ai-u3-l02-method-summary"
                  value={draft.methodSummary}
                  onChange={(event) => persist({ ...draft, methodSummary: event.target.value })}
                  placeholder="例如：先找每段第一句，同一要点只留一句，再按要点顺序排。"
                  className="mt-1 w-full rounded-[14px] border border-[#e7edf5] bg-white px-3 py-2 text-sm text-[#18243a]"
                />
              </label>
              <p data-testid="ai-u3-l02-draft-status" className="mt-3 text-sm leading-7 text-[#6f7d92]">
                本机草稿状态：已选 {draft.selected.length} 句，自加 {draft.custom.length} 句；迁移已选{' '}
                {draft.transferSelected.length} 句；事实核对已选 {Object.values(draft.facts).filter(Boolean).length} /{' '}
                {FACT_STATEMENTS.length} 条；预测已揭示 {draft.revealed.length} / 3 份；提示已揭示到{' '}
                {draft.hintLevel === 0 ? '未揭示' : `${draft.hintLevel} 级`}；方法总结
                {draft.methodSummary.trim() !== '' ? '已写' : '未写'}。
              </p>
              <p className="mt-2 text-sm leading-7 text-[#6f7d92]">
                要清空全部选择，用顶部文件菜单里的“恢复初始”。
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
