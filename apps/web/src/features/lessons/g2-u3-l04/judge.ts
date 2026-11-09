// 三层结果：舞台结果 / 任务结果 / 知识证据（另附一条固定的“理解情况”说明）。
// 输入是真实 Scratch VM（带真实渲染器）运行出来的 RunTrace（由沙箱观察 VM 得到），本模块是纯函数，
// 不运行任何积木，不模拟碰撞，也不逐块比对标准答案：只看行为。
//
// 关键设计（见 TEACHING-PLAN 第五节）：
//   · 舞台结果 = 最终得分是否等于本关要求（只看舞台上看得到的）；
//   · 任务结果 = 逐球核算：红球恰好加分一次且加的是本关分数，蓝球（落在地上）一次都没加。
//     这一层能区分“总分碰巧对”与“每个球都对”（例如迁移 A 要 2 分：不带“如果”的程序两个球各加 1 分，总分也是 2）；
//   · 知识证据（判断）= 每一次得分之前，**同一个球**最近一次“碰到篮子？”检查必须返回 true，并且条件确实在把关
//     （这个球至少检查过一次，且既有 true 也有 false，或者一直是 false 且从未得分）。看的是条件有没有真的挡住不该得分的情况，不是总分。
//     两个球的线程交错执行，所以必须按球分别配对，不能用全局顺序。

import type { LevelParams } from './params'

export type BallName = '红球' | '蓝球'

/** 一次真实的 sensing_touchingobject 调用。 */
export type Check = { frame: number; ball: BallName; result: boolean }
/** 一次真实的 data_changevariableby（把“得分”增加 by）。 */
export type ScoreEvent = { frame: number; ball: BallName; by: number }
/** 一次真实的 looks_hide。 */
export type HideEvent = { frame: number; ball: BallName }

export type RunTrace = {
  levelId: string
  /** 同一个页面里每次运行递增，用于丢弃过期的运行结果。 */
  runId: number
  /** 运行时的程序指纹。 */
  fingerprint: string
  /** finished：所有脚本自然跑完；stopped：被学生停止；frameCap：超过帧上限；error：沙箱或 VM 出错。 */
  endedBy: 'finished' | 'stopped' | 'frameCap' | 'error'
  error?: string
  framesRun: number
  /** 按发生顺序记录。 */
  checks: Check[]
  scores: ScoreEvent[]
  hides: HideEvent[]
  /** 结束时舞台上“得分”变量的值。 */
  finalScore: number
  /** 结束时各球是否还看得见。 */
  visible: { 红球: boolean; 蓝球: boolean }
}

export type Layer = { passed: boolean; line: string }

/** 系统无法判断学生是否理解的固定说明：每一次判定都展示，不因任务通过而省略。 */
export const UNDERSTANDING_NOTE =
  '理解情况：系统只能看到这一次运行的行为，看不出你是否明白为什么要用“如果”来把关——需要进一步解释或练习（比如换一种球速再做一次，或者对别人说一说你是怎么想的）。'

export type RunJudgment =
  | { status: 'judged'; stage: Layer; task: Layer; knowledge: Layer; understanding: string; passed: boolean; conclusion: string; level: LevelParams }
  | { status: 'not-judged'; reason: string }

const BALLS: BallName[] = ['红球', '蓝球']

/**
 * 没有被条件挡住的得分：加分发生的那一帧，该球必须有一次“碰到 篮子？”检查，并且那次检查返回 true。
 * 检查与加分在同一个线程里紧挨着执行（检查是加分的条件），所以它们落在同一帧；如果加分的那一帧里这个球的检查
 * 不存在或是 false，说明这次加分不受“碰到 篮子？”约束（例如写在“如果”外面）。
 * 两个球的线程交错执行，所以必须按球分别配对，不能用全局顺序。同一帧里同一个球若检查过多次（多块脚本），只要有一次为 true 就算被挡住。
 */
function unguardedScores(trace: RunTrace): ScoreEvent[] {
  return trace.scores.filter(s => !trace.checks.some(c => c.ball === s.ball && c.frame === s.frame && c.result))
}

