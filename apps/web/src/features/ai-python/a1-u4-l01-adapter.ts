/**
 * A1-U4-L01 提出校园真实问题适配器（L01Adapter）。
 *
 * 依据：共享 LessonWorkspace 适配器接口（workspace-adapters.ts）。
 * 对插槽课，外壳不挂载适配器：路由只建实例作类型合规与测试载体，
 * 实时核对走插槽直连判定器（本文件 buildL01Judgment），与 L06 一致。
 *
 * 判定三层分离（P0 规范）：
 * - 舞台结果层：探索分类六条逐项判定（分类与预期是否一致）。
 * - 任务判定层：问题卡与迁移是否完成（选例、三句齐全、四问已答、
 *   迁移场景、三句齐全、成绩题答对）。
 * - 知识证据层：方法证据——分类计数、问题卡完成情况、可行性检查计数
 *   与迁移场景计数（只记计数，不记学生原文、学生身份）。
 * - 结论只写合格/未合格；页面任何位置不写表示完全掌握的字样。
 *
 * 判定永不写入草稿：编辑后旧判定失效，须重新点“核对本课”才出结果。
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
import type { L01Draft } from './a1-u4-l01-draft'
import { coerceDraft, emptyDraft, isValidDraftShape } from './a1-u4-l01-draft'
import { checkL01, type L01CheckResult } from './a1-u4-l01'

/** 核对总项数：探索 6 条 + 问题卡 1 项 + 迁移 1 项。 */
export const TOTAL_CHECKS = 8

/** 方法证据：只记计数，不记学生原文、学生身份。 */
export function methodEvidenceForL01(draft: L01Draft, result: L01CheckResult): string {
  const classifiedCount = result.explore.checks.filter(
    (check) => check.picked !== null,
  ).length
  const transferCount = draft.transferScenario === null ? 0 : 1
  return `方法证据：问题描述已分类 ${classifiedCount}/6（有效 3、模糊 3）；问题卡三句${result.problemCard.statementComplete ? '齐全' : '未齐'}，可行性检查 ${result.problemCard.feasibilityAnsweredCount}/4；迁移场景 ${transferCount} 个；${result.transfer.gradesCorrect ? '已识别个人记录类禁题 1 个（成绩预测）' : '个人记录类禁题尚未识别'}。`
}

/** 通过项数（fail-closed：未核对的结果一律 0 通过）。 */
export function passedCountOf(result: L01CheckResult): number {
  return (
    result.explore.passedCount +
    (result.problemCard.passed ? 1 : 0) +
    (result.transfer.passed ? 1 : 0)
  )
}

/**
 * 由一次核对结果构建三层判定。探索 0 分类不判过（fail-closed）；
 * 未分类、分类错、缺句、缺问、成绩题答错，一律列为未通过。
 */
export function buildL01Judgment(result: L01CheckResult, draft: L01Draft): JudgmentResult {
  const failedExploreIds = result.explore.checks
    .filter((check) => !check.passed)
    .map((check) => check.id)
  const classifiedCount = result.explore.checks.filter(
    (check) => check.picked !== null,
  ).length
  const stageDetail =
    classifiedCount === 0
      ? '检查结果：尚未分类六条问题描述。'
      : result.explore.passed
        ? '检查结果：六条问题描述分类全部正确（有效 3、模糊 3）。'
        : `检查结果：探索分类通过 ${result.explore.passedCount} 项，未通过：${failedExploreIds.join('、')}。`
  const missingTask: string[] = []
  // 任务判定要求三者全过：探索未过也要列进原因，否则仅探索失败时
  // 会出现“任务判定：未合格：。”这种空原因文案（#507 F1）。
  if (!result.explore.passed) missingTask.push('探索分类未通过')
  if (!result.problemCard.passed) missingTask.push('问题卡未完成')
  if (!result.transfer.passed) missingTask.push('迁移未完成')
  if (missingTask.length === 0) missingTask.push('有检查项未通过')
  const taskDetail = result.passed
    ? '任务判定：合格：问题卡与迁移均已完成。'
    : `任务判定：未合格：${missingTask.join('；')}。`
  const evidence = methodEvidenceForL01(draft, result)
  return {
    layers: [
      { id: 'stage', label: '检查结果', passed: result.explore.passed, detail: stageDetail },
      { id: 'task', label: '任务判定', passed: result.passed, detail: taskDetail },
      {
        id: 'knowledge',
        label: '知识证据',
        passed: result.passed,
        detail: evidence,
      },
    ],
    passed: result.passed,
    conclusion: result.passed ? '结论：本次课堂练习合格。' : '结论：未合格。',
    methodEvidence: evidence,
  }
}

export type L01State = {
  checked: boolean
  passedCount: number
  totalChecks: number
  verdict: string | null
}

export class L01Adapter implements EngineAdapter {
  private draft: L01Draft
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
   * 真正的检查由插槽内“核对本课”按钮触发（checkL01）。
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

  /** 核对当前草稿本课并记录三层判定（不写入草稿）。 */
  checkL01(): JudgmentResult {
    const result = checkL01(this.draft)
    this.lastPassedCount = passedCountOf(result)
    this.lastJudgment = buildL01Judgment(result, this.draft)
    return this.lastJudgment
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getL01State(): L01State {
    return {
      checked: this.lastJudgment !== null,
      passedCount: this.lastPassedCount,
      totalChecks: TOTAL_CHECKS,
      verdict: this.lastJudgment?.conclusion ?? null,
    }
  }
}
