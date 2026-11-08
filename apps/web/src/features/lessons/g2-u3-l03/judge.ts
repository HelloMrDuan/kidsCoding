// 三层结果：舞台结果 / 任务结果 / 知识证据（另附一条固定的“理解情况”说明）。
// 输入是真实 Scratch VM 运行出来的 RunTrace（由沙箱观察 VM 得到），本模块是纯函数，
// 不运行任何积木，也不逐块比对标准答案：只看行为。
//
// 关键设计（见 TEACHING-PLAN 第四节）：随机结果会骗人——上下界写成 -200～200 的程序，10 次取值碰巧都落在 ±180 内的概率有 35%。
// 所以“知识证据”只由真实 `operator_random` 收到的上下界决定，不受这一次运气影响；
// 取值结果只用来展示“这一次运行”（舞台结果）和判断“有没有真的出现在不同位置”（任务结果）。

import { allowedWidth, inAllowed, L03_PARAMS, type LevelParams } from './params'

/** 一次真实的 `operator_random` 调用：它收到的上下界、返回值，以及是否在“重复执行”里。 */
export type Draw = {
  frame: number
  from: number
  to: number
  value: number
  inLoop: boolean
}

/** 一次真实的 `motion_setx` 之后，礼物的 x。 */
export type Placement = { frame: number; x: number }

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
  /** 演示关用了固定种子（每个人看到同样的位置），其余关每次都真的不一样。 */
  seeded: boolean
  draws: Draw[]
  placements: Placement[]
}

export type Layer = { passed: boolean; line: string }

/** 系统无法判断学生是否理解的固定说明：每一次判定都展示，不因任务通过而省略。 */
export const UNDERSTANDING_NOTE =
  '理解情况：系统只能看到这一次运行的行为，看不出你是否明白为什么要这样限定上下界——需要进一步解释或练习（比如换一个范围再做一次，或者对别人说一说你是怎么想的）。'

export type RunJudgment =
  | { status: 'judged'; stage: Layer; task: Layer; knowledge: Layer; understanding: string; passed: boolean; conclusion: string; level: LevelParams }
  | { status: 'not-judged'; reason: string }

const range = (level: LevelParams) => `${level.allowedMin}～${level.allowedMax}`

/** 把一串位置写成给孩子看的短文本；太长就省略后面的。 */
export function listPositions(xs: number[], max = 12): string {
  const shown = xs.slice(0, max).join('、')
  return xs.length > max ? `${shown}……（共 ${xs.length} 个）` : shown
}

/** 一次取随机数实际用到的下界和上界（Scratch 会把颠倒的上下界对调）。 */
export function effectiveBounds(d: Pick<Draw, 'from' | 'to'>): { low: number; high: number } {
  return d.from <= d.to ? { low: d.from, high: d.to } : { low: d.to, high: d.from }
}