export function judgeRun(trace: RunTrace, level: LevelParams): RunJudgment {
  if (trace.endedBy === 'stopped') return { status: 'not-judged', reason: '运行被停止，这一次不判定。' }
  if (trace.endedBy === 'error') return { status: 'not-judged', reason: `运行出错：${trace.error ?? '未知原因'}。这一次不判定。` }
  if (trace.endedBy === 'frameCap') return { status: 'not-judged', reason: '运行太久没有结束，这一次不判定。' }

  const want = level.points
  const perBall = (ball: BallName) => trace.scores.filter(s => s.ball === ball)
  const red = perBall('红球')
  const blue = perBall('蓝球')

  // ---- 舞台结果：舞台上最后的得分 ----
  const stage: Layer = trace.finalScore === want
    ? { passed: true, line: `舞台结果：最终得分是 ${trace.finalScore} 分，正好是本关要求的 ${want} 分` }
    : { passed: false, line: `舞台结果：最终得分是 ${trace.finalScore} 分，本关要求是 ${want} 分` }

  // ---- 任务结果：逐球核算 ----
  let task: Layer
  const redTotal = red.reduce((a, s) => a + s.by, 0)
  if (red.length === 1 && red[0].by === want && blue.length === 0) {
    task = { passed: true, line: `任务结果：本次任务达标——红球碰到篮子时加了 1 次、共 ${want} 分，蓝球落在地上没有加分` }
  } else {
    const problems: string[] = []
    if (red.length === 0) problems.push('红球碰到了篮子，却一次分都没有加')
    else if (red.length > 1) problems.push(`红球被加了 ${red.length} 次分（同一个球只能算一次）`)
    else if (red[0].by !== want) problems.push(`红球这一次加了 ${red[0].by} 分，本关要求每个球加 ${want} 分`)
    if (blue.length > 0) problems.push(`落在地上的蓝球也被加了 ${blue.length} 次分（没碰到篮子的球不该得分）`)
    task = { passed: false, line: `任务结果：本次任务未达标——${problems.join('；')}${red.length > 1 ? `（红球共加了 ${redTotal} 分）` : ''}` }
  }

  // ---- 知识证据：每次得分前，同一个球最近一次检查必须为 true；条件确实在把关 ----
  const checksByBall = (ball: BallName) => trace.checks.filter(c => c.ball === ball)
  const totalChecks = trace.checks.length
  const unguarded = unguardedScores(trace)
  let knowledge: Layer
  if (totalChecks === 0) {
    knowledge = {
      passed: false,
      line: trace.scores.length > 0
        ? '知识证据：本次程序没有用到判断——没有看到“碰到 篮子？”被检查，球就被加了分'
        : '知识证据：本次程序没有用到判断——没有看到“碰到 篮子？”被检查过',
    }
  } else if (unguarded.length > 0) {
    const who = [...new Set(unguarded.map(s => s.ball))].join('、')
    knowledge = {
      passed: false,
      line: `知识证据：本次程序没有满足判断要求——${who}加分的时候，没有先确认“碰到 篮子？”是真的（共 ${unguarded.length} 次加分没有被条件挡住）`,
    }
  } else if (trace.scores.length === 0) {
    // 检查运行了，但从未得分：要区分“条件没碰到过”（可能检查得太早/次数不够）与“没有用到加分”。
    const sawTrue = trace.checks.some(c => c.result)
    knowledge = {
      passed: false,
      line: sawTrue
        ? '知识证据：本次程序没有满足判断要求——“碰到 篮子？”有过真的时候，但这时没有加分'
        : '知识证据：本次程序没有满足判断要求——“碰到 篮子？”检查了，却一次也没有碰到：检查的时候球还没落到篮子上（检查的次数可能不够）',
    }
  } else {
    // 所有得分都在检查为 true 的同一帧发生；条件还要确实“挡住”过没碰到的情况：两个球的检查里至少有一个 false。
    const sawFalse = BALLS.some(b => checksByBall(b).some(c => !c.result))
    knowledge = sawFalse
      ? { passed: true, line: '知识证据：本次程序满足判断要求——每一次加分之前，“碰到 篮子？”都是真的；没碰到的时候没有加分。这条结论只看条件有没有把关，不只看总分' }
      : { passed: false, line: '知识证据：本次程序没有满足判断要求——“碰到 篮子？”从来没有出现过“没碰到”，看不出条件在把关' }
  }

  const passed = stage.passed && task.passed && knowledge.passed
  const failing = [stage.passed ? null : '舞台结果', task.passed ? null : '任务结果', knowledge.passed ? null : '知识证据'].filter(Boolean).join('、')
  const conclusion = passed
    ? '本次运行：任务达标，也满足了判断要求。这只说明这一次运行的行为。'
    : `本次运行：还没达到要求——${failing}未通过。`

  return { status: 'judged', stage, task, knowledge, understanding: UNDERSTANDING_NOTE, passed, conclusion, level }
}

/** 本次运行里红球被判为“碰到篮子”的检查次数（探索关的预测对照用，只描述这一次的事实）。 */
export function predictionOutcome(trace: RunTrace): { redScoreTimes: number; blueScoreTimes: number; finalScore: number } {
  return {
    redScoreTimes: trace.scores.filter(s => s.ball === '红球').length,
    blueScoreTimes: trace.scores.filter(s => s.ball === '蓝球').length,
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

