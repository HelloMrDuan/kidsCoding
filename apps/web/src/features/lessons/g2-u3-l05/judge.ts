// 三层结果：舞台结果 / 任务结果 / 知识证据（另附一条固定的“理解情况”说明）。
// 输入是真实 Scratch VM（虚拟时钟）运行出来的 RunTrace，本模块是纯函数：不运行任何积木，不模拟时间，也不逐块比对标准答案，只看行为。
//
//   · 舞台结果 = 最终 timeLeft 是否归零（舞台上看得到的）；
//   · 任务结果 = 倒计时从本关起点开始、从不为负、广播恰好一次、广播之后得分不再变化、倒计时期间得过分；
//   · 知识证据 = 广播之前，真实 VM 里“timeLeft < 1”这个判断真的被求值过，并且在结束的那一刻求值为真
//     （看的是由 timeLeft 决定何时结束，而不是写死一个次数；写死 10 次在起点是 10 的关卡里行为完全一样，只有这条能区分）。

import type { LevelParams } from './params'
import { L05_PARAMS } from './params'

/** 每一帧结束时舞台上两个变量的值（已统一转成数字：“设置变量为”写进去的是文本）。 */
export type Frame = { frame: number; timeLeft: number; score: number }
/** 一次真实的 operator_lt 求值（学生的“timeLeft < 1”）。 */
export type Check = { frame: number; value: number; result: boolean }

export type RunTrace = {
  levelId: string
  /** 同一个页面里每次运行递增，用于丢弃过期的运行结果。 */
  runId: number
  /** 运行时的程序指纹。 */
  fingerprint: string
  /** finished：学生脚本自然结束并多看了 settleFrames 帧；stopped：被学生停止；frameCap：超过帧上限；error：沙箱或 VM 出错。 */
  endedBy: 'finished' | 'stopped' | 'frameCap' | 'error'
  error?: string
  frames: Frame[]
  /** 收到“游戏结束”广播的帧号（每次广播一条）。 */
  broadcasts: number[]
  checks: Check[]
}

export type Layer = { passed: boolean; line: string }

export const UNDERSTANDING_NOTE =
  '理解情况：系统只能看到这一次运行的行为，看不出你是否明白为什么要让“timeLeft 小于 1”来决定什么时候结束——需要进一步解释或练习（比如换一个起点秒数再做一次，或者对别人说一说你是怎么想的）。'

export type RunJudgment =
  | { status: 'judged'; stage: Layer; task: Layer; knowledge: Layer; understanding: string; passed: boolean; conclusion: string; level: LevelParams }
  | { status: 'not-judged'; reason: string }

export function finalOf(trace: RunTrace): Frame | undefined {
  return trace.frames[trace.frames.length - 1]
}

