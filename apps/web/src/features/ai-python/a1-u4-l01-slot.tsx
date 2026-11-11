/**
 * A1-U4-L01 提出校园真实问题编辑器插槽（L01EditorSlot）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md
 * 与 L06 的插槽打法。外壳只负责布局、抽屉、文件菜单与自动保存；
 * 探索分类、问题卡、可行性检查、迁移、成绩题、判定与作品总结全部在本插槽。
 *
 * 与 L06 的插槽差别（本课没有问答引擎）：
 * - 没有提问预测与助手回应：探索是分类六条问题描述，分类后揭示原因；
 * - 没有错误示例归类：禁题（个人记录类）就是探索里的 V2，分类错即揭示原因；
 * - 迁移不是写新问题：选一个新校园场景，重写三句问题陈述，再答成绩题。
 *
 * 本课新增的 testid（E2E 与单测对应）：
 * ai-u4-l01-explore-{E1|E2|E3|V1|V2|V3} / ai-u4-l01-explore-{id}-{valid|vague} /
 * ai-u4-l01-choose-{E1|E2|E3} / ai-u4-l01-stmt-target|data|success /
 * ai-u4-l01-feas-{Q1|Q2|Q3|Q4}-{pass|fail} / ai-u4-l01-feas-note-{Q1|Q2|Q3|Q4} /
 * ai-u4-l01-transfer-{T1|T2} / ai-u4-l01-transfer-target|data|success /
 * ai-u4-l01-grades-{A|B|C} / ai-u4-l01-check / ai-u4-l01-result /
 * ai-u4-l01-verdict / ai-u4-l01-work / ai-u4-l01-draft-status。
 *
 * 判定三层分离：插槽内只展示本次核对的判定（探索逐项 + 结论 +
 * 方法证据），不写表示完全掌握的字样；编辑后旧判定失效，须重新点“核对本课”。
 * 草稿状态行只显示已分类数与问题卡完成情况，不显示 hintLevel（外壳抽屉揭示态
 * 不回写草稿，旧 L02 教训：插槽不得显示它无法更新的计数）。
 * 隐私红线：本课不收集、不上传任何真实校园数据；不要求输入真实个人信息；
 * 涉及个人记录的题目不能当课堂题目，界面明示请换题。
 */

'use client'

import { useRef, useState } from 'react'
import type { EditorSlotProps, JudgmentResult } from '../lessons/workspace/workspace-slots'
import { buildL01Judgment } from './a1-u4-l01-adapter'
import { coerceDraft, type L01Draft } from './a1-u4-l01-draft'
import {
  EXPLORE_ITEMS,
  FEASIBILITY_QUESTIONS,
  GRADES_QUESTION,
  MAX_NOTE_LENGTH,
  MAX_STATEMENT_LENGTH,
  PROBLEM_EXAMPLES,
  TRANSFER_SCENARIOS,
  checkL01,
  type ExploreClassification,
  type FeasibilityAnswer,
  type GradesOption,
  type L01CheckResult,
  type ProblemExampleId,
  type TransferScenarioId,
} from './a1-u4-l01'

export type L01SlotProps = EditorSlotProps & {
  /**
   * 判定上报（#481 课程侧一半，OPS-025 通道）。核对本课时上报三层判定，
   * 编辑后上报 null 使旧判定失效。外壳尚未接 onJudgment 时该回调恒为
   * undefined，插槽行为不变（判定仍在插槽内展示）。
   */
  onJudgment?: (judgment: JudgmentResult | null) => void
}

