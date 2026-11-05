'use client'

/**
 * A1-U3-L02 SummaryAdapter：本地规则摘要课的课程适配器。
 *
 * 外壳分工（已合并共享 LessonWorkspace，main 651ae7f）：
 * - 外壳拥有挂载与数据：插槽课不挂载命令式适配器（createRoot 禁止），
 *   编辑面由 SummaryEditorSlot 渲染；外壳以信封写草稿、 debounced 自动
 *   保存、课节切换先存后载。本适配器不写 localStorage。
 * - 判定显示在插槽内：外壳只在运行事件后读 adapter.getJudgmentResult，
 *   而插槽课没有运行事件；因此插槽的 JudgeBlock 是判定的正式显示处，
 *   本适配器的 getJudgmentResult 返回最近一次 check() 的结果（供单测
 *   与未来外壳显示复用），不作为外壳当前反馈的来源——不得谎称外壳
 *   反馈区已显示它。
 *
 * 本适配器提供的最小能力（首席集成指令）：
 * - 加载内容：loadScript（任意输入经 coerceDraft 规整，非法降级）；
 * - 编辑摘要：插槽经外壳 onChange 回写数据，适配器以 getScript 读回
 *   当前草稿（外壳保存与切换的唯一数据来源之一）；
 * - 检查：checkIndependent / checkTransfer 跑同一套五项检查并返回
 *   共享 JudgmentResult（层：检查结果 / 任务判定 / 方法证据）；
 * - 停止或取消：stop() 是 no-op——同步检查无可取消的播放，草稿与
 *   判定原样保留；丢弃修改走外壳文件菜单恢复初始，不由 stop 冒充；
 * - 读取状态：getState（外壳 EngineState 形状，恒未运行）与
 *   getSummaryState（检查态：是否已查、通过数、verdict）；
 * - 保存草稿：不直接写存储；getScript 供外壳保存，validateDraft 供
 *   外壳恢复校验（严格形状，不降级）。
 * - 文件能力：新建/保存/导出/导入/恢复初始全部真实可用（外壳已为
 *   插槽课实现），不隐藏、不造假按钮。
 *
 * 诚实边界（与插槽共用，不得改写）：改原意只是数字规则检查；
 * 来源核验只证明摘句未改写；自加句只是错误识别实验；结论永不写
 * “已掌握”——合格只写“本次摘要合格”。
 */

import type {
  EngineAdapter,
  EngineState,
  RunEvent,
} from '../lessons/workspace/workspace-adapters'
import type {
  FileCapabilities,
  JudgmentResult,
} from '../lessons/workspace/workspace-slots'
import {
  buildDraftSummary,
  buildTransferSummary,
  checkDraftSummary,
  checkTransferSummary,
  type L02Check,
} from './a1-u3-l02'
import {
  coerceDraft,
  emptyDraft,
  isValidDraftShape,
  type L02Draft,
} from './a1-u3-l02-draft'

export const SUMMARY_TOTAL_CHECKS = 5

/** 五项检查 → 共享 JudgmentResult（层文案与插槽 JudgeBlock 同源）。 */
export function buildSummaryJudgment(
  checks: L02Check[],
  methodEvidence: string,
): JudgmentResult {
  const passed = checks.length > 0 && checks.every((check) => check.passed)
  const failed = checks.filter((check) => !check.passed)
  return {
    layers: [
      {
        id: 'stage',
        label: '检查结果',
        passed,
        detail:
          checks.length === 0
            ? '检查结果：尚未检查。'
            : `检查结果：五项中通过 ${checks.length - failed.length} 项` +
              (failed.length > 0 ? `，未通过：${failed.map((check) => check.name).join('、')}。` : '。'),
      },
      {
        id: 'task',
        label: '任务判定',
        passed,
        detail: passed
          ? '任务判定：合格：五项全部通过。'
          : `任务判定：未合格：还有 ${failed.length} 项未通过（${failed.map((check) => check.name).join('、')}）。`,
      },
      {
        id: 'knowledge',
        label: '方法证据',
        passed,
        detail: `方法证据：${methodEvidence}`,
      },
    ],
    passed,
    conclusion: passed ? '结论：本次摘要合格。' : '结论：未合格。',
    methodEvidence,
  }
}