export function judgeRun(trace: RunTrace, level: LevelParams): RunJudgment {
  if (trace.endedBy === 'stopped') return { status: 'not-judged', reason: '运行被停止，这一次不判定。' }
  if (trace.endedBy === 'error') return { status: 'not-judged', reason: `运行出错：${trace.error ?? '未知原因'}。这一次不判定。` }
  if (trace.endedBy === 'frameCap') return { status: 'not-judged', reason: '运行太久没有结束，这一次不判定。' }

  const last = finalOf(trace)
  const finalTime = last?.timeLeft ?? 0
  const minTime = trace.frames.reduce((m, f) => Math.min(m, f.timeLeft), Number.POSITIVE_INFINITY)
  const maxTime = trace.frames.reduce((m, f) => Math.max(m, f.timeLeft), Number.NEGATIVE_INFINITY)

  // ---- 舞台结果：最终 timeLeft ----
  // timeLeft 的初始值本来就是 0，所以“最后是 0”对没写程序的孩子也成立：必须真的从大于 0 的数数下来才算数到 0。
  const everCountedDown = trace.frames.some(f => f.timeLeft > 0)
  const stage: Layer = !everCountedDown
    ? { passed: false, line: '舞台结果：倒计时没有开始——timeLeft 一直是 0，没有数过' }
    : finalTime === 0
      ? { passed: true, line: '舞台结果：倒计时从大于 0 一路数到了 0 秒' }
      : { passed: false, line: finalTime < 0 ? `舞台结果：倒计时最后变成了 ${finalTime} 秒，时间不应该变成负数` : `舞台结果：倒计时最后还剩 ${finalTime} 秒，没有数到 0` }

  // ---- 任务结果 ----
  const problems: string[] = []
  const first = trace.broadcasts[0]
  if (maxTime !== level.startSeconds) problems.push(`倒计时没有从本关要求的 ${level.startSeconds} 秒开始（最高只到 ${Number.isFinite(maxTime) ? maxTime : 0} 秒）`)
  if (minTime < 0) problems.push(`时间变成了负数（最低 ${minTime} 秒）`)
  if (trace.broadcasts.length === 0) problems.push('“游戏结束”一次都没有广播')
  else if (trace.broadcasts.length > 1) problems.push(`“游戏结束”广播了 ${trace.broadcasts.length} 次，应该只广播一次`)
  if (first !== undefined) {
    const at = trace.frames.find(f => f.frame === first)
    const scoreAtOver = at?.score ?? 0
    if (scoreAtOver === 0) problems.push('倒计时期间一分都没有得到')
    const changedAfter = trace.frames.filter(f => f.frame > first && f.score !== scoreAtOver)
    if (changedAfter.length > 0) problems.push(`“游戏结束”之后得分还在变（从 ${scoreAtOver} 分变到 ${changedAfter[changedAfter.length - 1].score} 分）`)
    // 广播应该发生在归零的时候：广播那一帧 timeLeft 必须已经是 0
    if (at && at.timeLeft !== 0 && !problems.some(p => p.startsWith('“游戏结束”之后'))) problems.push(`“游戏结束”广播的时候还剩 ${at.timeLeft} 秒，应该等数到 0 再广播`)
  }
  const task: Layer = problems.length === 0
    ? { passed: true, line: '任务结果：本次任务达标——从 ' + level.startSeconds + ' 秒数到 0，没有出现负数，数到 0 时广播了一次“游戏结束”，之后得分不再变化' }
    : { passed: false, line: `任务结果：本次任务未达标——${problems.join('；')}` }

  // ---- 知识证据：广播之前，真实 VM 求值过“timeLeft < 1”，且在结束的那一刻为真 ----
  let knowledge: Layer
  if (trace.checks.length === 0) {
    knowledge = { passed: false, line: '知识证据：本次程序没有满足判断要求——没有看到“timeLeft < 1”被检查过，结束的时机是靠写死的次数决定的' }
  } else if (first === undefined) {
    knowledge = { passed: false, line: '知识证据：本次程序没有满足判断要求——“timeLeft < 1”检查过，但之后没有广播“游戏结束”' }
  } else {
    // 结束那一刻：广播之前（含同一帧）最近的一次检查必须为真，并且检查时 timeLeft 确实 < 1
    const before = trace.checks.filter(c => c.frame <= first)
    const lastCheck = before[before.length - 1]
    if (!lastCheck) {
      knowledge = { passed: false, line: '知识证据：本次程序没有满足判断要求——广播之前没有看到“timeLeft < 1”被检查' }
    } else if (!lastCheck.result || lastCheck.value >= 1) {
      knowledge = { passed: false, line: `知识证据：本次程序没有满足判断要求——广播之前最后一次检查时 timeLeft 是 ${lastCheck.value}，“timeLeft < 1”还不是真的` }
    } else if (first - lastCheck.frame > L05_PARAMS.broadcastSlackFrames) {
      knowledge = { passed: false, line: '知识证据：本次程序没有满足判断要求——“timeLeft < 1”为真之后，隔了很久才广播，两件事不相连' }
    } else {
      knowledge = { passed: true, line: '知识证据：本次程序满足判断要求——倒计时是在“timeLeft < 1”这个判断为真的时候结束的，不是写死的次数。这条结论只看结束是不是由判断决定，不只看最后的数字' }
    }
  }

  const passed = stage.passed && task.passed && knowledge.passed
  const failing = [stage.passed ? null : '舞台结果', task.passed ? null : '任务结果', knowledge.passed ? null : '知识证据'].filter(Boolean).join('、')
  const conclusion = passed
    ? '本次运行：任务达标，也满足了判断要求。这只说明这一次运行的行为。'
    : `本次运行：还没达到要求——${failing}未通过。`

  return { status: 'judged', stage, task, knowledge, understanding: UNDERSTANDING_NOTE, passed, conclusion, level }
}

/** 结果失效：判定只在“程序指纹、关卡、运行序号”三者都与当前一致时才有效。 */
export function isTraceCurrent(
  trace: RunTrace | null,
  current: { fingerprint: string; levelId: string; runId: number },
): boolean {
  return !!trace && trace.fingerprint === current.fingerprint && trace.levelId === current.levelId && trace.runId === current.runId
}