export function L01EditorSlot({ initial, onChange, editable, onJudgment }: L01SlotProps) {
  const [draft, setDraft] = useState<L01Draft>(() => coerceDraft(initial))
  const [result, setResult] = useState<L01CheckResult | null>(null)
  const lastReportedRef = useRef(false)

  function persist(next: L01Draft) {
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

  /** 编辑后：清核对结果并使旧判定失效。 */
  function edit(next: L01Draft) {
    persist(next)
    setResult(null)
    invalidateJudgment()
  }

  function classify(itemId: string, kind: ExploreClassification) {
    if (draft.explore[itemId] === kind) return
    edit({ ...draft, explore: { ...draft.explore, [itemId]: kind } })
  }

  function chooseExample(exampleId: ProblemExampleId) {
    if (draft.chosenExample === exampleId) return
    edit({ ...draft, chosenExample: exampleId })
  }

  function setStatement(field: 'target' | 'data' | 'success', value: string) {
    if (draft.statement[field] === value) return
    edit({ ...draft, statement: { ...draft.statement, [field]: value } })
  }

  function answerFeasibility(questionId: string, answer: FeasibilityAnswer) {
    if (draft.feasibility[questionId] === answer) return
    edit({ ...draft, feasibility: { ...draft.feasibility, [questionId]: answer } })
  }

  function setFeasibilityNote(questionId: string, value: string) {
    if (draft.feasibilityNotes[questionId] === value) return
    edit({
      ...draft,
      feasibilityNotes: { ...draft.feasibilityNotes, [questionId]: value },
    })
  }

  function chooseTransfer(scenarioId: TransferScenarioId) {
    if (draft.transferScenario === scenarioId) return
    edit({ ...draft, transferScenario: scenarioId })
  }

  function setTransferStatement(field: 'target' | 'data' | 'success', value: string) {
    if (draft.transferStatement[field] === value) return
    edit({ ...draft, transferStatement: { ...draft.transferStatement, [field]: value } })
  }

  function answerGrades(option: GradesOption) {
    if (draft.gradesAnswer === option) return
    edit({ ...draft, gradesAnswer: option })
  }

  function check() {
    const next = checkL01(draft)
    setResult(next)
    lastReportedRef.current = true
    onJudgment?.(buildL01Judgment(next, draft))
  }

  const judgment = result ? buildL01Judgment(result, draft) : null
  const classifiedCount = EXPLORE_ITEMS.filter(
    (item) => draft.explore[item.id] !== undefined,
  ).length

  if (!editable) {
    return (
      <div className="kc-stack" data-testid="ai-u4-l01-slot-readonly">
        <p>本课为只读预览：先看六条问题描述，再看当前分类与问题卡。</p>
        {EXPLORE_ITEMS.map((item) => (
          <div key={item.id}>
            <p>
              {item.id}：{item.text}
            </p>
            {draft.explore[item.id] !== undefined && <p>已分类：{draft.explore[item.id]}</p>}
          </div>
        ))}
        {draft.chosenExample !== null && (
          <p>
            已选讨论例：{draft.chosenExample}
            {draft.statement.target ? `——${draft.statement.target}` : ''}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="kc-stack">
      <p>
        本课不收集、不上传任何真实校园数据；不要求输入真实个人信息。
        校园真实问题不等于真实校园数据：课堂上只用聚合计数，不拿真实学生记录当课上数据。
      </p>

      <h3>探索：这六条描述，哪些是有效问题？</h3>
      <p>
        比较具体问题与模糊需求：有效问题要能说清“要判断什么、用什么数据、
        做到什么样算有用”。涉及个人记录的题目不能当课堂题目，请换题。
      </p>
      {EXPLORE_ITEMS.map((item) => {
        const picked = draft.explore[item.id] ?? null
        return (
          <div key={item.id} data-testid={`ai-u4-l01-explore-${item.id}`}>
            <p>
              {item.id}：{item.text}
            </p>
            <div>
              <button
                type="button"
                data-testid={`ai-u4-l01-explore-${item.id}-valid`}
                aria-pressed={picked === '有效'}
                onClick={() => classify(item.id, '有效')}
              >
                有效
              </button>
              <button
                type="button"
                data-testid={`ai-u4-l01-explore-${item.id}-vague`}
                aria-pressed={picked === '模糊'}
                onClick={() => classify(item.id, '模糊')}
              >
                模糊
              </button>
            </div>
            {picked !== null && (
              <p>{picked === item.kind ? `分类正确：${item.reason}` : `分类错了：${item.reason}`}</p>
            )}
          </div>
        )
      })}

      <h3>独立练习：填一张校园问题卡</h3>
      <p>从三例中选一例，写出三句问题陈述，再做四问可行性检查。</p>
      <div>
        {PROBLEM_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            data-testid={`ai-u4-l01-choose-${example.id}`}
            aria-pressed={draft.chosenExample === example.id}
            onClick={() => chooseExample(example.id)}
          >
            {example.id}：{example.title}
          </button>
        ))}
      </div>
      {draft.chosenExample !== null && (
        <p>
          已选：
          {PROBLEM_EXAMPLES.find((example) => example.id === draft.chosenExample)?.title}
          ——{PROBLEM_EXAMPLES.find((example) => example.id === draft.chosenExample)?.target}；
          数据：{PROBLEM_EXAMPLES.find((example) => example.id === draft.chosenExample)?.data}。
        </p>
      )}
      <label htmlFor="a1-u4-l01-stmt-target">要判断什么（1–200 字）</label>
      <input
        id="a1-u4-l01-stmt-target"
        data-testid="ai-u4-l01-stmt-target"
        value={draft.statement.target}
        maxLength={MAX_STATEMENT_LENGTH}
        onChange={(event) => setStatement('target', event.target.value)}
        placeholder="例如：哪类菜品剩得多"
      />
      <label htmlFor="a1-u4-l01-stmt-data">用什么数据（1–200 字）</label>
      <input
        id="a1-u4-l01-stmt-data"
        data-testid="ai-u4-l01-stmt-data"
        value={draft.statement.data}
        maxLength={MAX_STATEMENT_LENGTH}
        onChange={(event) => setStatement('data', event.target.value)}
        placeholder="例如：每日各窗口剩菜总重量"
      />
      <label htmlFor="a1-u4-l01-stmt-success">做到什么样算有用（1–200 字）</label>
      <input
        id="a1-u4-l01-stmt-success"
        data-testid="ai-u4-l01-stmt-success"
        value={draft.statement.success}
        maxLength={MAX_STATEMENT_LENGTH}
        onChange={(event) => setStatement('success', event.target.value)}
        placeholder="例如：剩菜最多的两类菜品报对"
      />

      <h3>可行性检查四问</h3>
      <p>缺一即不可行，须换题或缩题；写出不可行点不丢人，硬上不可行的题才丢人。</p>
      {FEASIBILITY_QUESTIONS.map((question) => {
        const answer = draft.feasibility[question.id] ?? null
        return (
          <div key={question.id}>
            <p>
              {question.id}：{question.text}
            </p>
            <div>
              <button
                type="button"
                data-testid={`ai-u4-l01-feas-${question.id}-pass`}
                aria-pressed={answer === '通过'}
                onClick={() => answerFeasibility(question.id, '通过')}
              >
                通过
              </button>
              <button
                type="button"
                data-testid={`ai-u4-l01-feas-${question.id}-fail`}
                aria-pressed={answer === '不可行'}
                onClick={() => answerFeasibility(question.id, '不可行')}
              >
                不可行
              </button>
            </div>
            <label htmlFor={`a1-u4-l01-feas-note-${question.id}`}>
              备注（可选，最多 100 字）
            </label>
            <input
              id={`a1-u4-l01-feas-note-${question.id}`}
              data-testid={`ai-u4-l01-feas-note-${question.id}`}
              value={draft.feasibilityNotes[question.id] ?? ''}
              maxLength={MAX_NOTE_LENGTH}
              onChange={(event) => setFeasibilityNote(question.id, event.target.value)}
              placeholder="例如：数据是聚合计数，拿得到"
            />
          </div>
        )
      })}

      <h3>迁移：换一个校园场景，重新分析</h3>
      <p>选一个新场景，重写三句话，再答成绩题：个人记录类题目为什么不能当课堂题目。</p>
      <div>
        {TRANSFER_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            data-testid={`ai-u4-l01-transfer-${scenario.id}`}
            aria-pressed={draft.transferScenario === scenario.id}
            onClick={() => chooseTransfer(scenario.id)}
          >
            {scenario.id}：{scenario.title}
          </button>
        ))}
      </div>
      {draft.transferScenario !== null && (
        <p>
          已选：
          {TRANSFER_SCENARIOS.find((scenario) => scenario.id === draft.transferScenario)?.title}
          ——
          {TRANSFER_SCENARIOS.find((scenario) => scenario.id === draft.transferScenario)?.target}；
          数据：
          {TRANSFER_SCENARIOS.find((scenario) => scenario.id === draft.transferScenario)?.data}。
        </p>
      )}
      <label htmlFor="a1-u4-l01-transfer-target">要判断什么（1–200 字）</label>
      <input
        id="a1-u4-l01-transfer-target"
        data-testid="ai-u4-l01-transfer-target"
        value={draft.transferStatement.target}
        maxLength={MAX_STATEMENT_LENGTH}
        onChange={(event) => setTransferStatement('target', event.target.value)}
        placeholder="例如：哪种器材最常被借空"
      />
      <label htmlFor="a1-u4-l01-transfer-data">用什么数据（1–200 字）</label>
      <input
        id="a1-u4-l01-transfer-data"
        data-testid="ai-u4-l01-transfer-data"
        value={draft.transferStatement.data}
        maxLength={MAX_STATEMENT_LENGTH}
        onChange={(event) => setTransferStatement('data', event.target.value)}
        placeholder="例如：各器材每日借出次数"
      />
      <label htmlFor="a1-u4-l01-transfer-success">做到什么样算有用（1–200 字）</label>
      <input
        id="a1-u4-l01-transfer-success"
        data-testid="ai-u4-l01-transfer-success"
        value={draft.transferStatement.success}
        maxLength={MAX_STATEMENT_LENGTH}
        onChange={(event) => setTransferStatement('success', event.target.value)}
        placeholder="例如：最常被借空的两种器材报对"
      />

      <p>{GRADES_QUESTION.question}</p>
      <div>
        {GRADES_QUESTION.options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`ai-u4-l01-grades-${option.id}`}
            aria-pressed={draft.gradesAnswer === option.id}
            onClick={() => answerGrades(option.id)}
          >
            {option.id}．{option.text}
          </button>
        ))}
      </div>
      {draft.gradesAnswer !== null && (
        <p>
          {draft.gradesAnswer === GRADES_QUESTION.answer
            ? GRADES_QUESTION.correctFeedback
            : GRADES_QUESTION.wrongFeedback}
        </p>
      )}

      <button type="button" data-testid="ai-u4-l01-check" onClick={check}>
        核对本课
      </button>

      {result && judgment && (
        <div data-testid="ai-u4-l01-result">
          <ul>
            {result.explore.checks.map((check) => (
              <li key={check.id}>
                {check.id}：{check.passed ? '通过' : '未通过'}——{check.detail}
              </li>
            ))}
          </ul>
          <p>{result.problemCard.detail}</p>
          <p>{result.transfer.detail}</p>
          <p data-testid="ai-u4-l01-verdict">{judgment.layers[1].detail}</p>
          <p>{judgment.conclusion}</p>
          <p>{judgment.methodEvidence}</p>
        </div>
      )}

      {result?.passed && (
        <div data-testid="ai-u4-l01-work">
          <h3>作品总结</h3>
          <p>
            你的校园问题卡已通过核对：探索分类 {result.explore.passedCount}/6，
            问题卡三句齐全、可行性检查 {result.problemCard.feasibilityAnsweredCount}/4，
            迁移场景 1 个。问题卡全过只表示本次课堂练习合格，不等于能直接做真实校园项目；
            真实项目还须过 L02 许可清单与教师确认。
          </p>
        </div>
      )}

      {result && !result.passed && <p>先修到全部通过：改分类、补三句话、答完四问、再点“核对本课”。</p>}

      <p data-testid="ai-u4-l01-draft-status">
        本机草稿状态：已分类 {classifiedCount}/6，
        {draft.chosenExample !== null ? '已选讨论例' : '未选讨论例'}，
        可行性检查已答{' '}
        {FEASIBILITY_QUESTIONS.filter((question) => draft.feasibility[question.id] !== undefined).length}
        /4。要清空全部内容，用顶部文件菜单里的“恢复初始”。
      </p>
    </div>
  )
}
