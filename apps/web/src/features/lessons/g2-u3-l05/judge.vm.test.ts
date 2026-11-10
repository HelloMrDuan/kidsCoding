// 判定矩阵：每个程序都在**真实 scratch-vm**（虚拟时钟）里跑，判定读真实运行轨迹。
// 不 mock VM。数字取自探针 docs/curriculum/g2-u3-l05/probe-countdown-virtual-clock.cjs 的实测。
// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { judgeRun, type RunTrace } from './judge'
import { L05_LEVELS } from './params'
import type { Block, Program } from './program'
import { runProgramInRealVm } from './testing/node-vm-runner'

const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const set = (value: number): Block => ({ t: 'setTime', value })
const wait = (secs = 1): Block => ({ t: 'wait', secs })
const dec = (by = 1): Block => ({ t: 'decrease', by })
const over: Block = { t: 'broadcast' }
const until = (...body: Block[]): Block => ({ t: 'untilZero', body: body as never })
const rep = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body: body as never })

/** 标准做法：设为 start；直到 timeLeft < 1 { 等 1 秒；减 1 }；广播。 */
const standard = (start = 10) => flag(set(start), until(wait(), dec()), over)

async function judged(program: Program, levelId: 'solve' | 'transferShort' = 'solve') {
  const trace = await runProgramInRealVm(program, { levelId })
  const j = judgeRun(trace, L05_LEVELS[levelId])
  if (j.status !== 'judged') throw new Error('expected judged, got ' + j.reason)
  return { trace, j }
}

describe('真实 VM 轨迹：标准做法', () => {
  it('10 秒倒计时：timeLeft 数到 0，不出现负数，广播恰好一次，之后得分不再变化；三层全部通过', async () => {
    const { trace, j } = await judged(standard())
    const nums = trace.frames.map(f => f.timeLeft)
    expect(Math.max(...nums)).toBe(10)
    expect(Math.min(...nums)).toBe(0)
    expect(trace.frames[trace.frames.length - 1].timeLeft).toBe(0)
    expect(trace.broadcasts).toHaveLength(1)
    // 探针实测：约 310 帧归零、广播在第 311 帧附近；这里不写死帧号，只验证量级（每次等待结束后多一帧）
    expect(trace.broadcasts[0]).toBeGreaterThanOrEqual(300)
    expect(trace.broadcasts[0]).toBeLessThanOrEqual(320)
    const scoreAtOver = trace.frames.find(f => f.frame === trace.broadcasts[0])!.score
    expect(scoreAtOver).toBe(19) // 每 0.5 秒且 timeLeft > 0 时 +1，探针实测 19
    expect(trace.frames.filter(f => f.frame > trace.broadcasts[0]).every(f => f.score === scoreAtOver)).toBe(true)
    expect(trace.checks.length).toBeGreaterThan(0)
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(true)
    expect(j.passed).toBe(true)
  })

  it('同一个程序跑两遍：轨迹完全相同（虚拟时钟，没有随机）', async () => {
    const a = await runProgramInRealVm(standard())
    const b = await runProgramInRealVm(standard())
    expect(b.frames).toEqual(a.frames)
    expect(b.broadcasts).toEqual(a.broadcasts)
  })

  it('变量读出来统一是数字：第一帧的 timeLeft 是 10 而不是 "10"', async () => {
    const trace = await runProgramInRealVm(standard())
    expect(typeof trace.frames[0].timeLeft).toBe('number')
    expect(trace.frames[0].timeLeft).toBe(10)
  })
})

