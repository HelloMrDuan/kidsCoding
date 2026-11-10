/**
 * A1-U4-L02 建立数据使用许可编辑器插槽（L02EditorSlot）。
 *
 * 依据：已合并规范 docs/product/p0-kitten-workspace/LESSON-CONTRACT.md
 * 与 L01 的插槽打法。外壳只负责布局、抽屉、文件菜单与自动保存；
 * 探索分类、许可清单、否决题、scope 题、不覆盖事项、判定与作品总结
 * 全部在本插槽。
 *
 * 与 L01 的插槽差别（本课是许可清单课）：
 * - 没有三句问题陈述：独立练习是填一张五列许可清单（数据项 / 是否含
 *   个人信息 / 需何种许可 / 许可状态 / 默认处置），3 行；
 * - 迁移不是换场景重写三句话：否决题（混有个人记录的合成数据表）+
 *   scope 分离选择题 + 不覆盖事项五选；
 * - 设计包 §5 同意范围四条一字不改列在页首，诚实注记明说监护人同意
 *   到儿童档案的映射未核实、为待填 stub，不假装机制已经存在。
 *
 * 本课新增的 testid（E2E 与单测对应）：
 * ai-u4-l02-explore-{A1|A2|A3|P1|P2|P3} / ai-u4-l02-explore-{id}-{aggregate|stop} /
 * ai-u4-l02-checklist-{0|1|2}-item|permission / ai-u4-l02-checklist-{0|1|2}-pii-{yes|no} /
 * ai-u4-l02-checklist-{0|1|2}-status-{granted|missing|na} /
 * ai-u4-l02-checklist-{0|1|2}-disposition-{stop|usable} /
 * ai-u4-l02-veto-{W1|W2|W3|W4} / ai-u4-l02-veto-{id}-{stop|usable} /
 * ai-u4-l02-scope-{A|B|C} / ai-u4-l02-noncoverage-{N1|N2|N3|N4|N5|N6|N7} /
 * ai-u4-l02-check / ai-u4-l02-result /
 * ai-u4-l02-verdict / ai-u4-l02-work / ai-u4-l02-draft-status。
 *
 * 判定三层分离：插槽内只展示本次核对的判定（探索逐项 + 结论 +
 * 方法证据），不写表示完全掌握的字样；编辑后旧判定失效，须重新点“核对本课”。
 * 草稿状态行只显示已分类数与清单完成情况，不显示 hintLevel（外壳抽屉揭示态
 * 不回写草稿，旧 L02 教训：插槽不得显示它无法更新的计数）。
 * 隐私红线：本课不收集、不上传任何真实校园数据；不要求输入真实个人信息；
 * 个人记录缺许可即停，界面明示请换题；否决题数据表为新增合成数据，明码标注。
 */

'use client'

import { useRef, useState } from 'react'
import type { EditorSlotProps, JudgmentResult } from '../lessons/workspace/workspace-slots'
import { buildL02Judgment } from './a1-u4-l02-adapter'
import { coerceDraft, type L02Draft } from './a1-u4-l02-draft'
import {
  EXPLORE_ITEMS,
  MAX_TEXT_LENGTH,
  NON_COVERAGE_ITEMS,
  PERMISSION_RULES,
  SCOPE_QUESTION,
  VETO_ITEMS,
  checkL02,
  type ChecklistDisposition,
  type ChecklistRow,
  type ChecklistStatus,
  type ContainsPii,
  type ExploreClassification,
  type L02CheckResult,
  type ScopeOption,
  type VetoDisposition,
} from './a1-u4-l02'

export type L02SlotProps = EditorSlotProps & {
  /**
   * 判定上报（#481 课程侧一半，OPS-025 通道）。核对本课时上报三层判定，
   * 编辑后上报 null 使旧判定失效。外壳尚未接 onJudgment 时该回调恒为
   * undefined，插槽行为不变（判定仍在插槽内展示）。
   */
  onJudgment?: (judgment: JudgmentResult | null) => void
}

