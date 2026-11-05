// @vitest-environment node
// L02Session 状态机测试：用假 VM 端口验证时序与失效规则（合成轨迹，不代表真实 VM；真实 VM 见 tests/e2e）。
import { describe, expect, it } from 'vitest'
import type { BasketMove } from './judge'
import { L02_CONTRACT } from './contract'
import { L02Session, PREDICTION_REQUIRED_REASON } from './session'
import type { Block, Program } from './program'
import { programFingerprint } from './program'
import { isLevelPassed, type StorageLike } from './state'
import { FakeVmPort, flush } from './testing/fake-vm-port'

const move = (dx: number): Block => ({ t: 'move', dx })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body })
const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const SOLVE: Program = flag(repeat(3, move(50)))
const loopMoves = (n: number, dx: number): BasketMove[] => Array.from({ length: n }, (_, i) => ({ frame: i + 1, dx, inLoop: true }))

function setup() {
  const port = new FakeVmPort()
  const session = new L02Session(port)
  return { port, session }
}
function toSolve(session: L02Session, program: Program = SOLVE) {
  session.switchLevel('solve')
  session.editProgram(program)
}
function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v },
    removeItem: k => { delete data[k] },
  }
}

describe('L02Session 初始与订阅', () => {
  it('初始：探索关、篮子角色、未运行、舞台在起点、没有结果', () => {
    const { session } = setup()
    const s = session.getSnapshot()
    expect(s.state.levelId).toBe('explore')
    expect(s.role).toBe('basket')
    expect(s.running).toBe(false)
    expect(s.trace).toBeNull()
    expect(s.positions).toEqual({ basket: { x: 0, y: -130 }, fruit: { x: 100, y: 150 } })
    expect(session.view().judgment).toBeNull()
  })

  it('订阅者在变化时被通知，退订后不再通知；快照在变化时换新对象', () => {
    const { session } = setup()
    let n = 0
    const off = session.subscribe(() => { n += 1 })
    const before = session.getSnapshot()
    session.setRole('fruit')
    expect(n).toBe(1)
    expect(session.getSnapshot()).not.toBe(before)
    off()
    session.setRole('basket')
    expect(n).toBe(1)
  })

  it('同一个值不重复通知', () => {
    const { session } = setup()
    let n = 0
    session.subscribe(() => { n += 1 })
    session.setRole('basket')
    session.setPaletteOpen(false)
    expect(n).toBe(0)
  })

  it('VM 就绪与帧事件进入快照', () => {
    const { port, session } = setup()
    port.ready = false
    port.setReady(false, '网络问题')
    expect(session.getSnapshot().engine).toMatchObject({ ready: false, error: '网络问题' })
    port.setReady(true)
    expect(session.getSnapshot().engine.ready).toBe(true)
  })
})

describe('运行前置条件', () => {
  it('探索关没写预测：不能运行，原因是先写预测', () => {
    const { session } = setup()
    expect(session.runBlockReason()).toBe(PREDICTION_REQUIRED_REASON)
    expect(session.view().runDisabled).toBe(true)
  })

  it('写了数字但没选能不能接住，仍不能运行', () => {
    const { session } = setup()
    session.setPrediction({ x: '40' })
    expect(session.runBlockReason()).toBe(PREDICTION_REQUIRED_REASON)
    session.setPrediction({ caught: '接不住' })
    expect(session.runBlockReason()).toBeNull()
  })

  it('脚本不合法：不能运行，原因是第一条问题', () => {
    const { session } = setup()
    toSolve(session, flag(repeat(99, move(500))))
    expect(session.view().canRun).toBe(false)
    expect(session.runBlockReason()).toBe(session.view().problems[0])
  })

  it('引擎没准备好：给出引擎的原因（有错误用错误文本）', () => {
    const { port, session } = setup()
    toSolve(session)
    port.setReady(false, null)
    expect(session.runBlockReason()).toContain('还没准备好')
    port.setReady(false, '加载失败')
    expect(session.runBlockReason()).toBe('加载失败')
  })

  it('引擎没准备好时 run() 返回 blocked，不调用 VM，并把原因写进提示', async () => {
    const { port, session } = setup()
    toSolve(session)
    port.setReady(false, null)
    const outcome = await session.run()
    expect(outcome.kind).toBe('blocked')
    expect(port.runs).toHaveLength(0)
    expect(session.getSnapshot().notice).toContain('还没准备好')
    expect(session.getSnapshot().running).toBe(false)
  })
})