export function judgeRun(trace: RunTrace, level: LevelParams): RunJudgment {
  if (trace.endedBy === 'stopped') return { status: 'not-judged', reason: '运行被停止，这一次不判定。' }
  if (trace.endedBy === 'error') return { status: 'not-judged', reason: `运行出错：${trace.error ?? '未知原因'}。这一次不判定。` }
  if (trace.endedBy === 'frameCap') return { status: 'not-judged', reason: '运行太久没有结束，这一次不判定。' }

  const xs = trace.placements.map(p => p.x)
  const outside = xs.filter(x => !inAllowed(x, level))
  const distinct = new Set(xs).size
  const need = L03_PARAMS.requiredDraws

  // ---- 舞台结果：这一次礼物真的出现在哪里 ----
  let stage: Layer
  if (xs.length === 0) {
    stage = { passed: false, line: '舞台结果：这一次礼物一次也没有被放到新的位置（没有运行“将 x 设为……”）' }
  } else if (outside.length > 0) {
    stage = {
      passed: false,
      line: `舞台结果：礼物出现了 ${xs.length} 次，x 依次是 ${listPositions(xs)}；其中 ${outside.length} 次超出了本关要求的 ${range(level)}（${listPositions(outside, 6)}）`,
    }
  } else if (xs.length < need) {
    stage = {
      passed: false,
      line: `舞台结果：礼物只出现了 ${xs.length} 次（x 是 ${listPositions(xs)}），都在 ${range(level)} 内，但本关要看 ${need} 次`,
    }
  } else {
    stage = { passed: true, line: `舞台结果：礼物出现了 ${xs.length} 次，x 依次是 ${listPositions(xs)}，全部在本关要求的 ${range(level)} 内` }
  }

  // ---- 任务结果：礼物有没有真的“随机出现”在要求的范围里 ----
  let task: Layer
  if (xs.length === 0) {
    task = { passed: false, line: '任务结果：本次任务未达标——礼物没有出现在新的位置' }
  } else if (!stage.passed) {
    task = {
      passed: false,
      line: outside.length > 0
        ? `任务结果：本次任务未达标——有 ${outside.length} 次礼物跑出了要求的范围 ${range(level)}`
        : `任务结果：本次任务未达标——礼物只出现了 ${xs.length} 次，还不够 ${need} 次`,
    }
  } else if (distinct < L03_PARAMS.minDistinctPositions) {
    task = {
      passed: false,
      line: `任务结果：本次任务未达标——${xs.length} 次里礼物只出现在 ${distinct} 个不同的位置，不像是随机出现的（至少要 ${L03_PARAMS.minDistinctPositions} 个不同位置）`,
    }
  } else {
    task = { passed: true, line: `任务结果：本次任务达标——礼物出现了 ${xs.length} 次，都在 ${range(level)} 内，一共出现在 ${distinct} 个不同的位置` }
  }

  // ---- 知识证据：只看真实 operator_random 收到的上下界，不看运气 ----
  const minSpread = Math.ceil(allowedWidth(level) * L03_PARAMS.minSpreadShare)
  let knowledge: Layer
  if (trace.draws.length === 0) {
    knowledge = { passed: false, line: '知识证据：本次程序没有满足取值范围要求——没有看到“在……之间取随机数”真正运行' }
  } else {
    const bounds = trace.draws.map(effectiveBounds)
    const lowest = Math.min(...bounds.map(b => b.low))
    const highest = Math.max(...bounds.map(b => b.high))
    const tooWide = bounds.filter(b => b.low < level.allowedMin || b.high > level.allowedMax)
    const tooNarrow = bounds.filter(b => b.high - b.low < minSpread)
    if (tooWide.length > 0) {
      knowledge = {
        passed: false,
        line: `知识证据：本次程序没有满足取值范围要求——取随机数的上下界用到了 ${lowest}～${highest}，超出了本关要求的 ${range(level)}，随机数就可能跑出范围`,
      }
    } else if (tooNarrow.length > 0) {
      const w = Math.min(...tooNarrow.map(b => b.high - b.low))
      knowledge = {
        passed: false,
        line: `知识证据：本次程序没有满足取值范围要求——上下界都在 ${range(level)} 内，但范围太窄（宽度只有 ${w}，至少要 ${minSpread}），礼物几乎不会换位置`,
      }
    } else {
      knowledge = {
        passed: true,
        line: `知识证据：本次程序满足取值范围要求——取随机数的上下界一直在 ${range(level)} 内（用到了 ${lowest}～${highest}），范围也够宽。这条结论只看上下界，不靠这一次的运气`,
      }
    }
  }

  const passed = task.passed && knowledge.passed
  const failing = [task.passed ? null : '任务结果', knowledge.passed ? null : '知识证据'].filter(Boolean).join('、')
  const conclusion = passed
    ? '本次运行：任务达标，也满足了取值范围要求。这只说明这一次运行的行为。'
    : `本次运行：还没达到要求——${failing}未通过。`

  return { status: 'judged', stage, task, knowledge, understanding: UNDERSTANDING_NOTE, passed, conclusion, level }
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
