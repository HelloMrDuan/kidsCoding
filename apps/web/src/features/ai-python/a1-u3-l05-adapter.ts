/**
 * A1-U3-L05 引用核对适配器（CitationAdapter）。
 *
 * 依据：共享 LessonWorkspace 适配器接口（workspace-adapters.ts）。
 * 对插槽课，外壳不挂载适配器：路由只建实例作类型合规与测试载体，
 * 实时核对走插槽直连判定器（本文件 buildCitationJudgment），与 L06 一致。
 *
 * 判定三层分离（P0 规范）：
 * - 舞台结果层：八项逐项判定（每条 AI 回答的 verdict 是否选对）。
 * - 任务判定层：八项全部通过为合格，否则未合格并列出未通过项号。
 * - 知识证据层：方法证据——各 verdict 类型的判定计数与迁移项完成
 *   计数（只记计数，不记 AI 回答原文、资料原文、学生身份）。
 * - 表示完全掌握的字样只在任务与知识证据同时通过时出现；本课知识证据永不
 *   直接写表示完全掌握的字样，结论只写合格/未合格。
 *
 * 判定永不写入草稿：编辑后旧判定失效，须重新点“检查八项”才出结果。
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
import type { L05Draft } from './a1-u3-l05-draft'
import { coerceDraft, emptyDraft, isValidDraftShape } from './a1-u3-l05-draft'
import {
  CHECK_ITEMS,
  checkVerdicts,
  type CheckResult,
  type Verdict,
} from './a1-u3-l05'

const TOTAL_CHECKS = 8

/** 迁移项编号（T1/T2，用资料 E 的新回答做迁移验证）。 */
const MIGRATION_IDS = ['T1', 'T2'] as const

/** 方法证据：只记计数，不记 AI 回答原文、资料原文、学生身份。 */
export function methodEvidenceForCheck(draft: L05Draft, result: CheckResult): string {
  const correctByType = (verdict: Verdict): string => {
    const total = CHECK_ITEMS.filter((item) => item.correct === verdict).length
    const correct = result.checks.filter(
      (check) => check.correct === verdict && check.passed,
    ).length
    return `${verdict}选对 ${correct}/${total}`
  }
  const migrationPicked = result.checks.filter(
    (check) => (MIGRATION_IDS as readonly string[]).includes(check.id) && check.picked !== null,
  ).length
  const migrationCorrect = result.checks.filter(
    (check) => (MIGRATION_IDS as readonly string[]).includes(check.id) && check.passed,
  ).length
  return `方法证据：已选 ${result.pickedCount}/8，选对 ${result.passedCount}/8；${correctByType('可信')}，${correctByType('编造数字')}，${correctByType('编造来源')}，${correctByType('证据不足')}；迁移项已选 ${migrationPicked}/2（选对 ${migrationCorrect} 个）。`
}

/** 通过项数（fail-closed：未核对的结果一律 0 通过）。 */
export function passedCountOf(result: CheckResult): number {
  return result.passed ? TOTAL_CHECKS : result.passedCount
}

/**
 * 由一次核对结果构建三层判定。空检查列表不判过（fail-closed）；
 * 未选、选错，一律列为未通过项号。
 */
export function buildCitationJudgment(result: CheckResult, draft: L05Draft): JudgmentResult {
  const passedCount = result.passedCount
  const failedIds = result.checks.filter((check) => !check.passed).map((check) => check.id)
  const stageDetail =
    result.checks.length === 0
      ? '检查结果：尚未核对八项。'
      : result.passed
        ? '检查结果：八项全部通过（探索预测 2、独立练习 4、迁移应用 2）。'
        : `检查结果：八项中通过 ${passedCount} 项，未通过：${failedIds.join('、')}。`
  const taskDetail = result.passed
    ? '任务判定：合格：八项全部通过。'
    : `任务判定：未合格：还有 ${failedIds.length} 项未通过（${failedIds.join('、')}）。`
  const evidence = methodEvidenceForCheck(draft, result)
  return {
    layers: [
      { id: 'stage', label: '检查结果', passed: result.passed, detail: stageDetail },
      { id: 'task', label: '任务判定', passed: result.passed, detail: taskDetail },
      {
        id: 'knowledge',
        label: '知识证据',
        passed: result.passed,
        detail: evidence,
      },
    ],
    passed: result.passed,
    conclusion: result.passed ? '结论：本次核对合格。' : '结论：未合格。',
    methodEvidence: evidence,
  }
}

export type CitationState = {
  checked: boolean
  passedCount: number
  totalChecks: number
  verdict: string | null
}

export class CitationAdapter implements EngineAdapter {
  private draft: L05Draft
  private lastJudgment: JudgmentResult | null = null
  private lastPassedCount = 0

  constructor(initial?: unknown) {
    this.draft = initial === undefined ? emptyDraft() : coerceDraft(initial)
  }

  mount(): void {
    // 插槽课不挂载命令式适配器（外壳同样跳过）；实例仅作类型与测试载体。
  }

  unmount(): void {
    // 无挂载副作用，无需清理。
  }

  loadScript(script: unknown): void {
    this.draft = coerceDraft(script)
    this.lastJudgment = null
    this.lastPassedCount = 0
  }

  getScript(): unknown {
    return this.draft
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }

  /**
   * 插槽课没有播放过程：run 立即以 finished 事件结束，不产生判定。
   * 真正的检查由插槽内“检查八项”按钮触发（checkItems）。
   */
  run(onEvent: (event: RunEvent) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: nothing is playing to cancel.
  }

  /** 恢复核对：严格形状（不降级）；非法时外壳回初始脚本，不覆盖好草稿。 */
  validateDraft(script: unknown): boolean {
    return isValidDraftShape(script)
  }

  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  /** 核对当前草稿八项并记录三层判定（不写入草稿）。 */
  checkItems(): JudgmentResult {
    const result = checkVerdicts(this.draft)
    this.lastPassedCount = passedCountOf(result)
    this.lastJudgment = buildCitationJudgment(result, this.draft)
    return this.lastJudgment
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getCitationState(): CitationState {
    return {
      checked: this.lastJudgment !== null,
      passedCount: this.lastPassedCount,
      totalChecks: TOTAL_CHECKS,
      verdict: this.lastJudgment?.conclusion ?? null,
    }
  }
}