describe('运行与判定', () => {
  it('运行 → VM 落地 → 记录轨迹并判定；通过由真实判定产生', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    expect(session.getSnapshot().running).toBe(true)
    expect(port.runs).toEqual([{ levelId: 'solve', program: SOLVE }])
    port.land(150, loopMoves(3, 50))
    const outcome = await p
    expect(outcome.kind).toBe('finished')
    const v = session.view()
    expect(v.judgment?.status).toBe('judged')
    expect(v.passed).toBe(true)
    expect(session.getSnapshot().running).toBe(false)
  })

  it('没接住：判定未通过，不记录通过', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    port.land(50, loopMoves(1, 50))
    await p
    expect(session.view().passed).toBe(false)
    expect(isLevelPassed(session.getSnapshot().state, 'solve')).toBe(false)
  })

  it('运行中再点运行：busy，不开第二次运行', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    expect((await session.run()).kind).toBe('busy')
    expect(port.runs).toHaveLength(1)
    port.land(150, loopMoves(3, 50))
    await p
  })

  it('运行中改脚本：停止运行，回来的结果因脚本已变而丢弃，不判定、不记通过', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    session.editProgram(flag(repeat(3, move(40))))
    expect(port.stops).toBeGreaterThan(0)
    expect((await p).kind).toBe('discarded')
    expect(session.getSnapshot().trace).toBeNull()
    expect(isLevelPassed(session.getSnapshot().state, 'solve')).toBe(false)
    expect(session.getSnapshot().running).toBe(false)
  })

  it('运行中切关：结果丢弃', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    session.switchLevel('transferLeft')
    expect(port.stops).toBeGreaterThan(0)
    expect((await p).kind).toBe('discarded')
    expect(session.getSnapshot().trace).toBeNull()
    expect(session.getSnapshot().state.levelId).toBe('transferLeft')
  })

  it('停止：这次不判定，脚本保留，提示如实说明', async () => {
    const { session } = setup()
    toSolve(session)
    const p = session.run()
    session.stop()
    const outcome = await p
    expect(outcome.kind).toBe('stopped')
    expect(session.getSnapshot().notice).toBe('已停止。这次不判定，脚本保留。')
    expect(session.view().judgment?.status).toBe('not-judged')
    expect(session.view().program).toEqual(SOLVE)
    expect(session.view().passed).toBe(false)
  })

  it('运行出错：提示“运行没有完成”，并如实返回 error', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    port.fail('沙箱崩了')
    expect(await p).toEqual({ kind: 'error', message: '沙箱崩了' })
    expect(session.getSnapshot().notice).toBe('运行没有完成：沙箱崩了')
  })

  it('被新运行取代 / 页面卸载不算学生要看的错误', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    port.unmount()
    expect((await p).kind).toBe('discarded')
    expect(session.getSnapshot().notice).toBeNull()
  })

  it('通过之后改脚本：通过作废（指纹不一致）', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    port.land(150, loopMoves(3, 50))
    await p
    expect(session.view().passed).toBe(true)
    session.editProgram(flag(repeat(3, move(51))))
    expect(session.view().passed).toBe(false)
    expect(session.getSnapshot().trace).toBeNull()
  })

  it('结果只对序号一致的轨迹有效（序号变了判定消失）', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    port.land(150, loopMoves(3, 50))
    await p
    expect(session.view().judgment?.status).toBe('judged')
    port.runSeq += 1 // 端口开始了更新的一次运行
    session.setRole('fruit') // 触发新快照，序号对账
    expect(session.view().judgment).toBeNull()
  })

  it('每一帧都进入舞台位置，并交给本次运行的帧回调', async () => {
    const { port, session } = setup()
    toSolve(session)
    const frames: number[] = []
    const p = session.run({ onFrame: f => frames.push(f.frame) })
    port.emitFrame(1, 50)
    port.emitFrame(2, 100)
    expect(session.getSnapshot().positions.basket.x).toBe(100)
    expect(frames).toEqual([1, 2])
    port.land(150, loopMoves(3, 50))
    await p
    port.emitFrame(3, 150)
    await flush()
    expect(frames).toEqual([1, 2])
  })
})

