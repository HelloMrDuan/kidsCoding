// 真实 Scratch VM（Node，无渲染器）行为测试。
// 边界：Node 没有渲染器，sensing_touchingobject 恒为 false，所以这里**不测碰撞记分**——
// 只测不依赖碰撞的真实行为：随机出生（值来自真实 operator_random、与出生同帧同值、互不相同、可复现）、
// 篮子跟随指针、舞台倒计时与时间到结束、毛病程序的无条件记分（记分在“如果”外，Node 也能复现）。
// 碰撞记分的真实证据在浏览器 E2E（tests/e2e/g2-u3-l06-vm.spec.ts，真实 Chrome + 真实渲染器）。

import { describe, expect, it } from 'vitest'
import { judgeRun } from './judge'
import { L06_LEVELS, L06_PARAMS } from './params'
import { EMPTY_PROGRAM } from './program'
import { buggyProgram, referenceProgram } from './reference'
import { runProgramInRealVm } from './testing/node-vm-runner'

const TIMEOUT = 60000

describe('真实 VM：随机出生与接力（参考做法，Node 无渲染器）', () => {
  it('出生都来自真实随机求值：同帧同值、互不相同、都在范围内；最后时间到结束', async () => {
    const trace = await runProgramInRealVm(referenceProgram(L06_LEVELS.solve), 'solve')
    expect(trace.endedBy).toBe('finished')
    expect(trace.endReason).toBe('timeup')
    expect(trace.finalTimeLeft).toBeLessThan(1)
    expect(trace.spawns.length).toBeGreaterThanOrEqual(5)
    expect(trace.randoms.length).toBe(trace.spawns.length)
    for (const sp of trace.spawns) {
      expect(trace.randoms.some(r => r.frame === sp.frame && r.value === sp.x)).toBe(true)
      expect(sp.x).toBeGreaterThanOrEqual(L06_PARAMS.randomMinX)
      expect(sp.x).toBeLessThanOrEqual(L06_PARAMS.randomMaxX)
    }
    expect(new Set(trace.spawns.map(s => s.x)).size).toBeGreaterThanOrEqual(3)
    // 无渲染器：检查都执行了但恒为 false，一次分都不会记——这正是本运行器的已知边界
    expect(trace.checks.length).toBeGreaterThan(0)
    expect(trace.checks.every(c => !c.result)).toBe(true)
    expect(trace.scores).toEqual([])
    const j = judgeRun(trace, L06_LEVELS.solve)
    expect(j.status).toBe('judged')
    if (j.status === 'judged') {
      expect(j.knowledge.passed).toBe(true) // 随机证据与碰撞无关，Node 也能成立
      expect(j.stage.passed).toBe(true) // 时间到结束、结果一致
    }
  }, TIMEOUT)

  it('同一程序两次运行的出生序列逐字一致（带种子可复现）', async () => {
    const a = await runProgramInRealVm(referenceProgram(L06_LEVELS.solve), 'solve')
    const b = await runProgramInRealVm(referenceProgram(L06_LEVELS.solve), 'solve')
    expect(b.spawns).toEqual(a.spawns)
    expect(b.framesRun).toBe(a.framesRun)
  }, TIMEOUT)

  it('篮子跟随指针：把鼠标放到舞台 x=120，篮子就到 120', async () => {
    const trace = await runProgramInRealVm(referenceProgram(L06_LEVELS.solve), 'solve', {
      frameCap: 90,
      onFrame: (_f, vm) => {
        vm.postIOData('mouse', { x: 360, y: 180, canvasWidth: 480, canvasHeight: 360 })
      },
    })
    expect(Math.abs(trace.basketX - 120)).toBeLessThanOrEqual(1)
  }, TIMEOUT)

  it('倒计时按虚拟秒走：实测约 31 帧减 1 秒，20 秒约 620 帧归零', async () => {
    const trace = await runProgramInRealVm(EMPTY_PROGRAM, 'solve')
    expect(trace.endReason).toBe('timeup')
    expect(trace.timeupFrame).not.toBeNull()
    expect(trace.timeupFrame!).toBeGreaterThanOrEqual(600)
    expect(trace.timeupFrame!).toBeLessThanOrEqual(640)
    expect(trace.spawns).toEqual([])
  }, TIMEOUT)
})

describe('真实 VM：毛病程序与空程序（负例）', () => {
  it('毛病程序：记分在“如果”外 → 无条件记分，判定任务层失败（Node 即可复现）', async () => {
    const trace = await runProgramInRealVm(buggyProgram(L06_LEVELS.transferFix), 'transferFix')
    // 记分不受条件把关：得分很快冲到获胜线（运行因此按“获胜”收尾），但每一次记分都查无实据
    expect(trace.endReason).toBe('win')
    expect(trace.scores.length).toBeGreaterThanOrEqual(5)
    expect(trace.checks.every(c => !c.result)).toBe(true)
    const j = judgeRun(trace, L06_LEVELS.transferFix)
    expect(j.status).toBe('judged')
    if (j.status === 'judged') expect(j.task.passed).toBe(false)
  }, TIMEOUT)

  it('空程序：没有出生，知识层失败', async () => {
    const trace = await runProgramInRealVm(EMPTY_PROGRAM, 'solve')
    const j = judgeRun(trace, L06_LEVELS.solve)
    expect(j.status).toBe('judged')
    if (j.status === 'judged') expect(j.knowledge.passed).toBe(false)
  }, TIMEOUT)

  it('运行中停止：endedBy=stopped，不判定', async () => {
    const trace = await runProgramInRealVm(referenceProgram(L06_LEVELS.solve), 'solve', {
      onFrame: f => f >= 10,
    })
    expect(trace.endedBy).toBe('stopped')
    expect(judgeRun(trace, L06_LEVELS.solve).status).toBe('not-judged')
  }, TIMEOUT)
})
