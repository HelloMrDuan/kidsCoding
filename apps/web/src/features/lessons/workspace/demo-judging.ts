/**
 * DEMO JUDGING ONLY — never shared-shell logic and never formal lesson data.
 *
 * This module owns the demo three-layer judgment (demo fruit target +
 * threshold + wording). The shared shell never imports it: the shell only
 * displays whatever JudgmentResult an adapter returns. The Blockly demo
 * adapter calls buildJudgment from its own getJudgmentResult; a formal
 * course adapter supplies its own rules and its own conclusion wording.
 *
 * The values here are the spec-published prototype demo values (demo-a:
 * fruit x=200, threshold 80). They are NOT formal G2-U3-L02 or A1-U3-L02
 * teaching parameters.
 */

import type { EngineState } from './workspace-adapters'
import type { ThreeLayerJudgment } from './workspace-judging'

export type { ThreeLayerJudgment }

export type RunTraceInput = {
  didMove: boolean
  usedRepeat: boolean
  finalX?: number
}

export type DemoTarget = {
  fruitX: number
  threshold: number
}

/**
 * Pure demo three-layer judgment. Behavior-based only: no block-sequence
 * matching, no comparison against a reference program. “已完成 / 已掌握”
 * appear ONLY when task AND knowledge both pass; anything else says 未合格
 * and names the failing layer.
 */
export function buildJudgment(
  target: DemoTarget | undefined,
  finalState: EngineState,
  trace: RunTraceInput,
): ThreeLayerJudgment {
  const finalX = typeof trace.finalX === 'number' ? trace.finalX : finalState.x
  const fruitX = target?.fruitX
  const threshold = target?.threshold
  const caught =
    fruitX !== undefined && threshold !== undefined
      ? Math.abs(finalX - fruitX) <= threshold
      : false
  const difference = fruitX !== undefined ? Math.abs(finalX - fruitX) : null

  const stage =
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
  const task = {
    passed: taskPassed,
    line: taskPassed
      ? '任务判定：通过——篮子真实移动并接住水果'
      : !trace.didMove
        ? '任务判定：未通过——篮子没有真实移动'
        : '任务判定：未通过——篮子移动了但没有接住水果',
  }

  const knowledgePassed = trace.usedRepeat
  const knowledge = {
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
export function traceFromDemo(trace: {
  didMove: boolean
  usedRepeat: boolean
  finalX: number
}): RunTraceInput {
  return { didMove: trace.didMove, usedRepeat: trace.usedRepeat, finalX: trace.finalX }
}
