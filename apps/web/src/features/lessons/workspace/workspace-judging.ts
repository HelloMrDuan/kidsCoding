/**
 * Pure three-layer judging builder — LESSON-CONTRACT.md §3 / ACCEPTANCE.md §4.
 *
 * Behavior-based only: no block-sequence matching, no comparison against a
 * reference program. Inputs are the final EngineState, the run trace, and the
 * contract's judging rules. “已完成 / 已掌握” appear ONLY when task AND
 * knowledge both pass; anything else says 未合格 and names the failing layer.
 *
 * The R1–R7 equivalents from ACCEPTANCE.md are covered by the unit tests of
 * this module (demo fruit x=200, threshold 80):
 * - R1 hat only: stage not caught, task fail, knowledge fail, not passed.
 * - R2 caught without repeat: task pass, knowledge fail, conclusion not passed.
 * - R3 wrong param: not caught, not passed.
 * - R4 moved but short of target: not caught.
 * - R5 different structure, behavior passes: task pass (no block matching).
 * - R6 repeat version: task + knowledge pass, conclusion passed.
 * - R7 stop-then-rerun score behavior lives in the adapter lifecycle and is
 *   covered by the browser E2E (score 1 after rerun, still 1 after another run).
 */

import type { LessonContract } from './lesson-contract'
import type { EngineState } from './workspace-adapters'
import type { JudgmentResult } from './workspace-slots'
import type { DemoRunTrace } from './blockly-adapter'

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

export type RunTraceInput = {
  didMove: boolean
  usedRepeat: boolean
  finalX?: number
}

export function buildJudgment(
  contract: LessonContract,
  finalState: EngineState,
  trace: RunTraceInput,
): ThreeLayerJudgment {
  const target = contract.judging.target
  const finalX = typeof trace.finalX === 'number' ? trace.finalX : finalState.x
  const fruitX = target?.fruitX
  const threshold = target?.threshold
  const caught =
    fruitX !== undefined && threshold !== undefined
      ? Math.abs(finalX - fruitX) <= threshold
      : false
  const difference = fruitX !== undefined ? Math.abs(finalX - fruitX) : null

  const stage: JudgeLayer =
    fruitX !== undefined && threshold !== undefined
      ? {
          passed: caught,
          line: `舞台结果：篮子 x=${finalX}，水果 x=${fruitX}，差值 ${difference}，阈值 ${threshold}，${caught ? '接住' : '未接住'}`,
        }
      : {
          passed: false,
          line: `舞台结果：篮子 x=${finalX}（本演示未提供水果目标参数，无法判定接住）`,
        }

  const taskPassed = trace.didMove && caught
  const task: JudgeLayer = {
    passed: taskPassed,
    line: taskPassed
      ? '任务判定：通过——篮子真实移动并接住水果'
      : !trace.didMove
        ? '任务判定：未通过——篮子没有真实移动'
        : '任务判定：未通过——篮子移动了但没有接住水果',
  }

  const knowledgePassed = trace.usedRepeat
  const knowledge: JudgeLayer = {
    passed: knowledgePassed,
    line: knowledgePassed
      ? '知识证据：通过——循环确实移动了角色'
      : '知识证据：未通过——没有证据表明循环移动了角色，不得写已掌握',
  }

  const passed = taskPassed && knowledgePassed
  const failedLayers = [
    ...(taskPassed ? [] : ['任务判定']),
    ...(knowledgePassed ? [] : ['知识证据']),
  ]
  const conclusion = passed
    ? '结论：已完成，已掌握'
    : `结论：未合格——${failedLayers.join('、')}未通过`

  return { stage, task, knowledge, passed, conclusion }
}

/** Convenience: build a trace from a demo adapter run result. */
export function traceFromDemo(trace: DemoRunTrace): RunTraceInput {
  return { didMove: trace.didMove, usedRepeat: trace.usedRepeat, finalX: trace.finalX }
}

/**
 * Convert the demo three-layer judgment into the generic display shape.
 * Layer ids map to the shell's existing feedback testids
 * (ws-feedback-stage / ws-feedback-task / ws-feedback-knowledge), so the
 * demo display is unchanged; adapters that return a JudgmentResult
 * directly use their own layer ids instead.
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
