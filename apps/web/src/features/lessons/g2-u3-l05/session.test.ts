// @vitest-environment node
// L05Session 状态机测试：用假 VM 端口验证时序与失效规则（合成轨迹，不代表真实 VM；真实 VM 见 judge.vm.test.ts 与 tests/e2e）。
import { describe, expect, it } from 'vitest'
import { L05_CONTRACT } from './contract'
import { L05Session, PREDICTION_REQUIRED_REASON } from './session'
import { programFingerprint, type Block, type Program } from './program'
import { isLevelPassed, type StorageLike } from './state'
import { FakeVmPort, flush } from './testing/fake-vm-port'

const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const STANDARD = (start = 10): Program => flag(
  { t: 'setTime', value: start },
  { t: 'untilZero', body: [{ t: 'wait', secs: 1 }, { t: 'decrease', by: 1 }] },
  { t: 'broadcast' },
)

function makeSession() {
  const port = new FakeVmPort()
  const session = new L05Session(port)
  return { port, session }
}

describe('L05Session', () => {
  it('初始在探索关：没写预测不能运行，原因写明', () => {
    const { session } = makeSession()
    const v = session.view()
    expect(v.levelId).toBe('explore')
    expect(v.predictionReady).toBe(false)
    expect(v.runDisabled).toBe(true)
    expect(session.runBlockReason()).toBe(PREDICTION_REQUIRED_REASON)
    expect(L05_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L05')
  })

  it('写完两个预测后可以运行；引擎没准备好时运行被拦下并给出原因', async () => {
    const { port, session } = makeSession()
    session.setPrediction({ time: '-5' })
    expect(session.view().predictionReady).toBe(false)
    session.setPrediction({ after: '不会' })
    expect(session.view().predictionReady).toBe(true)
    port.setReady(false, '引擎坏了')
    const outcome = await session.run()
    expect(outcome.kind).toBe('blocked')
    expect(session.getSnapshot().notice).toContain('引擎坏了')
  })

  it('探索关运行演示：判定出现（演示本来就不通过），关卡记为已观察', async () => {
    const { port, session } = makeSession()
    session.setPrediction({ time: '0', after: '不会' })
    const p = session.run()
    port.finish({ finalTime: -5 })
    const outcome = await p
    expect(outcome.kind).toBe('finished')
    const v = session.view()
    expect(v.judgment?.status).toBe('judged')
    if (v.judgment?.status === 'judged') expect(v.judgment.passed).toBe(false)
    expect(session.getSnapshot().state.passedAt.explore).toBeDefined()
  })

  it('运行中收到的帧直接更新舞台数值（来自端口报告，不推算）', async () => {
    const { port, session } = makeSession()
    session.setPrediction({ time: '0', after: '不会' })
    const p = session.run()
    port.emitFrame(31, { timeLeft: 9, score: 1 })
    expect(session.getSnapshot().display).toEqual({ timeLeft: 9, score: 1, over: false })
    port.emitFrame(311, { timeLeft: 0, score: 19, over: true })
    expect(session.getSnapshot().display.over).toBe(true)
    port.finish({ finalTime: -5 })
    await p
  })

  it('第二关标准做法通过后落账；再改一个数字，通过与判定一起失效', async () => {
    const { port, session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(STANDARD())
    const p = session.run()
    port.finish()
    await p
    expect(isLevelPassed(session.getSnapshot().state, 'solve')).toBe(true)
    expect(session.view().passed).toBe(true)
    session.editProgram(STANDARD(9))
    expect(isLevelPassed(session.getSnapshot().state, 'solve')).toBe(false)
    expect(session.view().judgment).toBeNull()
    expect(session.getSnapshot().trace).toBeNull()
  })

  it('停止：结果是“不判定”，脚本保留，提示写明已停止', async () => {
    const { session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(STANDARD())
    const p = session.run()
    session.stop()
    const outcome = await p
    expect(outcome.kind).toBe('stopped')
    expect(session.getSnapshot().notice).toContain('已停止')
    expect(session.view().judgment?.status).toBe('not-judged')
    expect(session.view().program).toEqual(STANDARD())
  })

  it('运行途中切关：回来的结果被丢弃，不落账到任何一关', async () => {
    const { port, session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(STANDARD())
    const p = session.run()
    session.switchLevel('transferShort')
    expect(port.stops).toBeGreaterThan(0)
    const outcome = await p
    expect(outcome.kind).toBe('discarded')
    expect(session.getSnapshot().trace).toBeNull()
    expect(isLevelPassed(session.getSnapshot().state, 'solve')).toBe(false)
  })

  it('脚本不合法时 runBlockReason 给出第一条问题', () => {
    const { session } = makeSession()
    session.switchLevel('solve')
    const tooMany: Block[] = Array.from({ length: 9 }, () => ({ t: 'wait', secs: 1 }))
    session.editProgram(flag(...tooMany))
    expect(session.view().canRun).toBe(false)
    expect(session.runBlockReason()).toContain('积木最多')
  })

  it('载入不合法草稿抛错且会话不变；从存储恢复损坏草稿给出原因', () => {
    const { session } = makeSession()
    session.switchLevel('solve')
    session.editProgram(STANDARD())
    const before = programFingerprint(session.view().program)
    expect(() => session.loadDraft({ version: 1, levelId: 'solve', programs: { solve: flag({ t: 'wait', secs: 9 }) } })).toThrow()
    expect(programFingerprint(session.view().program)).toBe(before)
    const badStorage: StorageLike = { getItem: () => '{"lessonId":"别的课"}', setItem: () => {}, removeItem: () => {} }
    const r = session.restoreFromStorage(badStorage)
    expect(r.restored).toBe(false)
    expect(r.reason).toBeTruthy()
    expect(programFingerprint(session.view().program)).toBe(before)
  })

  it('resetAll 回到起点（探索关、无脚本、无预测）', async () => {
    const { port, session } = makeSession()
    session.setPrediction({ time: '-5', after: '不会' })
    session.switchLevel('solve')
    session.editProgram(STANDARD())
    const p = session.run()
    port.finish()
    await p
    session.resetAll()
    expect(session.isPristine()).toBe(true)
    expect(session.view().levelId).toBe('explore')
    await flush()
  })
})
