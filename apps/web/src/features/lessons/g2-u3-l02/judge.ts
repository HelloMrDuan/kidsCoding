// 三层判定：舞台结果 / 任务判定 / 知识证据。
// 输入是真实 Scratch VM 运行出来的 RunTrace（由沙箱观察 VM 得到），本模块是纯函数，
// 不运行任何积木，也不逐块比对标准答案：只看行为。

import { L02_PARAMS, type LevelParams } from './params'

/** 篮子上每一次真实执行的“将 x 坐标增加”。 */
export type BasketMove = {
  /** 第几帧执行（第一帧为 1）。 */
  frame: number
  dx: number
  /** 这块积木是否位于“重复执行”里面（由 VM 里积木的父链得出）。 */
  inLoop: boolean
}

export type RunTrace = {
  levelId: string
  /** 同一个页面里每次运行递增，用于丢弃过期的运行结果。 */
  runId: number
  /** 运行时的程序指纹。 */
  fingerprint: string
  endedBy: 'landed' | 'stopped' | 'frameCap' | 'error'
  error?: string
  framesRun: number
  start: { basketX: number; fruitX: number }
  /** 水果第一次落到篮子高度那一帧的状态；没落地时为 null。 */
  landing: { frame: number; basketX: number; fruitX: number; fruitY: number } | null
  basketMoves: BasketMove[]
}

export type Layer = { passed: boolean; line: string }

export type RunJudgment =
  | { status: 'judged'; stage: Layer; task: Layer; knowledge: Layer; passed: boolean; conclusion: string; level: LevelParams }
  | { status: 'not-judged'; reason: string }

export function judgeRun(trace: RunTrace, level: LevelParams): RunJudgment {
  if (trace.endedBy === 'stopped') return { status: 'not-judged', reason: '运行被停止，这一次不判定。' }
  if (trace.endedBy === 'error') return { status: 'not-judged', reason: `运行出错：${trace.error ?? '未知原因'}。这一次不判定。` }
  if (trace.endedBy === 'frameCap' || !trace.landing) {
    return { status: 'not-judged', reason: '水果没有落到篮子的高度，这一次不判定。' }
  }

  const { landing } = trace
  const tolerance = L02_PARAMS.catchTolerance
  const diff = Math.abs(landing.basketX - landing.fruitX)
  const caught = diff <= tolerance

  const stage: Layer = {
    passed: caught,
    line: `舞台结果：水果落下时（第 ${landing.frame} 帧），水果 x=${landing.fruitX}，篮子 x=${landing.basketX}，` +
      `相差 ${diff}，篮子能接住的范围是 ${tolerance}，${caught ? '接住了' : '没接住'}`,
  }

  // 只统计落地那一帧（含）之前真正发生的移动：落地后才执行的积木对这次结果没有影响。
  const moves = trace.basketMoves.filter(m => m.frame <= landing.frame)
  const netAll = moves.reduce((s, m) => s + m.dx, 0)
  const loopMoves = moves.filter(m => m.inLoop && m.dx !== 0)
  const netLoop = loopMoves.reduce((s, m) => s + m.dx, 0)
  const moved = landing.basketX !== trace.start.basketX

  const task: Layer = caught && moved
    ? { passed: true, line: '任务判定：通过——篮子真的移动了，并且接住了水果' }
    : !moved
      ? { passed: false, line: '任务判定：未通过——篮子没有移动' }
      : { passed: false, line: `任务判定：未通过——篮子移动了，但离水果还差 ${diff - tolerance}（要在 ${tolerance} 以内）` }

  const loopRan = loopMoves.length >= L02_PARAMS.minLoopIterations
  const sameDirection = netAll !== 0 && Math.sign(netLoop) === Math.sign(netAll)
  const loopCarries = netAll !== 0 && sameDirection && Math.abs(netLoop) >= Math.abs(netAll) * L02_PARAMS.minLoopShare
  const knowledgePassed = loopRan && loopCarries
  let knowledgeLine: string
  if (knowledgePassed) {
    knowledgeLine = `知识证据：通过——“重复执行”里的移动一共让篮子走了 ${netLoop}（执行了 ${loopMoves.length} 次）`
  } else if (loopMoves.length === 0) {
    knowledgeLine = '知识证据：未通过——没有看到“重复执行”里的移动积木真正运行，不能写“已经会用重复”'
  } else if (!loopRan) {
    knowledgeLine = `知识证据：未通过——重复里的移动只执行了 ${loopMoves.length} 次，至少需要 ${L02_PARAMS.minLoopIterations} 次`
  } else {
    knowledgeLine = '知识证据：未通过——篮子大部分距离不是“重复执行”走出来的'
  }
  const knowledge: Layer = { passed: knowledgePassed, line: knowledgeLine }

  const passed = task.passed && knowledge.passed
  const failing = [task.passed ? null : '任务判定', knowledge.passed ? null : '知识证据'].filter(Boolean).join('、')
  const conclusion = passed
    ? '结论：这次运行满足了本节的任务和知识要求（系统只能证明这一次运行的行为，不代表已经完全掌握）'
    : `结论：这次运行还没达到要求——${failing}未通过`

  return { status: 'judged', stage, task, knowledge, passed, conclusion, level }
}

/**
 * 结果失效：判定只在“程序指纹、关卡、运行序号”三者都与当前一致时才有效。
 * 编辑脚本、切换关卡、再次运行都会让旧结果作废。
 */
export function isTraceCurrent(
  trace: RunTrace | null,
  current: { fingerprint: string; levelId: string; runId: number },
): boolean {
  return !!trace && trace.fingerprint === current.fingerprint && trace.levelId === current.levelId && trace.runId === current.runId
}