export function L02EditorSlot({ initial, onChange, editable, onJudgment }: L02SlotProps) {
  const [draft, setDraft] = useState<L02Draft>(() => coerceDraft(initial))
  const [result, setResult] = useState<L02CheckResult | null>(null)
  const lastReportedRef = useRef(false)

  function persist(next: L02Draft) {
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
  function edit(next: L02Draft) {
    persist(next)
    setResult(null)
    invalidateJudgment()
  }

  function classify(itemId: string, kind: ExploreClassification) {
    if (draft.explore[itemId] === kind) return
    edit({ ...draft, explore: { ...draft.explore, [itemId]: kind } })
  }

  function setChecklistRow(index: number, patch: Partial<ChecklistRow>) {
    const next = draft.checklist.map((row, i) => (i === index ? { ...row, ...patch } : row))
    if (JSON.stringify(next[index]) === JSON.stringify(draft.checklist[index])) return
    edit({ ...draft, checklist: next })
  }

  function answerVeto(itemId: string, disposition: VetoDisposition) {
    if (draft.veto[itemId] === disposition) return
    edit({ ...draft, veto: { ...draft.veto, [itemId]: disposition } })
  }

  function answerScope(option: ScopeOption) {
    if (draft.scopeAnswer === option) return
    edit({ ...draft, scopeAnswer: option })
  }

  function toggleNonCoverage(itemId: string) {
    const next = draft.nonCoverage.includes(itemId)
      ? draft.nonCoverage.filter((id) => id !== itemId)
      : [...draft.nonCoverage, itemId]
    edit({ ...draft, nonCoverage: next })
  }

  function check() {
    const next = checkL02(draft)
    setResult(next)
    lastReportedRef.current = true
    onJudgment?.(buildL02Judgment(next, draft))
  }

  const judgment = result ? buildL02Judgment(result, draft) : null
  const classifiedCount = EXPLORE_ITEMS.filter(
    (item) => draft.explore[item.id] !== undefined,
  ).length

  if (!editable) {
    return (
      <div className="kc-stack" data-testid="ai-u4-l02-slot-readonly">
        <p>本课为只读预览：先看六项数据，再看当前分类与许可清单。</p>
        {EXPLORE_ITEMS.map((item) => (
          <div key={item.id}>
            <p>
              {item.id}：{item.text}
            </p>
            {draft.explore[item.id] !== undefined && <p>已分类：{draft.explore[item.id]}</p>}
          </div>
        ))}
        {draft.checklist.some((row) => row.item !== '') && (
          <p>已填许可清单：{draft.checklist.filter((row) => row.item !== '').length} 行</p>
        )}
      </div>
    )
  }

  return (
    <div className="kc-stack">
      <p>
        本课不收集、不上传任何真实校园数据；不要求输入真实个人信息。
        清单是课堂文档，不改变任何系统许可状态；个人记录缺许可即停，请换题。
      </p>

      <h3>同意范围四条（设计包 §5，一字不改）</h3>
      {PERMISSION_RULES.map((rule) => (
        <p key={rule.id}>
          {rule.id}：{rule.text}
        </p>
      ))}
      <p data-testid="ai-u4-l02-honest-note">
        诚实注记：设计包里“监护人同意如何映射到某个儿童档案”没有对应设计、
        未核实；本节只教许可清单的写法与默认拒绝的纪律，不假装系统里的映射机制
        已经存在；映射机制本身为待填 stub。
      </p>

      <h3>探索：这六项数据，哪些聚合可用、哪些缺许可即停？</h3>
      <p>
        先按“含不含个人信息”分两堆，再谈许可：聚合计数不含个人信息，
        个人记录缺许可即停。
      </p>
      {EXPLORE_ITEMS.map((item) => {
        const picked = draft.explore[item.id] ?? null
        return (
          <div key={item.id} data-testid={`ai-u4-l02-explore-${item.id}`}>
            <p>
              {item.id}：{item.text}
            </p>
            <div>
              <button
                type="button"
                data-testid={`ai-u4-l02-explore-${item.id}-aggregate`}
                aria-pressed={picked === '聚合可用'}
                onClick={() => classify(item.id, '聚合可用')}
              >
                聚合可用
              </button>
              <button
                type="button"
                data-testid={`ai-u4-l02-explore-${item.id}-stop`}
                aria-pressed={picked === '缺许可即停'}
                onClick={() => classify(item.id, '缺许可即停')}
              >
                缺许可即停
              </button>
            </div>
            {picked !== null && (
              <p>{picked === item.kind ? `分类正确：${item.reason}` : `分类错了：${item.reason}`}</p>
            )}
          </div>
        )
      })}

      <h3>独立练习：给 L01 的问题填一张许可清单</h3>
      <p>
        五列：数据项 / 是否含个人信息 / 需何种许可 / 许可状态 / 默认处置。
        许可状态只写“已授予 / 未授予 / 不适用”，不写“大概有了”；
        默认处置一律写“停”，不写“先用着”。个人记录必须有许可，
        不能写“不适用”；许可未授予，默认处置必须是“停”。
      </p>
      {draft.checklist.map((row, index) => (
        <div key={index}>
          <p>第 {index + 1} 行</p>
          <label htmlFor={`a1-u4-l02-checklist-${index}-item`}>数据项（1–200 字）</label>
          <input
            id={`a1-u4-l02-checklist-${index}-item`}
            data-testid={`ai-u4-l02-checklist-${index}-item`}
            value={row.item}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) => setChecklistRow(index, { item: event.target.value })}
            placeholder={index === 0 ? '例如：每日各窗口剩菜总重量' : '例如：一项数据'}
          />
          <p>是否含个人信息</p>
          <div>
            <button
              type="button"
              data-testid={`ai-u4-l02-checklist-${index}-pii-yes`}
              aria-pressed={row.containsPii === '是'}
              onClick={() => setChecklistRow(index, { containsPii: '是' as ContainsPii })}
            >
              是
            </button>
            <button
              type="button"
              data-testid={`ai-u4-l02-checklist-${index}-pii-no`}
              aria-pressed={row.containsPii === '否'}
              onClick={() => setChecklistRow(index, { containsPii: '否' as ContainsPii })}
            >
              否
            </button>
          </div>
          <label htmlFor={`a1-u4-l02-checklist-${index}-permission`}>需何种许可（1–200 字）</label>
          <input
            id={`a1-u4-l02-checklist-${index}-permission`}
            data-testid={`ai-u4-l02-checklist-${index}-permission`}
            value={row.permissionNeeded}
            maxLength={MAX_TEXT_LENGTH}
            onChange={(event) =>
              setChecklistRow(index, { permissionNeeded: event.target.value })
            }
            placeholder="例如：聚合数据可用，仍须教师确认来源"
          />
          <p>许可状态</p>
          <div>
            <button
              type="button"
              data-testid={`ai-u4-l02-checklist-${index}-status-granted`}
              aria-pressed={row.status === '已授予'}
              onClick={() => setChecklistRow(index, { status: '已授予' as ChecklistStatus })}
            >
              已授予
            </button>
            <button
              type="button"
              data-testid={`ai-u4-l02-checklist-${index}-status-missing`}
              aria-pressed={row.status === '未授予'}
              onClick={() => setChecklistRow(index, { status: '未授予' as ChecklistStatus })}
            >
              未授予
            </button>
            <button
              type="button"
              data-testid={`ai-u4-l02-checklist-${index}-status-na`}
              aria-pressed={row.status === '不适用'}
              onClick={() => setChecklistRow(index, { status: '不适用' as ChecklistStatus })}
            >
              不适用
            </button>
          </div>
          <p>默认处置</p>
          <div>
            <button
              type="button"
              data-testid={`ai-u4-l02-checklist-${index}-disposition-stop`}
              aria-pressed={row.disposition === '停'}
              onClick={() =>
                setChecklistRow(index, { disposition: '停' as ChecklistDisposition })
              }
            >
              停
            </button>
            <button
              type="button"
              data-testid={`ai-u4-l02-checklist-${index}-disposition-usable`}
              aria-pressed={row.disposition === '可用'}
              onClick={() =>
                setChecklistRow(index, { disposition: '可用' as ChecklistDisposition })
              }
            >
              可用
            </button>
          </div>
        </div>
      ))}

      <h3>迁移：对这张数据表说不</h3>
      <p>
        下表为新增合成数据，明码标注，无真实个人信息：看起来能用、其实许可没过的项，
        默认处置一律是“停”。
      </p>
      {VETO_ITEMS.map((item) => {
        const picked = draft.veto[item.id] ?? null
        return (
          <div key={item.id} data-testid={`ai-u4-l02-veto-${item.id}`}>
            <p>
              {item.id}：{item.text}
            </p>
            <div>
              <button
                type="button"
                data-testid={`ai-u4-l02-veto-${item.id}-stop`}
                aria-pressed={picked === '停'}
                onClick={() => answerVeto(item.id, '停')}
              >
                停
              </button>
              <button
                type="button"
                data-testid={`ai-u4-l02-veto-${item.id}-usable`}
                aria-pressed={picked === '可用'}
                onClick={() => answerVeto(item.id, '可用')}
              >
                可用
              </button>
            </div>
            {picked !== null && (
              <p>{picked === item.expected ? `对了：${item.reason}` : `错了：${item.reason}`}</p>
            )}
          </div>
        )
      })}

      <p>{SCOPE_QUESTION.question}</p>
      <div>
        {SCOPE_QUESTION.options.map((option) => (
          <button
            key={option.id}
            type="button"
            data-testid={`ai-u4-l02-scope-${option.id}`}
            aria-pressed={draft.scopeAnswer === option.id}
            onClick={() => answerScope(option.id)}
          >
            {option.id}．{option.text}
          </button>
        ))}
      </div>
      {draft.scopeAnswer !== null && (
        <p>
          {draft.scopeAnswer === SCOPE_QUESTION.answer
            ? SCOPE_QUESTION.correctFeedback
            : SCOPE_QUESTION.wrongFeedback}
        </p>
      )}

      <h3>不覆盖事项：即使有同意，哪些也默认关闭？</h3>
      <p>选出全部“即使有同意也不覆盖”的事项（恰好 5 项，多选、漏选都算错）。</p>
      <div>
        {NON_COVERAGE_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            data-testid={`ai-u4-l02-noncoverage-${item.id}`}
            aria-pressed={draft.nonCoverage.includes(item.id)}
            onClick={() => toggleNonCoverage(item.id)}
          >
            {item.id}．{item.text}
          </button>
        ))}
      </div>

      <button type="button" data-testid="ai-u4-l02-check" onClick={check}>
        核对本课
      </button>

      {result && judgment && (
        <div data-testid="ai-u4-l02-result">
          <ul>
            {result.explore.checks.map((check) => (
              <li key={check.id}>
                {check.id}：{check.passed ? '通过' : '未通过'}——{check.detail}
              </li>
            ))}
          </ul>
          <p>{result.checklist.detail}</p>
          <p>{result.transfer.detail}</p>
          <p data-testid="ai-u4-l02-verdict">{judgment.layers[1].detail}</p>
          <p>{judgment.conclusion}</p>
          <p>{judgment.methodEvidence}</p>
        </div>
      )}

      {result?.passed && (
        <div data-testid="ai-u4-l02-work">
          <h3>作品总结</h3>
          <p>
            你的许可清单已通过核对：探索分类 {result.explore.passedCount}/6，
            许可清单 {result.checklist.completedRows}/3 行，
            否决题 {result.transfer.vetoPassedCount}/4 项，scope 题答对，
            不覆盖事项 5 项全选对。清单全过只表示本次课堂练习合格，不等于系统里的
            许可映射已经存在；真实项目还须过教师确认。
          </p>
        </div>
      )}

      {result && !result.passed && <p>先修到全部通过：改分类、补清单五列、答对否决题与 scope 题、再点“核对本课”。</p>}

      <p data-testid="ai-u4-l02-draft-status">
        本机草稿状态：已分类 {classifiedCount}/6，
        许可清单已填{' '}
        {draft.checklist.filter((row) => row.item !== '').length}
        /3 行，否决题已答{' '}
        {VETO_ITEMS.filter((item) => draft.veto[item.id] !== undefined).length}
        /4 项。要清空全部内容，用顶部文件菜单里的“恢复初始”。
      </p>
    </div>
  )
}
