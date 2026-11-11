/**
 * A1-U3-L04 检索适配器（RetrievalAdapter）。
 *
 * 依据：共享 LessonWorkspace 适配器接口（workspace-adapters.ts）。
 * 对插槽课，外壳不挂载适配器：路由只建实例作类型合规与测试载体，
 * 实时校验走插槽直连判定器（本文件 buildA1U3L04Judgment），与 L02/L03 一致。
 *
 * 判定三层分离（P0 规范）：
 * - 舞台结果层：五项检查逐项判定（关键词有效 / 四问答完 / 四问答对 /
 *   可用清单正确 / 规则说明完整）；关键词无效时该层先报关键词问题，
 *   不把“没检索出可用资料”说成通过。
 * - 任务判定层：五项全部通过为合格，否则未合格并列出未通过项名。
 * - 知识证据层：方法证据——提示词构成、检索结果与四问判断过程
 *   （不核验资料真假，只核验四问是否答对）。
 * - 结论只写“本次检索合格。”或“未合格。”，不写掌握结论。
 *
 * 判定永不写入草稿：编辑后旧判定失效，须重新点校验才出结果。
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
import type { L04Draft } from './a1-u3-l04-draft'
import { coerceDraft, emptyDraft, isValidDraftShape } from './a1-u3-l04-draft'
import {
  methodEvidenceForRetrieval,
  validateRetrieval,
  type L04Validation,
  type RetrievalInput,
} from './a1-u3-l04'

const TOTAL_CHECKS = 5

/** 方法证据：提示词构成、检索结果与四问判断过程（不核验资料真假）。 */
export function methodEvidenceForDraft(draft: L04Draft, validation: L04Validation): string {
  return methodEvidenceForRetrieval(draft, validation)
}

/** 通过项数：五项中通过的项数（未通过项 = failedChecks 的长度）。 */
export function passedCountOf(validation: L04Validation): number {
  return validation.passed ? TOTAL_CHECKS : TOTAL_CHECKS - validation.failedChecks.length
}

/**
 * 由一次校验结果构建三层判定。空检查列表不判过（fail-closed）；
 * 关键词无效时舞台层先报关键词问题，任务层为未合格（不把“没检索出
 * 可用资料”说成通过）。
 */
export function buildA1U3L04Judgment(
  validation: L04Validation,
  draft: RetrievalInput,
): JudgmentResult {
  const passedCount = passedCountOf(validation)
  let stageDetail: string
  if (validation.passed) {
    stageDetail =
      '检查结果：五项全部通过（关键词有效、四问答完、四问答对、可用清单正确、规则说明完整）。'
  } else if (validation.failedChecks.includes('关键词有效')) {
    const keywordError = validation.fieldErrors.find((error) => error.field === '关键词')
    const reason = keywordError ? keywordError.why.replace(/。$/, '') : '关键词不符合要求'
    stageDetail = `检查结果：关键词无效（${reason}），尚未检索出可用资料。`
  } else {
    stageDetail = `检查结果：五项中通过 ${passedCount} 项，未通过：${validation.failedChecks.join('、')}。`
  }
  const taskDetail = validation.passed
    ? '任务判定：合格：五项全部通过。'
    : `任务判定：未合格：还有 ${validation.failedChecks.length} 项未通过（${validation.failedChecks.join('、')}）。`
  const evidence = methodEvidenceForRetrieval(draft, validation)
  return {
    layers: [
      { id: 'stage', label: '检查结果', passed: validation.passed, detail: stageDetail },
      { id: 'task', label: '任务判定', passed: validation.passed, detail: taskDetail },
      { id: 'knowledge', label: '知识证据', passed: validation.passed, detail: evidence },
    ],
    passed: validation.passed,
    conclusion: validation.passed ? '本次检索合格。' : '未合格。',
    methodEvidence: evidence,
  }
}

export type RetrievalState = {
  checked: boolean
  passedCount: number
  totalChecks: number
  verdict: string | null
}

export class A1U3L04Adapter implements EngineAdapter {
  private draft: L04Draft
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
   * 真正的检查由插槽内检查按钮触发（checkRetrieval）。
   */
  run(onEvent: (event: RunEvent) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: nothing is playing to cancel.
  }

  /** 恢复校验：严格形状（不降级）；非法时外壳回初始脚本，不覆盖好草稿。 */
  validateDraft(script: unknown): boolean {
    return isValidDraftShape(script)
  }

  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  /** 校验当前草稿并记录三层判定（不写入草稿）。 */
  checkRetrieval(): JudgmentResult {
    const validation = validateRetrieval(this.draft)
    this.lastPassedCount = passedCountOf(validation)
    this.lastJudgment = buildA1U3L04Judgment(validation, this.draft)
    return this.lastJudgment
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getRetrievalState(): RetrievalState {
    return {
      checked: this.lastJudgment !== null,
      passedCount: this.lastPassedCount,
      totalChecks: TOTAL_CHECKS,
      verdict: this.lastJudgment?.conclusion ?? null,
    }
  }
}
