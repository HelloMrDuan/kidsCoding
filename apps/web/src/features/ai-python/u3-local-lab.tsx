'use client'

import { useState } from 'react'

import {
  ANSWERS_TO_CHECK,
  answerQuestion,
  checkCitationAnswer,
  checkSummary,
  CITATION_SOURCES,
  CORPUS_CARDS,
  evaluateGateCall,
  GATE_CASES,
  JSON_CASES,
  QA_PAIRS,
  RETRIEVAL_KEYWORDS,
  runQaDrill,
  scoreCards,
  summarizePassage,
  SUMMARY_PASSAGE,
  SUMMARY_POINTS,
  U3_PILOT_STAGE_TITLES,
  usableCards,
  validateFruitRecord,
  type QaAnswer,
  type QaLog,
} from './u3-local-engines'

const GATE_STEP_MARKS: Record<number, string> = {
  1: '①',
  2: '②',
  3: '③',
  4: '④',
  5: '⑤',
}

const GATE_SUB_CHECK_LABELS: Record<string, string> = {
  pii: '个人信息',
  sensitive: '敏感信息',
  age: '年龄适配',
  scope: '任务范围',
  length: '长度',
  injection: '防注入',
}

function sectionTitle(lessonId: string): string {
  return U3_PILOT_STAGE_TITLES[lessonId] ?? lessonId
}

