/**
 * Generic three-layer judgment DISPLAY conversion — shared shell only.
 *
 * This module contains no course or demo values: no fruit targets, no
 * thresholds, no judgment wording. It only defines the three-layer shape
 * (stage / task / knowledge) and converts it into the generic
 * JudgmentResult display shape the shell renders. The values and the
 * pass/fail rules always come from a course adapter (see demo-judging.ts
 * for the demo's own builder, which the shared shell never imports).
 */

import type { JudgmentResult } from './workspace-slots'

export type JudgeLayer = {
  passed: boolean
  line: string
}

export type ThreeLayerJudgment = {
  stage: JudgeLayer
  task: JudgeLayer
  knowledge: JudgeLayer
  passed: boolean
  conclusion: string
}

/**
 * Convert a three-layer judgment into the generic display shape.
 * Layer ids map to the shell's feedback testids
 * (ws-feedback-stage / ws-feedback-task / ws-feedback-knowledge).
 * Adapters that return a JudgmentResult directly use their own layer ids.
 */
export function toJudgmentResult(judgment: ThreeLayerJudgment): JudgmentResult {
  return {
    layers: [
      { id: 'stage', label: '舞台结果', passed: judgment.stage.passed, detail: judgment.stage.line },
      { id: 'task', label: '任务判定', passed: judgment.task.passed, detail: judgment.task.line },
      { id: 'knowledge', label: '知识证据', passed: judgment.knowledge.passed, detail: judgment.knowledge.line },
    ],
    passed: judgment.passed,
    conclusion: judgment.conclusion,
  }
}