describe('真实 VM 轨迹：常见错误', () => {
  it('没有判断，固定重复 15 次：timeLeft 变成 -5；舞台、任务、知识证据都不通过（负数是目录里写的那个错误）', async () => {
    const { trace, j } = await judged(flag(set(10), rep(15, wait(), dec()), over))
    expect(Math.min(...trace.frames.map(f => f.timeLeft))).toBe(-5)
    expect(j.stage.passed).toBe(false)
    expect(j.stage.line).toContain('-5')
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('负数')
    expect(j.knowledge.passed).toBe(false)
    expect(j.knowledge.line).toContain('写死的次数')
    expect(j.passed).toBe(false)
  })

  it('固定重复 10 次，起点也是 10：行为和标准做法完全一样，舞台与任务通过，只有知识证据能看出区别', async () => {
    const { j } = await judged(flag(set(10), rep(10, wait(), dec()), over))
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  it('忘了广播：任务和知识证据不通过', async () => {
    const { j } = await judged(flag(set(10), until(wait(), dec())))
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('一次都没有广播')
    expect(j.knowledge.passed).toBe(false)
  })

  it('没有“设为 10”：倒计时没有从要求的秒数开始', async () => {
    const { j } = await judged(flag(until(wait(), dec()), over))
    expect(j.task.passed).toBe(false)
    expect(j.passed).toBe(false)
  })

  it('空程序与只有帽子积木：不通过，且说明原因', async () => {
    for (const p of [{ scripts: [] } as Program, { scripts: [{ hat: 'flag', body: [] }] } as Program]) {
      const { j } = await judged(p)
      expect(j.passed).toBe(false)
      // timeLeft 初始值是 0：没写程序也“停在 0”，舞台层必须说清楚是“没有开始数”，不能写成数到了 0
      expect(j.stage.passed).toBe(false)
      expect(j.stage.line).toContain('没有开始')
      expect(j.task.passed).toBe(false)
      expect(j.knowledge.passed).toBe(false)
    }
  })

  it('散积木不会运行：和空程序一样', async () => {
    const { trace, j } = await judged({ scripts: [{ hat: null, body: [set(10), until(wait(), dec()), over] }] })
    expect(trace.broadcasts).toHaveLength(0)
    expect(j.passed).toBe(false)
  })
})

describe('真实 VM 轨迹：广播的时机与次数（每条都对应任务层或知识层的一个子检查）', () => {
  it('广播了两次：任务不通过，写明次数；倒计时本身是对的，所以舞台和知识证据通过', async () => {
    const { trace, j } = await judged(flag(set(10), until(wait(), dec()), over, over))
    expect(trace.broadcasts).toHaveLength(2)
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('广播了 2 次')
    expect(j.knowledge.passed).toBe(true)
  })

  it('广播之后又把 timeLeft 设回 5：得分从 19 涨到 25，任务不通过；舞台也不通过（最后不是 0）', async () => {
    const { trace, j } = await judged(flag(set(10), until(wait(), dec()), over, set(5)))
    const at = trace.frames.find(f => f.frame === trace.broadcasts[0])!
    expect(at.score).toBe(19)
    expect(trace.frames[trace.frames.length - 1].score).toBeGreaterThan(19)
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('得分还在变')
    expect(j.stage.passed).toBe(false)
  })

  it('一开始就广播（倒计时还没开始）：倒计时期间一分都没有得到；知识证据也不通过——广播之前没有任何真的判断', async () => {
    const { trace, j } = await judged(flag(set(10), over, until(wait(), dec())))
    expect(trace.broadcasts[0]).toBe(1)
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('倒计时期间一分都没有得到')
    expect(j.knowledge.passed).toBe(false)
    expect(j.knowledge.line).toContain('还不是真的')
  })

  it('归零之后又等了 2 秒才广播：得分本来就停了，任务层看不出来；只有知识证据发现判断和广播不相连', async () => {
    const { j } = await judged(flag(set(10), until(wait(), dec()), wait(), wait(), over))
    expect(j.stage.passed).toBe(true)
    expect(j.task.passed).toBe(true)
    expect(j.knowledge.passed).toBe(false)
    expect(j.knowledge.line).toContain('不相连')
  })

  it('起点太小（1 秒）：倒计时没有从本关要求的秒数开始', async () => {
    const { j } = await judged(flag(set(1), until(wait(), dec()), over))
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('10 秒')
  })
})

describe('迁移关：6 秒', () => {
  it('照抄上一关的 10 秒：倒计时从 10 开始，不是本关要求的 6，不通过', async () => {
    const { j } = await judged(standard(10), 'transferShort')
    expect(j.task.passed).toBe(false)
    expect(j.task.line).toContain('6 秒')
    expect(j.passed).toBe(false)
  })

  it('改成 6 秒：三层通过', async () => {
    const { trace, j } = await judged(standard(6), 'transferShort')
    expect(Math.max(...trace.frames.map(f => f.timeLeft))).toBe(6)
    expect(j.passed).toBe(true)
  })
})

describe('未判定的情形', () => {
  it('运行中被停止：不判定', async () => {
    const trace = await runProgramInRealVm(standard(), { onFrame: f => f === 50 })
    expect(trace.endedBy).toBe('stopped')
    const j = judgeRun(trace, L05_LEVELS.solve)
    expect(j.status).toBe('not-judged')
  })

  it('超过帧上限：不判定，不静默通过也不静默失败', async () => {
    // 起点 20、每次等 2 秒 = 40 秒 ≈ 1200 帧 > 帧上限
    const trace = await runProgramInRealVm(flag(set(20), until(wait(2), dec()), over))
    expect(trace.endedBy).toBe('frameCap')
    const j = judgeRun(trace, L05_LEVELS.solve)
    expect(j.status).toBe('not-judged')
    if (j.status === 'not-judged') expect(j.reason).toContain('太久')
  })

  it('出错的运行：不判定，写明原因', () => {
    const t: RunTrace = { levelId: 'solve', runId: 1, fingerprint: '', endedBy: 'error', error: '沙箱没有响应', frames: [], broadcasts: [], checks: [] }
    const j = judgeRun(t, L05_LEVELS.solve)
    expect(j.status).toBe('not-judged')
    if (j.status === 'not-judged') expect(j.reason).toContain('沙箱没有响应')
  })
})
