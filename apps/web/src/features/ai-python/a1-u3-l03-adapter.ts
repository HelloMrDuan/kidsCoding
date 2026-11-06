/**
 * A1-U3-L03 JSON 校验适配器（JsonAdapter）。
 *
 * 依据：共享 LessonWorkspace 适配器接口（workspace-adapters.ts）。
 * 对插槽课，外壳不挂载适配器：路由只建实例作类型合规与测试载体，
 * 实时校验走插槽直连判定器（本文件 buildJsonJudgment），与 L02 一致。
 *
 * 判定三层分离（P0 规范）：
 * - 舞台结果层：五项检查逐项判定（字段齐全 / 必填非空 / 类型正确 /
 *   枚举内 / 数值范围）；JSON 格式错误时该层先报格式错，不假装已校验。
 * - 任务判定层：五项全部通过为合格，否则未合格并列出未通过项名。
 * - 知识证据层：方法证据——字段构成与修错过程（不核验记录真假，
 *   多余字段校验器忽略，直径可选）。
 * - “已掌握”只在任务与知识证据同时通过时出现；本课知识证据永不
 *   直接写“已掌握”，结论只写合格/未合格。
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
import type { L03Draft } from './a1-u3-l03-draft'
import { coerceDraft, emptyDraft, isValidDraftShape } from './a1-u3-l03-draft'
import { FRUIT_SCHEMA_FIELDS, validateRecordText, type RecordValidation } from './a1-u3-l03'

const TOTAL_CHECKS = 5

function extraKeysOf(record: Record<string, unknown>): string[] {
  const known = new Set<string>(FRUIT_SCHEMA_FIELDS.map((f) => f.field))
  return Object.keys(record).filter((key) => !known.has(key))
}

/** 方法证据：字段构成（不核验记录真假）。 */
export function methodEvidenceForRecord(draft: L03Draft): string {
  const text = draft.jsonText.trim()
  if (!text) return '方法证据：尚未写记录（先选一个例子或写一条 JSON 记录）。'
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return '方法证据：尚未得到可校验的记录（先修 JSON 格式）。'
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return '方法证据：尚未得到可校验的记录（须为 JSON 对象）。'
  }
  const record = parsed as Record<string, unknown>
  const keys = Object.keys(record)
  const required = FRUIT_SCHEMA_FIELDS.filter((f) => f.required)
  const presentRequired = required.filter(
    (f) => record[f.field] !== undefined && record[f.field] !== null && record[f.field] !== '',
  ).length
  const extra = extraKeysOf(record)
  return `方法证据：记录共 ${keys.length} 个字段（${keys.join('、') || '无'}），必填 ${required.length} 项已写 ${presentRequired} 项；多余字段 ${extra.length} 个（校验器忽略，不影响通过）。`
}

/**
 * 通过项数：JSON 格式错误时五项尚未校验，通过数为 0（fail-closed，
 * 不得把“0 项未通过”说成通过 5 项）。
 */
export function passedCountOf(result: RecordValidation): number {
  if (!result.parseOk) return 0
  return result.passed ? TOTAL_CHECKS : TOTAL_CHECKS - result.failedChecks.length
}

/**
 * 由一次校验结果构建三层判定。空检查列表不判过（fail-closed）；
 * JSON 格式错误时舞台层先报格式错，任务层为未合格（不写“0 项未通过”，
 * 格式错误不是“五项里挂了 0 项”，而是五项尚未校验）。
 */
export function buildJsonJudgment(result: RecordValidation, draft: L03Draft): JudgmentResult {
  const passedCount = passedCountOf(result)
  const stageDetail = !result.parseOk
    ? `检查结果：${result.parseError ?? 'JSON 格式错误'}（尚未校验五项）。`
    : result.failedChecks.length === 0
      ? '检查结果：五项全部通过（字段齐全、必填非空、类型正确、枚举内、数值范围）。'
      : `检查结果：五项中通过 ${passedCount} 项，未通过：${result.failedChecks.join('、')}。`
  const taskDetail = result.passed
    ? '任务判定：合格：五项全部通过。'
    : !result.parseOk
      ? '任务判定：未合格：JSON 格式错误，尚未校验五项。'
      : `任务判定：未合格：还有 ${result.failedChecks.length} 项未通过（${result.failedChecks.join('、')}）。`
  return {
    layers: [
      { id: 'stage', label: '检查结果', passed: result.passed, detail: stageDetail },
      { id: 'task', label: '任务判定', passed: result.passed, detail: taskDetail },
      {
        id: 'knowledge',
        label: '知识证据',
        passed: result.passed,
        detail: methodEvidenceForRecord(draft),
      },
    ],
    passed: result.passed,
    conclusion: result.passed ? '结论：本次记录合格。' : '结论：未合格。',
    methodEvidence: methodEvidenceForRecord(draft),
  }
}

export type JsonState = {
  checked: boolean
  passedCount: number
  totalChecks: number
  verdict: string | null
}

export class JsonAdapter implements EngineAdapter {
  private draft: L03Draft
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
   * 真正的检查由插槽内检查按钮触发（checkRecord）。
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

  /** 校验当前草稿 JSON 并记录三层判定（不写入草稿）。 */
  checkRecord(): JudgmentResult {
    const result = validateRecordText(this.draft.jsonText)
    this.lastPassedCount = passedCountOf(result)
    this.lastJudgment = buildJsonJudgment(result, this.draft)
    return this.lastJudgment
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getJsonState(): JsonState {
    return {
      checked: this.lastJudgment !== null,
      passedCount: this.lastPassedCount,
      totalChecks: TOTAL_CHECKS,
      verdict: this.lastJudgment?.conclusion ?? null,
    }
  }
}
