/**
 * A1-U3-L06 问答助手适配器（QaAdapter）。
 *
 * 依据：共享 LessonWorkspace 适配器接口（workspace-adapters.ts）。
 * 对插槽课，外壳不挂载适配器：路由只建实例作类型合规与测试载体，
 * 实时核对走插槽直连判定器（本文件 buildQaJudgment），与 L03 一致。
 *
 * 判定三层分离（P0 规范）：
 * - 舞台结果层：八问逐项判定（是否问过、预测的答/拒与助手实际是否一致）。
 * - 任务判定层：八问全部通过为合格，否则未合格并列出未通过问号。
 * - 知识证据层：方法证据——提问分布计数与迁移提问计数（只记计数，
 *   不记问题原文、答案原文、学生身份）。
 * - “已掌握”只在任务与知识证据同时通过时出现；本课知识证据永不
 *   直接写“已掌握”，结论只写合格/未合格。
 *
 * 判定永不写入草稿：编辑后旧判定失效，须重新点“核对八问”才出结果。
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
import type { L06Draft } from './a1-u3-l06-draft'
import { coerceDraft, emptyDraft, isValidDraftShape } from './a1-u3-l06-draft'
import {
  ERROR_EXAMPLES,
  checkCustomQuestion,
  checkErrorExample,
  checkQaDrill,
  type QaCheckResult,
} from './a1-u3-l06'

const TOTAL_CHECKS = 8

/** 方法证据：只记计数，不记问题原文、答案原文、学生身份。 */
export function methodEvidenceForQa(draft: L06Draft, result: QaCheckResult): string {
  const refused = result.checks.filter(
    (check) => check.category === '超范围类' && check.passed,
  ).length
  const customCorrect = draft.custom.filter(
    (custom) => checkCustomQuestion(custom).correct,
  ).length
  const errorsIdentified = ERROR_EXAMPLES.filter((example) => {
    const picked = draft.errorChecks[example.id]
    return picked !== undefined && picked === checkErrorExample(example).kind
  }).length
  return `方法证据：已问 ${result.checks.filter((check) => check.asked).length}/8，预测正确 ${result.passedCount}/8；拒答 ${refused}/2（Q7、Q8）；迁移提问 ${draft.custom.length} 个（预测正确 ${customCorrect} 个）；错误示例已识别 ${errorsIdentified}/2。`
}

/** 通过问数（fail-closed：未核对的结果一律 0 通过）。 */
export function passedCountOf(result: QaCheckResult): number {
  return result.passed ? TOTAL_CHECKS : result.passedCount
}

/**
 * 由一次核对结果构建三层判定。空检查列表不判过（fail-closed）；
 * 未问、未预测、预测错，一律列为未通过问号。
 */
export function buildQaJudgment(result: QaCheckResult, draft: L06Draft): JudgmentResult {
  const passedCount = result.passedCount
  const failedIds = result.checks.filter((check) => !check.passed).map((check) => check.id)
  const stageDetail =
    result.checks.length === 0
      ? '检查结果：尚未核对八问。'
      : result.passed
        ? '检查结果：八问全部通过（事实类 4、方法类 2、超范围类 2）。'
        : `检查结果：八问中通过 ${passedCount} 项，未通过：${failedIds.join('、')}。`
  const taskDetail = result.passed
    ? '任务判定：合格：八问全部通过。'
    : `任务判定：未合格：还有 ${failedIds.length} 问未通过（${failedIds.join('、')}）。`
  const evidence = methodEvidenceForQa(draft, result)
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
    conclusion: result.passed ? '结论：本次问答合格。' : '结论：未合格。',
    methodEvidence: evidence,
  }
}

export type QaState = {
  checked: boolean
  passedCount: number
  totalChecks: number
  verdict: string | null
}

export class QaAdapter implements EngineAdapter {
  private draft: L06Draft
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
   * 真正的检查由插槽内“核对八问”按钮触发（checkQa）。
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

  /** 核对当前草稿八问并记录三层判定（不写入草稿）。 */
  checkQa(): JudgmentResult {
    const result = checkQaDrill(this.draft)
    this.lastPassedCount = passedCountOf(result)
    this.lastJudgment = buildQaJudgment(result, this.draft)
    return this.lastJudgment
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getQaState(): QaState {
    return {
      checked: this.lastJudgment !== null,
      passedCount: this.lastPassedCount,
      totalChecks: TOTAL_CHECKS,
      verdict: this.lastJudgment?.conclusion ?? null,
    }
  }
}
