// 会话状态机单测（假 VM 端口）：预测门禁、运行/停止/过期结果、切关与编辑失效、草稿往返。
// 假端口的轨迹是合成轨迹，只验证状态机，不冒充真实 VM 行为。

import { describe, expect, it } from 'vitest'
import { L06_LEVELS } from './params'
import { EMPTY_PROGRAM, type Program } from './program'
import { referenceProgram } from './reference'
import { L06Session, PREDICTION_REQUIRED_REASON } from './session'
import { FakeVmPort, flush, syntheticTrace } from './testing/fake-vm-port'
import { initialState } from './state'

function makeSession() {
  const port = new FakeVmPort()
  const session = new L06Session(port)
  return { port, session }
}

describe('L06Session', () => {
  it('初始在探索关，没写预测时门禁给出原因且运行按钮禁用', () => {
    const { session } = makeSession()
    expect(session.view().levelId).toBe('explore')
    expect(session.runBlockReason()).toBe(PREDICTION_REQUIRED_REASON)
    expect(session.view().runDisabled).toBe(true)
    expect(session.view().runReason).toBe(PREDICTION_REQUIRED_REASON)
  })

  it('写完两个预测后门禁放开；运行探索关并落地后算“观察过”', async () => {
    const { port, session } = makeSession()
    session.setPrediction({ count: '15' })
    session.setPrediction({ same: '不会' })
    expect(session.runBlockReason()).toBeNull()
    const p = session.run()
    port.finish()
    const out = await p
    expect(out.kind).toBe('finished')
    expect(session.view().passed).toBe(true)
  })

  it('引擎没准备好时运行被拦下并如实提示', async () => {
    const { port, session } = makeSession()
    port.setReady(false, '引擎坏了')
    session.setPrediction({ count: '3', same: '会' })
    const out = await session.run()
    expect(out.kind).toBe('blocked')
    expect(session.getSnapshot().notice).toContain('引擎坏了')
  })

  it('solve 关：合成通过轨迹落地后通过；改一个积木后通过立刻失效', async () => {
    const { port, session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(referenceProgram(L06_LEVELS.solve))
    const p = session.run()
    port.finish()
    await p
    expect(session.view().passed).toBe(true)
    const edited: Program = { scripts: [{ hat: 'flag', body: [{ t: 'forever', body: [{ t: 'spawn' }] }] }] }
    session.editProgram(edited)
    expect(session.view().passed).toBe(false)
    expect(session.view().judgment).toBeNull()
  })

  it('运行期间切关：回来的轨迹按过期丢弃', async () => {
    const { session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(referenceProgram(L06_LEVELS.solve))
    const p = session.run()
    session.switchLevel('transferFast') // 切关会先停掉旧运行，旧轨迹回来时按过期丢弃
    const out = await p
    expect(out.kind).toBe('discarded')
    expect(session.view().judgment).toBeNull()
  })

  it('停止：轨迹以 stopped 落地，不判定，脚本保留', async () => {
    const { session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(referenceProgram(L06_LEVELS.solve))
    const p = session.run()
    session.stop()
    const out = await p
    expect(out.kind).toBe('stopped')
    expect(session.view().program).toEqual(referenceProgram(L06_LEVELS.solve))
    expect(session.view().passed).toBe(false)
  })

  it('判定失败（如出生没用随机）不通过，且三层结果可见', async () => {
    const { port, session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(referenceProgram(L06_LEVELS.solve))
    const p = session.run()
    port.finish({ randoms: [] })
    await p
    const j = session.view().judgment
    expect(j?.status).toBe('judged')
    if (j?.status === 'judged') {
      expect(j.knowledge.passed).toBe(false)
      expect(j.passed).toBe(false)
    }
    expect(session.view().passed).toBe(false)
  })

  it('迁移 A 初始就是毛病程序；resetLevel 恢复毛病程序而不是清空', () => {
    const { session } = makeSession()
    session.switchLevel('transferFix')
    const before = session.view().program
    session.editProgram(EMPTY_PROGRAM)
    session.resetLevel()
    expect(session.view().program).toEqual(before)
  })

  it('草稿：draft/loadDraft 往返；非法草稿抛错且会话不变', async () => {
    const { session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(referenceProgram(L06_LEVELS.solve))
    const draft = session.draft()
    const { session: s2 } = makeSession()
    s2.loadDraft(draft)
    expect(s2.view().levelId).toBe('solve')
    expect(s2.view().program).toEqual(referenceProgram(L06_LEVELS.solve))
    expect(() => s2.loadDraft({ version: 9 })).toThrow()
    expect(s2.view().levelId).toBe('solve')
  })

  it('isPristine / resetAll 回到课程起点', () => {
    const { session } = makeSession()
    expect(session.isPristine()).toBe(true)
    session.switchLevel('solve')
    session.editProgram(referenceProgram(L06_LEVELS.solve))
    expect(session.isPristine()).toBe(false)
    session.resetAll()
    expect(session.isPristine()).toBe(true)
    expect(session.getSnapshot().state).toEqual(initialState())
  })

  it('帧回调把真实位置/得分/时间写进快照', async () => {
    const { port, session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(referenceProgram(L06_LEVELS.solve))
    const p = session.run()
    port.emitFrame(7, { score: 2, timeLeft: 13, fruit: { x: 40, y: 60, visible: true }, basket: { x: 40, y: -90 } })
    await flush()
    const snap = session.getSnapshot()
    expect(snap.positions.score).toBe(2)
    expect(snap.positions.timeLeft).toBe(13)
    expect(snap.positions.fruit.x).toBe(40)
    port.finish()
    await p
  })

  it('合成轨迹与指纹的对应关系：recordRun 只认当前程序', () => {
    const trace = syntheticTrace('solve', referenceProgram(L06_LEVELS.solve), 1)
    expect(trace.fingerprint).toBe(JSON.stringify(referenceProgram(L06_LEVELS.solve)))
  })
})