function methodEvidenceForIndependent(draft: L02Draft): string {
  const summary = buildDraftSummary(draft.selected, draft.custom)
  const sourced = summary.entries.filter((entry) => entry.sourceId !== null).length
  const points = summary.pointsCovered.length > 0 ? summary.pointsCovered.join('、') : '无'
  return (
    `摘要共 ${sourced + draft.custom.length} 句，其中 ${sourced} 句来自课文原文` +
    (draft.custom.length > 0 ? `，${draft.custom.length} 句是自加句错误实验（不算摘录）` : '，无自加句') +
    `；要点覆盖 ${points}。`
  )
}

function methodEvidenceForTransfer(draft: L02Draft): string {
  const summary = buildTransferSummary(draft.transferSelected)
  const points = summary.pointsCovered.length > 0 ? summary.pointsCovered.join('、') : '无'
  return `迁移摘要共 ${summary.entries.length} 句，全部来自新课文原文；要点覆盖 ${points}。`
}

export class SummaryAdapter implements EngineAdapter {
  private draft: L02Draft
  private lastJudgment: JudgmentResult | null = null
  private lastPassedCount = 0

  constructor(initial?: unknown) {
    this.draft = initial === undefined ? emptyDraft() : coerceDraft(initial)
  }

  /** 插槽课不挂载命令式适配器：外壳渲染插槽组件，本方法恒为 no-op。 */
  mount(): void {
    // Intentionally empty: slot courses never mount an imperative adapter.
  }

  unmount(): void {
    // Intentionally empty: nothing was mounted.
  }

  /** 加载内容：任意输入经字段降级规整，不抛错、不清空已有好草稿。 */
  loadScript(script: unknown): void {
    this.draft = coerceDraft(script)
    this.lastJudgment = null
    this.lastPassedCount = 0
  }

  /** 读取当前草稿全量：外壳保存与课节切换的数据来源。 */
  getScript(): unknown {
    return this.draft
  }

  /** 恢复校验：严格形状（不降级）；非法时外壳回初始脚本，不覆盖好草稿。 */
  validateDraft(script: unknown): boolean {
    return isValidDraftShape(script)
  }

  /** 文件能力：外壳对插槽课五项操作全部真实实现。 */
  getFileCapabilities(): FileCapabilities {
    return {
      canNew: true,
      canSave: true,
      canExport: true,
      canImport: true,
      canReset: true,
    }
  }

  /** 独立摘要检查：同一套五项检查，返回共享判定（不写进草稿）。 */
  checkIndependent(): JudgmentResult {
    const summary = buildDraftSummary(this.draft.selected, this.draft.custom)
    const checks = checkDraftSummary(summary)
    const judgment = buildSummaryJudgment(checks, methodEvidenceForIndependent(this.draft))
    this.lastJudgment = judgment
    this.lastPassedCount = checks.filter((check) => check.passed).length
    return judgment
  }

  /** 迁移摘要检查：同一套五项检查，返回共享判定（不写进草稿）。 */
  checkTransfer(): JudgmentResult {
    const summary = buildTransferSummary(this.draft.transferSelected)
    const checks = checkTransferSummary(summary)
    const judgment = buildSummaryJudgment(checks, methodEvidenceForTransfer(this.draft))
    this.lastJudgment = judgment
    this.lastPassedCount = checks.filter((check) => check.passed).length
    return judgment
  }

  /** 最近一次 check() 的判定；未检查过为 null。外壳不为插槽课读它（见文件头）。 */
  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  /**
   * 插槽课没有播放过程：run 立即以 finished 事件结束，不产生判定。
   * 真正的检查由插槽内检查按钮触发（checkIndependent / checkTransfer）。
   */
  run(onEvent: (event: RunEvent) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  /** 停止：同步检查无可取消的播放；草稿与判定原样保留。 */
  stop(): void {
    // Intentionally empty: nothing is playing to cancel.
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }

  /** 摘要检查态（外壳 EngineState 之外的课程态，不进草稿）。 */
  getSummaryState(): {
    checked: boolean
    passedCount: number
    totalChecks: number
    verdict: '合格' | '未合格' | null
  } {
    if (this.lastJudgment === null) {
      return { checked: false, passedCount: 0, totalChecks: SUMMARY_TOTAL_CHECKS, verdict: null }
    }
    // Passed count comes from the stored check result, never parsed back
    // out of a display sentence: the layer text is wording, not data.
    return {
      checked: true,
      passedCount: this.lastPassedCount,
      totalChecks: SUMMARY_TOTAL_CHECKS,
      verdict: this.lastJudgment.passed ? '合格' : '未合格',
    }
  }
}
