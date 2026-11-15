// 三层结果：舞台结果 / 任务结果 / 知识证据（另附一条固定的“理解情况”说明）。
// 输入是真实 Scratch VM（带真实渲染器）运行出来的 RunTrace（由沙箱观察 VM 得到），本模块是纯函数，
// 不运行任何积木，不模拟碰撞，也不自己掷随机数：只看行为。
//
// 三层分工（见 TEACHING-PLAN 第四节）：
//   · 舞台结果 = 这局游戏是否按结束条件真的结束了，并显示了与真实变量一致的结果（接满获胜 / 时间到）；
//   · 任务结果 = 逐颗核算游戏规则：每一次得分之前同一帧“碰到篮子？”必须为真、每颗水果最多得一次分、
//     时间到之后不得再得分（契约的错误路线“过期水果继续加分”）、有碰到却没得分说明程序漏了记分；
//   · 知识证据（随机）= 每一次出生点的 x 都来自真实 operator_random 的同帧求值，且一局里出现过
//     至少 3 个互不相同的出生点——出生点写死或只换一两个位置，都不算用随机完成了接力。

import type { LevelParams } from './params'
import { L06_PARAMS } from './params'

/** 一次真实的 operator_random 求值（只记录水果脚本里的，舞台/篮子脚本不用随机）。 */
export type RandomEvent = { frame: number; value: number }
/** 一次水果出生：水果的 x 被设为某个值（来自 compile 生成的出生序列）。 */
export type SpawnEvent = { frame: number; x: number }
/** 一次真实的 sensing_touchingobject 调用（水果检测篮子）。 */
export type Check = { frame: number; result: boolean }
/** 一次真实的 data_changevariableby（把“得分”增加 by）。 */
export type ScoreEvent = { frame: number; by: number }
/** 一次真实的 looks_hide（水果）。 */
export type HideEvent = { frame: number }

export type RunTrace = {
  levelId: string
  /** 同一个页面里每次运行递增，用于丢弃过期的运行结果。 */
  runId: number
  /** 运行时的程序指纹。 */
  fingerprint: string
  /** finished：按结束条件收尾；stopped：被学生停止；frameCap：超过帧上限；error：沙箱或 VM 出错。 */
  endedBy: 'finished' | 'stopped' | 'frameCap' | 'error'
  error?: string
  framesRun: number
  /** win：得分达到获胜目标；timeup：倒计时归零；null：两者都没发生（如帧上限）。 */
  endReason: 'win' | 'timeup' | null
  /** 得分第一次达到获胜目标的帧（没有则为 null）。 */
  winFrame: number | null
  /** “时间”第一次小于 1 的帧（没有则为 null）。 */
  timeupFrame: number | null
  /** 按发生顺序记录。 */
  randoms: RandomEvent[]
  spawns: SpawnEvent[]
  checks: Check[]
  scores: ScoreEvent[]
  hides: HideEvent[]
  /** 结束时舞台上“得分”与“时间”变量的值（真实 VM 回报）。 */
  finalScore: number
  finalTimeLeft: number
  /** 结束时水果是否还看得见、篮子最后的 x。 */
  fruitVisible: boolean
  basketX: number
}

export type Layer = { passed: boolean; line: string }

/** 系统无法判断学生是否理解的固定说明：每一次判定都展示，不因任务通过而省略。 */
export const UNDERSTANDING_NOTE =
  '理解情况：系统只能看到这一次运行的行为，看不出你是否明白“随机”为什么每次给的位置都不一样——需要进一步解释或练习（比如说一说下一颗水果可能出现在哪里、为什么不能提前知道）。'

export type RunJudgment =
  | { status: 'judged'; stage: Layer; task: Layer; knowledge: Layer; understanding: string; passed: boolean; conclusion: string; level: LevelParams }
  | { status: 'not-judged'; reason: string }

/** 没有被条件挡住的得分：加分的那一帧必须有一次“碰到篮子？”检查且返回 true。 */
function unguardedScores(trace: RunTrace): ScoreEvent[] {
  return trace.scores.filter(s => !trace.checks.some(c => c.frame === s.frame && c.result))
}

/** 每颗水果（两次出生之间为一段）最多只能得一次分；返回违规的得分。 */
function repeatedScores(trace: RunTrace): ScoreEvent[] {
  const out: ScoreEvent[] = []
  const sorted = [...trace.scores].sort((a, b) => a.frame - b.frame)
  for (const s of sorted) {
    const segStart = [...trace.spawns].filter(sp => sp.frame <= s.frame).pop()
    const segEnd = trace.spawns.find(sp => sp.frame > s.frame)
    const inSeg = sorted.filter(o => o !== s && o.frame >= (segStart ? segStart.frame : 0) && o.frame < (segEnd ? segEnd.frame : Infinity) && o.frame <= s.frame)
    if (inSeg.length > 0) out.push(s)
  }
  return out
}