describe('编辑、切换与草稿', () => {
  it('探索关是只读演示：编辑被忽略；脚本没变也被忽略', () => {
    const { port, session } = setup()
    session.editProgram(SOLVE)
    expect(session.view().program).toEqual(session.view().program)
    expect(session.getSnapshot().state.programs.solve.scripts).toHaveLength(0)
    toSolve(session)
    const stops = port.stops
    session.editProgram(SOLVE)
    expect(port.stops).toBe(stops)
  })

  it('切关：停止运行、清结果、编辑器重载、角色回到篮子', () => {
    const { port, session } = setup()
    toSolve(session)
    session.setRole('fruit')
    const key = session.getSnapshot().editorKey
    session.switchLevel('transferFast')
    const s = session.getSnapshot()
    expect(port.stops).toBeGreaterThan(0)
    expect(s.editorKey).toBe(key + 1)
    expect(s.role).toBe('basket')
    expect(s.trace).toBeNull()
    expect(s.positions.fruit.x).toBe(150)
  })

  it('改预测会清掉旧结果', async () => {
    const { port, session } = setup()
    session.setPrediction({ x: '40', caught: '接不住' })
    const p = session.run()
    port.land(40, loopMoves(2, 20))
    await p
    expect(session.getSnapshot().trace).not.toBeNull()
    session.setPrediction({ x: '60' })
    expect(session.getSnapshot().trace).toBeNull()
  })

  it('重新开始本关：脚本清空；探索关不可重置', () => {
    const { session } = setup()
    session.resetLevel()
    expect(session.getSnapshot().editorKey).toBe(0)
    toSolve(session)
    session.resetLevel()
    expect(session.view().program).toEqual({ scripts: [] })
  })

  it('提示逐级显示，最多 3 级，每关各自计数', () => {
    const { session } = setup()
    for (let i = 0; i < 5; i += 1) session.revealHint()
    expect(session.getSnapshot().hints.explore).toBe(3)
    session.switchLevel('solve')
    expect(session.getSnapshot().hints.solve).toBe(0)
  })

  it('草稿只有学生作品：关卡、各关脚本、预测；没有通过记录、轨迹、位置', async () => {
    const { port, session } = setup()
    toSolve(session)
    session.setPrediction({ x: '40', caught: '接不住' })
    const p = session.run()
    port.land(150, loopMoves(3, 50))
    await p
    const draft = session.draft()
    expect(Object.keys(draft).sort()).toEqual(['levelId', 'predictions', 'programs', 'version'])
    expect(JSON.stringify(draft)).not.toMatch(/passedAt|trace|positions|basketMoves/)
  })

  it('loadDraft：合法草稿整体替换并重载编辑器；通过记录不随草稿恢复（需重新运行）', async () => {
    const { port, session } = setup()
    toSolve(session)
    const p = session.run()
    port.land(150, loopMoves(3, 50))
    await p
    const draft = session.draft()
    const { session: fresh } = setup()
    const key = fresh.getSnapshot().editorKey
    fresh.loadDraft(JSON.parse(JSON.stringify(draft)))
    expect(fresh.view().program).toEqual(SOLVE)
    expect(fresh.getSnapshot().editorKey).toBe(key + 1)
    expect(fresh.view().passed).toBe(false)
  })

  it('loadDraft 不合法：抛错且会话不变', () => {
    const { session } = setup()
    toSolve(session)
    const before = session.getSnapshot()
    expect(() => session.loadDraft({ version: 1, levelId: 'nope', programs: {} })).toThrow()
    expect(() => session.loadDraft(null)).toThrow()
    expect(() => session.loadDraft([])).toThrow()
    expect(session.getSnapshot()).toBe(before)
  })

  it('isValidDraft 与 loadDraft 判断一致', () => {
    const { session } = setup()
    const good = JSON.parse(JSON.stringify(session.draft()))
    expect(L02Session.isValidDraft(good)).toBe(true)
    expect(L02Session.isValidDraft({ ...good, version: 2 })).toBe(false)
    expect(L02Session.isValidDraft({ ...good, programs: { solve: { scripts: [{ hat: 'flag', body: [{ t: 'move', dx: 999 }] }] } } })).toBe(false)
  })

  it('importWork：别的课节的文件被拒绝，会话不变', () => {
    const { session } = setup()
    const before = session.getSnapshot()
    expect(() => session.importWork({ lessonId: 'G2-U3-L01', script: session.draft() })).toThrow('这不是')
    expect(() => session.importWork({ lessonId: L02_CONTRACT.lessonId, script: { version: 9 } })).toThrow('作品内容不合法')
    expect(session.getSnapshot()).toBe(before)
    session.importWork({ lessonId: L02_CONTRACT.lessonId, script: { ...session.draft(), levelId: 'transferLeft' } })
    expect(session.getSnapshot().state.levelId).toBe('transferLeft')
  })

  it('restoreFromStorage：没有草稿 → 不恢复且无原因；损坏草稿 → 不恢复并给原因，不覆盖存储', () => {
    const { session } = setup()
    expect(session.restoreFromStorage(memoryStorage())).toEqual({ restored: false, reason: null })
    const bad = memoryStorage({ [L02_CONTRACT.draftKey]: '{坏的' })
    const r = session.restoreFromStorage(bad)
    expect(r.restored).toBe(false)
    expect(r.reason).toContain('损坏')
    expect(bad.data[L02_CONTRACT.draftKey]).toBe('{坏的')
  })

  it('restoreFromStorage：好草稿恢复，且不重载编辑器（沿用原行为：由 program 属性更新）', () => {
    const { session } = setup()
    const store = memoryStorage({
      [L02_CONTRACT.draftKey]: JSON.stringify({ lessonId: 'G2-U3-L02', savedAt: 'x', script: { ...session.draft(), levelId: 'solve', programs: { solve: SOLVE, transferLeft: { scripts: [] }, transferFast: { scripts: [] } } } }),
    })
    const key = session.getSnapshot().editorKey
    expect(session.restoreFromStorage(store).restored).toBe(true)
    expect(session.view().levelId).toBe('solve')
    expect(programFingerprint(session.view().program)).toBe(programFingerprint(SOLVE))
    expect(session.getSnapshot().editorKey).toBe(key)
  })
})