export default function U3LocalLab({ lessonId }: { lessonId: string }) {
  const [gateCaseId, setGateCaseId] = useState('refuse-1')
  const [jsonCaseId, setJsonCaseId] = useState('ex3')
  const [answerCaseId, setAnswerCaseId] = useState('ans1')
  const [summaryVariant, setSummaryVariant] = useState<'real' | 'added' | 'digit'>('real')
  const [qaAnswer, setQaAnswer] = useState<QaAnswer | null>(null)
  const [qaLog, setQaLog] = useState<QaLog>({
    byCategory: { 事实类: 0, 方法类: 0, 超范围类: 0 },
    answered: 0,
    refused: 0,
  })

  const gateCase = GATE_CASES.find((c) => c.id === gateCaseId) ?? GATE_CASES[0]
  const gateVerdict = evaluateGateCall(gateCase.request)
  const jsonCase = JSON_CASES.find((c) => c.id === jsonCaseId) ?? JSON_CASES[0]
  const jsonVerdict = validateFruitRecord(jsonCase.record)
  const answerCase = ANSWERS_TO_CHECK.find((a) => a.id === answerCaseId) ?? ANSWERS_TO_CHECK[0]
  const citationVerdict = checkCitationAnswer(answerCase)
  const summary = summarizePassage()
  const summaryChecks =
    summaryVariant === 'real'
      ? checkSummary(summary)
      : summaryVariant === 'added'
        ? checkSummary({ sentences: [...summary.sentences, '香蕉是蓝色的。'], pointsCovered: summary.pointsCovered })
        : checkSummary({
            sentences: summary.sentences.map((s) => s.replace('后 2 条', '后 3 条')),
            pointsCovered: summary.pointsCovered,
          })
  const retrievalScores = scoreCards(RETRIEVAL_KEYWORDS)
  const drill = runQaDrill()

  function ask(questionText: string) {
    const result = answerQuestion(questionText)
    setQaAnswer(result)
    setQaLog((previous) => {
      const byCategory = { ...previous.byCategory }
      if (result.category !== null) byCategory[result.category] += 1
      return {
        byCategory,
        answered: previous.answered + (result.answered ? 1 : 0),
        refused: previous.refused + (result.answered ? 0 : 1),
      }
    })
  }

  return (
    <main data-testid="u3-local-lab" className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-slate-500">实验试玩（非正式课程）· 仅本地层 · 生成式环节等批</p>
      <h1 data-testid="u3-lesson-title" className="mt-2 text-2xl font-bold text-slate-900">
        {lessonId} {sectionTitle(lessonId)}
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        本页只演示 U3 的本地层：本地判定、本地校验、本地替代任务。所有输出由程序实时算出，不手填；
        不调用任何外部模型、不保存正式成绩；本页不代表课节已完成、已发布或已通过验证。
      </p>

      {lessonId === 'A1-U3-L01' && (
        <section className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">门禁五步 · 选一个调用情形</h2>
          <p className="mt-1 text-sm text-slate-600">
            教学演示会写明失败的门编号；生产网关（等批）只给通用拒绝文案，不泄露失败细节。
          </p>
          <label className="mt-3 block text-sm text-slate-700">
            调用情形
            <select
              data-testid="u3-gate-case"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              value={gateCaseId}
              onChange={(event) => setGateCaseId(event.target.value)}
            >
              {GATE_CASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div data-testid="u3-gate-output" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
            <p>判定：{gateVerdict.allowed ? '通过' : '拒绝'}</p>
            {!gateVerdict.allowed && gateVerdict.failedStep !== null && (
              <p>
                失败门：门禁{GATE_STEP_MARKS[gateVerdict.failedStep]}
                {gateVerdict.failedSubCheck ? `（${GATE_SUB_CHECK_LABELS[gateVerdict.failedSubCheck]}）` : ''}
              </p>
            )}
            {gateVerdict.refusal && <p>网关回复：{gateVerdict.refusal}</p>}
            <p>本地替代任务：{gateVerdict.localTask}</p>
          </div>
        </section>
      )}

      {lessonId === 'A1-U3-L02' && (
        <section className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">摘要三步法（新增合成课文）</h2>
          <p className="mt-1 text-sm text-slate-600">
            课文为试点新增合成数据，非真实教材；三步法：取每段主题句 → 按要点去重 → 按要点顺序输出。
          </p>
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {SUMMARY_PASSAGE.map((paragraph) => (
              <p key={paragraph.id}>
                <span className="font-semibold">
                  {paragraph.id}（要点 {paragraph.point}：{SUMMARY_POINTS[paragraph.point]}）
                </span>
                {paragraph.sentences.join('')}
              </p>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              data-testid="u3-summary-real"
              className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white"
              onClick={() => setSummaryVariant('real')}
            >
              生成摘要
            </button>
            <button
              data-testid="u3-summary-tamper-added"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              onClick={() => setSummaryVariant('added')}
            >
              演示：摘要添一句
            </button>
            <button
              data-testid="u3-summary-tamper-digit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700"
              onClick={() => setSummaryVariant('digit')}
            >
              演示：摘要改数字
            </button>
          </div>
          <div data-testid="u3-summary-checks" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
            <p className="font-semibold">摘要（{summary.sentences.length} 句）：</p>
            {summary.sentences.map((sentence) => (
              <p key={sentence}>{sentence}</p>
            ))}
            <p className="mt-2 font-semibold">三项对照检查：</p>
            {summaryChecks.map((check) => (
              <p key={check.name}>
                {check.name}：{check.passed ? '通过' : '失败'}——{check.detail}
              </p>
            ))}
          </div>
        </section>
      )}

      {lessonId === 'A1-U3-L03' && (
        <section className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">JSON 结构化校验 · 选一条记录</h2>
          <p className="mt-1 text-sm text-slate-600">
            Schema：名称（必填，苹果/香蕉/橙子）、颜色（必填，红/黄/绿/橙）、重量（必填数字，大于 0）、
            直径（可选数字，大于 0）。校验失败时本地模拟三步：不展示原始输出、重试一次计入审计、仍失败给通用提示。
            格式通过不等于内容正确，内容仍须按 L05 逐字核对。
          </p>
          <label className="mt-3 block text-sm text-slate-700">
            待校验记录
            <select
              data-testid="u3-json-case"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              value={jsonCaseId}
              onChange={(event) => setJsonCaseId(event.target.value)}
            >
              {JSON_CASES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div data-testid="u3-json-output" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
            <p>记录：{JSON.stringify(jsonCase.record)}</p>
            <p>判定：{jsonVerdict.passed ? '通过' : '失败'}</p>
            {!jsonVerdict.passed && <p>未通过的检查：{jsonVerdict.failedChecks.join('、')}</p>}
          </div>
        </section>
      )}

      {lessonId === 'A1-U3-L04' && (
        <section className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">检索可信资料（本地语料库 6 卡，新增合成数据）</h2>
          <p className="mt-1 text-sm text-slate-600">
            教师给定关键词：{RETRIEVAL_KEYWORDS.join('、')}。命中数是线索，可信度是门禁：
            来源、时间、证据、相关四问全过才可用，首个失败问即否决理由。
          </p>
          <div data-testid="u3-retrieval-output" className="mt-3 space-y-2 text-sm leading-6 text-slate-800">
            {retrievalScores.map((score) => (
              <p key={score.card.id}>
                卡 {score.card.id}《{score.card.标题}》：命中 {score.命中数} 次；
                {score.可用 ? '可用' : `不可用（${score.否决理由}）`}
              </p>
            ))}
            <p className="font-semibold">
              可用资料：{usableCards(retrievalScores).map((score) => `卡 ${score.card.id}`).join('、')}
            </p>
          </div>
          <div className="mt-3 space-y-1 text-sm text-slate-600">
            {CORPUS_CARDS.map((card) => (
              <p key={card.id}>
                卡 {card.id}：{card.标题}｜来源 {card.来源}｜时间 {card.时间}｜摘要：{card.摘要句}
              </p>
            ))}
          </div>
        </section>
      )}

      {lessonId === 'A1-U3-L05' && (
        <section className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">引用核对 · 选一条待核对回答</h2>
          <p className="mt-1 text-sm text-slate-600">
            原句锚点（U1 详案已验证事实）：{CITATION_SOURCES.map((s) => s.text).join(' ')}
            逐字核对三步：找原句、逐字比对、标出差异并改法。张冠李戴只作类型定义与示例，不在本页编造第 4 条判定。
          </p>
          <label className="mt-3 block text-sm text-slate-700">
            待核对回答
            <select
              data-testid="u3-answer-case"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              value={answerCaseId}
              onChange={(event) => setAnswerCaseId(event.target.value)}
            >
              {ANSWERS_TO_CHECK.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>
          <div data-testid="u3-citation-output" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
            <p>回答：{answerCase.text}</p>
            <p>
              判定：{citationVerdict.kind}
              {citationVerdict.passed ? '' : '（幻觉）'}
            </p>
            {citationVerdict.differences.map((difference) => (
              <p key={difference}>差异：{difference}</p>
            ))}
            <p>改法：{citationVerdict.fix}</p>
          </div>
        </section>
      )}

      {lessonId === 'A1-U3-L06' && (
        <section className="mt-6 rounded-[14px] border border-slate-200 bg-white p-4">
          <h2 className="text-lg font-semibold text-slate-900">学习问答助手（本地知识库 8 问，新增合成数据）</h2>
          <p className="mt-1 text-sm text-slate-600">
            分类：事实类 4、方法类 2、超范围类 2。匹配规则：关键词命中计分，最高者胜；
            超范围类无论命中与否一律拒答；无命中即拒答并导向课节目录。
          </p>
          <div data-testid="u3-qa-drill" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
            <p className="font-semibold">演练账目（程序跑出）：</p>
            <p>
              可答 {drill.log.answered}、拒答 {drill.log.refused}（拒答单独计数）；
              提问分布：事实类 {drill.log.byCategory['事实类']}、方法类 {drill.log.byCategory['方法类']}、
              超范围类 {drill.log.byCategory['超范围类']}
            </p>
          </div>
          <div className="mt-3 space-y-2">
            {QA_PAIRS.map((pair) => (
              <div key={pair.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3">
                <p className="text-sm leading-6 text-slate-800">
                  {pair.id}（{pair.category}）：{pair.question}
                </p>
                <button
                  data-testid={`u3-ask-${pair.id}`}
                  className="shrink-0 rounded-lg bg-indigo-700 px-3 py-1.5 text-sm font-semibold text-white"
                  onClick={() => ask(pair.question)}
                >
                  问
                </button>
              </div>
            ))}
          </div>
          {qaAnswer && (
            <div data-testid="u3-qa-answer" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
              <p>{qaAnswer.answered ? '回答' : '拒答'}：{qaAnswer.text}</p>
            </div>
          )}
          <div data-testid="u3-qa-log" className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-800">
            <p className="font-semibold">本次互动日志（只记类别与计数，不记问题原文、不记答案原文、不记学生身份）：</p>
            <p>
              已答 {qaLog.answered}、已拒答 {qaLog.refused}；提问分布：事实类 {qaLog.byCategory['事实类']}、
              方法类 {qaLog.byCategory['方法类']}、超范围类 {qaLog.byCategory['超范围类']}
            </p>
          </div>
        </section>
      )}

      <p className="mt-6 text-sm text-slate-500">
        生成式环节等批：以上六节的生成式实现（真实模型调用、服务端网关、外部资料联网）均不在本页，
        须待设计包阶段 3 五条批件齐备后另行开工。
      </p>
    </main>
  )
}
