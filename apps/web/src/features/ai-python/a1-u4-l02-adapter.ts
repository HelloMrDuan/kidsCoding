/**
 * A1-U4-L02 建立数据使用许可适配器（L02Adapter）。
 *
 * 依据：共享 LessonWorkspace 适配器接口（workspace-adapters.ts）。
 * 对插槽课，外壳不挂载适配器：路由只建实例作类型合规与测试载体，
 * 实时核对走插槽直连判定器（本文件 buildL02Judgment），与 L01 一致。
 *
 * 判定三层分离（P0 规范）：
 * - 舞台结果层：探索分类六项逐项判定（分类与预期是否一致）。
 * - 任务判定层：许可清单与迁移是否完成（清单 3 行五列齐全且默认处置
 *   与许可状态一致、否决题 4 项全对、scope 题答对、不覆盖事项 5 项全选对）。
 * - 知识证据层：方法证据——分类计数、许可清单完成情况、否决题计数、
 *   scope 题与不覆盖事项计数（只记计数，不记学生原文、学生身份）。
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
import type { L02Draft } from './a1-u4-l02-draft'
import { coerceDraft, emptyDraft, isValidDraftShape } from './a1-u4-l02-draft'
import { checkL02, type L02CheckResult } from './a1-u4-l02'

/** 核对总项数：探索 6 项 + 许可清单 1 项 + 迁移 1 项。 */
export const TOTAL_CHECKS = 8

/** 方法证据：只记计数，不记学生原文、学生身份。 */
export function methodEvidenceForL02(draft: L02Draft, result: L02CheckResult): string {
  const classifiedCount = result.explore.checks.filter(
    (check) => check.picked !== null,
  ).length
  const vetoCount = result.transfer.vetoPassedCount
  const nonCoveragePicked = draft.nonCoverage.filter((id) =>
    ['N1', 'N2', 'N3', 'N4', 'N5'].includes(id),
  ).length
  return `方法证据：数据已分类 ${classifiedCount}/6（聚合可用 3、缺许可即停 3）；许可清单 ${result.checklist.completedRows}/3 行；否决题 ${vetoCount}/4 项；scope 题${result.transfer.scopeCorrect ? '已答对' : '未答对'}；不覆盖事项选对 ${nonCoveragePicked}/5 项。`
}

/** 通过项数（fail-closed：未核对的结果一律 0 通过）。 */
export function passedCountOf(result: L02CheckResult): number {
  return (
    result.explore.passedCount +
    (result.checklist.passed ? 1 : 0) +
    (result.transfer.passed ? 1 : 0)
  )
}

/**
 * 由一次核对结果构建三层判定。探索 0 分类不判过（fail-closed）；
 * 未分类、分类错、清单缺格、处置不一致、否决题答错、scope 题答错、
 * 不覆盖事项多选漏选，一律列为未通过。
 */
export function buildL02Judgment(result: L02CheckResult, draft: L02Draft): JudgmentResult {
  const failedExploreIds = result.explore.checks
    .filter((check) => !check.passed)
    .map((check) => check.id)
  const classifiedCount = result.explore.checks.filter(
    (check) => check.picked !== null,
  ).length
  const stageDetail =
    classifiedCount === 0
      ? '检查结果：尚未分类六项数据。'
      : result.explore.passed
        ? '检查结果：六项数据分类全部正确（聚合可用 3、缺许可即停 3）。'
        : `检查结果：探索分类通过 ${result.explore.passedCount} 项，未通过：${failedExploreIds.join('、')}。`
  const missingTask: string[] = []
  if (!result.checklist.passed) missingTask.push('许可清单未完成')
  if (!result.transfer.passed) missingTask.push('迁移未完成')
  const taskDetail = result.passed
    ? '任务判定：合格：许可清单与迁移均已完成。'
    : `任务判定：未合格：${missingTask.join('；')}。`
  const evidence = methodEvidenceForL02(draft, result)
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

export type L02State = {
  checked: boolean
  passedCount: number
  totalChecks: number
  verdict: string | null
}

export class L02Adapter implements EngineAdapter {
  private draft: L02Draft
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
   * 真正的检查由插槽内“核对本课”按钮触发（checkL02）。
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
  checkL02(): JudgmentResult {
    const result = checkL02(this.draft)
    this.lastPassedCount = passedCountOf(result)
    this.lastJudgment = buildL02Judgment(result, this.draft)
    return this.lastJudgment
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getL02State(): L02State {
    return {
      checked: this.lastJudgment !== null,
      passedCount: this.lastPassedCount,
      totalChecks: TOTAL_CHECKS,
      verdict: this.lastJudgment?.conclusion ?? null,
    }
  }
}