export function judgeRun(trace: RunTrace, level: LevelParams): RunJudgment {
  if (trace.endedBy === 'stopped') return { status: 'not-judged', reason: '运行被停止，这一次不判定。' }
  if (trace.endedBy === 'error') return { status: 'not-judged', reason: `运行出错：${trace.error ?? '未知原因'}。这一次不判定。` }
  if (trace.endedBy === 'frameCap') return { status: 'not-judged', reason: '运行太久没有结束，这一次不判定。' }

  const scoreSum = trace.scores.reduce((a, s) => a + s.by, 0)
  const catches = trace.scores.length

  // ---- 舞台结果：游戏按结束条件结束，结果与真实变量一致 ----
  let stage: Layer
  if (trace.endReason === 'win' && trace.finalScore >= level.winTarget && trace.finalScore === scoreSum) {
    stage = { passed: true, line: `舞台结果：接满 ${level.winTarget} 颗，游戏获胜结束，舞台上的得分是 ${trace.finalScore} 分` }
  } else if (trace.endReason === 'timeup' && trace.finalTimeLeft < 1 && trace.finalScore === scoreSum) {
    stage = { passed: true, line: `舞台结果：倒计时结束，游戏显示了结果——一共接住 ${trace.finalScore} 颗水果` }
  } else if (trace.endReason === null) {
    stage = { passed: false, line: '舞台结果：这局没有按结束条件结束（既没有接满，也没有等到倒计时结束）' }
  } else {
    stage = { passed: false, line: `舞台结果：舞台上的得分（${trace.finalScore}）和实际接住的次数对不上` }
  }

  // ---- 任务结果：逐颗核算游戏规则 ----
  const problems: string[] = []
  const unguarded = unguardedScores(trace)
  if (unguarded.length > 0) problems.push(`${unguarded.length} 次得分之前没有确认“碰到篮子？”是真的（没碰到篮子不能得分）`)
  const repeated = repeatedScores(trace)
  if (repeated.length > 0) problems.push(`同一颗水果被重复记了 ${repeated.length} 次分（一颗只能算一次）`)
  if (trace.timeupFrame !== null) {
    const late = trace.scores.filter(s => s.frame > (trace.timeupFrame as number))
    if (late.length > 0) problems.push(`倒计时结束之后还加了 ${late.length} 次分（过期水果不能再加分）`)
  }
  if (trace.spawns.length > 0 && trace.randoms.length === 0 && trace.scores.length > 0) {
    // 出生没用随机但得分了：规则层面先记一笔，知识层会详细说明
    problems.push('水果的出生位置不是随机决定的')
  }
  // 有碰到篮子的那一段里必须恰好有一次得分（漏记分）；从未碰到则不算程序的错（接球靠玩家移动篮子）。
  let missed = 0
  trace.spawns.forEach((sp, i) => {
    const segEnd = i + 1 < trace.spawns.length ? trace.spawns[i + 1].frame : Infinity
    const touched = trace.checks.some(c => c.frame >= sp.frame && c.frame < segEnd && c.result)
    const scored = trace.scores.some(s => s.frame >= sp.frame && s.frame < segEnd)
    if (touched && !scored) missed += 1
  })
  if (missed > 0) problems.push(`${missed} 颗水果碰到了篮子却没有记分（程序漏了“将得分增加”）`)
  const task: Layer = problems.length === 0
    ? {
        passed: true,
        line: catches > 0
          ? `任务结果：规则都对——${catches} 次得分都发生在碰到篮子的那一刻，每颗水果只算一次，时间到之后没有再加分`
          : '任务结果：程序没有违反任何规则（这局篮子没有接到水果，接球靠你移动篮子，不算程序的错）',
      }
    : { passed: false, line: `任务结果：本次任务未达标——${problems.join('；')}` }

  // ---- 知识证据：随机真的被用来决定出生点 ----
  let knowledge: Layer
  const distinctX = new Set(trace.spawns.map(s => s.x)).size
  const allPaired = trace.spawns.every(sp => trace.randoms.some(r => r.frame === sp.frame && r.value === sp.x))
  if (trace.spawns.length === 0) {
    knowledge = { passed: false, line: '知识证据：这局一颗水果都没有出生——没有看到“随机”被用上' }
  } else if (trace.randoms.length === 0) {
    knowledge = { passed: false, line: '知识证据：水果出生了，但位置不是“随机”积木给的——没有看到随机数被求值' }
  } else if (!allPaired) {
    knowledge = { passed: false, line: '知识证据：有的出生位置和随机数对不上——出生点的 x 不是直接用随机积木的结果' }
  } else if (trace.spawns.length < 3 || distinctX < 3) {
    knowledge = {
      passed: false,
      line: `知识证据：只出生了 ${trace.spawns.length} 颗水果、出现了 ${distinctX} 个不同的位置——接力次数太少，还看不出“随机”是每次都不一样`,
    }
  } else {
    knowledge = {
      passed: true,
      line: `知识证据：本次程序用上了随机——${trace.spawns.length} 次出生都用了随机积木，一共出现了 ${distinctX} 个不同的位置，每次都不一样`,
    }
  }

  const passed = stage.passed && task.passed && knowledge.passed
  const failing = [stage.passed ? null : '舞台结果', task.passed ? null : '任务结果', knowledge.passed ? null : '知识证据'].filter(Boolean).join('、')
  const conclusion = passed
    ? trace.endReason === 'win'
      ? '本次运行：任务达标，也用对了随机。这只说明这一次运行的行为。'
      : '本次运行：规则与随机都达标，倒计时结束时显示了结果。这只说明这一次运行的行为。'
    : `本次运行：还没达到要求——${failing}未通过。`

  return { status: 'judged', stage, task, knowledge, understanding: UNDERSTANDING_NOTE, passed, conclusion, level }
}

/** 探索关的预测对照（只描述这一次运行的事实）。 */
export function predictionOutcome(trace: RunTrace): { spawns: number; distinctX: number; catches: number; finalScore: number } {
  return {
    spawns: trace.spawns.length,
    distinctX: new Set(trace.spawns.map(s => s.x)).size,
    catches: trace.scores.length,
    finalScore: trace.finalScore,
  }
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

export { L06_PARAMS }
