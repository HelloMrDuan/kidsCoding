// @vitest-environment node
// LessonL02Adapter：共享 EngineAdapter 形状、一课一键草稿、共享 RunTrace 互转与判定等价、舞台字典。
// 运行时序用假 VM 端口（合成轨迹）；真实 VM 的等价验证见 tests/e2e/g2-u3-l02-vm.spec.ts。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { L02_CONTRACT } from './contract'
import { judgeRun, type BasketMove, type RunTrace } from './judge'
import { judgeSharedTrace, l02JudgmentAdapter, LessonL02Adapter, toJudgmentResult, toSharedRunTrace } from './lesson-adapter'
import { framesToLand, L02_LEVEL_ORDER, L02_LEVELS, L02_PARAMS } from './params'
import type { Block, Program } from './program'
import { parseStageState, stageStateOf, startPositions } from './stage-state'
import { loadDraft as l02LoadDraft, saveDraft as l02SaveDraft, type StorageLike } from './state'
import { FakeVmPort, flush, syntheticTrace } from './testing/fake-vm-port'
import type { EngineAdapter, RunEvent } from '../workspace/workspace-adapters'
import { draftKeyFor } from '../workspace/lesson-contract'
import { loadDraft as sharedLoadDraft, saveDraft as sharedSaveDraft } from '../workspace/workspace-draft'
import { stableFingerprint } from '../workspace/workspace-slots'

const move = (dx: number): Block => ({ t: 'move', dx })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body })
const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const SOLVE: Program = flag(repeat(3, move(50)))
const loopMoves = (n: number, dx: number): BasketMove[] => Array.from({ length: n }, (_, i) => ({ frame: i + 1, dx, inLoop: true }))

function setup() {
  const port = new FakeVmPort()
  const adapter = new LessonL02Adapter({ port })
  return { port, adapter }
}
function ready(adapter: LessonL02Adapter, program: Program = SOLVE) {
  adapter.session.switchLevel('solve')
  adapter.session.editProgram(program)
}
function memoryStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {}
  return { data, getItem: k => (k in data ? data[k] : null), setItem: (k, v) => { data[k] = v }, removeItem: k => { delete data[k] } }
}

describe('EngineAdapter 形状', () => {
  it('满足共享 EngineAdapter 的必需方法（编译期类型 + 运行期存在）', () => {
    const { adapter } = setup()
    const shared: EngineAdapter = adapter
    for (const name of ['mount', 'unmount', 'loadScript', 'getScript', 'run', 'stop', 'getState'] as const) {
      expect(typeof shared[name]).toBe('function')
    }
    for (const name of ['validateDraft', 'getFileCapabilities', 'getJudgmentResult', 'getStageState'] as const) {
      expect(typeof shared[name]).toBe('function')
    }
  })

  it('只声明本课真正支持的可选能力：没有积木分类、搜索、缩放等假能力', () => {
    const { adapter } = setup()
    const probe = adapter as unknown as Record<string, unknown>
    for (const name of ['getBlockCategories', 'selectCategory', 'getBlockInventory', 'insertBlock', 'zoomIn', 'zoomOut', 'zoomReset', 'getSelectedBlockId', 'selectBlockById']) {
      expect(probe[name], name).toBeUndefined()
    }
  })

  it('文件能力：一课一份作品，不能新建；可保存、导出、导入、重新开始本关', () => {
    expect(setup().adapter.getFileCapabilities()).toEqual({ canNew: false, canSave: true, canExport: true, canImport: true, canReset: true })
  })

  it('mount / unmount 交给 VM 端口', () => {
    const { adapter, port } = setup()
    adapter.mount({} as HTMLElement)
    adapter.unmount()
    expect([port.mounts, port.unmounts]).toEqual([1, 1])
  })
})

describe('一课一键草稿', () => {
  it('getScript() 就是会话草稿：关卡、各关脚本、预测；没有运行结果', () => {
    const { adapter } = setup()
    ready(adapter)
    adapter.session.setPrediction({ x: '40', caught: '接不住' })
    const script = adapter.getScript() as Record<string, unknown>
    expect(Object.keys(script).sort()).toEqual(['levelId', 'predictions', 'programs', 'version'])
    expect(script).toEqual(adapter.session.draft())
  })

  it('loadScript(getScript()) 往返不变；不合法的草稿抛错且会话不变', () => {
    const { adapter } = setup()
    ready(adapter)
    const draft = JSON.parse(JSON.stringify(adapter.getScript()))
    const { adapter: other } = setup()
    other.loadScript(draft)
    expect(other.getScript()).toEqual(draft)
    const before = other.session.getSnapshot()
    expect(() => other.loadScript('不是草稿')).toThrow()
    expect(() => other.loadScript({ ...draft, levelId: 'x' })).toThrow()
    expect(other.session.getSnapshot()).toBe(before)
  })

  it('validateDraft 与 loadScript 一致', () => {
    const { adapter } = setup()
    const good = JSON.parse(JSON.stringify(adapter.getScript()))
    expect(adapter.validateDraft(good)).toBe(true)
    for (const bad of [null, 1, 'x', [], {}, { ...good, version: 2 }, { ...good, levelId: 'nope' }]) {
      expect(adapter.validateDraft(bad)).toBe(false)
    }
  })

  it('键与共享规范一致：kidscoding-draft:G2-U3-L02', () => {
    expect(draftKeyFor('G2-U3-L02')).toBe(L02_CONTRACT.draftKey)
    expect(L02_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L02')
  })

  it('共享 workspace-draft 写的草稿，课程自己的 loadDraft 能读；反过来共享 loadDraft 也能读课程写的', () => {
    const { adapter } = setup()
    ready(adapter)
    const store = memoryStorage()
    expect(sharedSaveDraft(store, 'G2-U3-L02', adapter.getScript())).toEqual({ ok: true })
    const own = l02LoadDraft(store)
    expect(own.reason).toBeNull()
    expect(own.state?.programs.solve).toEqual(SOLVE)

    const store2 = memoryStorage()
    expect(l02SaveDraft(store2, adapter.session.getSnapshot().state)).toEqual({ ok: true })
    const shared = sharedLoadDraft(store2, 'G2-U3-L02')
    expect(shared.reason).toBeNull()
    expect(adapter.validateDraft(shared.data)).toBe(true)
    expect(Object.keys(store2.data)).toEqual(['kidscoding-draft:G2-U3-L02'])
  })

  it('整个作品（四关）只落在一个键里，不拆成四个课节', () => {
    const { adapter } = setup()
    const store = memoryStorage()
    for (const id of L02_LEVEL_ORDER) {
      adapter.session.switchLevel(id)
      if (id !== 'explore') adapter.session.editProgram(flag(repeat(2, move(10 + L02_LEVEL_ORDER.indexOf(id)))))
      sharedSaveDraft(store, 'G2-U3-L02', adapter.getScript())
    }
    expect(Object.keys(store.data)).toEqual(['kidscoding-draft:G2-U3-L02'])
    const saved = (JSON.parse(store.data['kidscoding-draft:G2-U3-L02']).script as ReturnType<LessonL02Adapter['session']['draft']>)
    expect(Object.keys(saved.programs).sort()).toEqual(['solve', 'transferFast', 'transferLeft'])
  })

  it('变化监听：脚本、预测、关卡的编辑通知；帧、运行结果、提示、角色不通知', async () => {
    const { adapter, port } = setup()
    let n = 0
    const listener = () => { n += 1 }
    adapter.addChangeListener(listener)
    ready(adapter) // 切关 + 改脚本：2 次
    expect(n).toBe(2)
    adapter.session.revealHint()
    adapter.session.setRole('fruit')
    adapter.session.setPaletteOpen(true)
    expect(n).toBe(2)
    adapter.run(() => {})
    port.emitFrame(1, 50)
    port.land(150, loopMoves(3, 50))
    await flush()
    expect(n).toBe(2)
    adapter.session.setPrediction({ x: '1' })
    expect(n).toBe(3)
    adapter.removeChangeListener(listener)
    adapter.session.setPrediction({ x: '2' })
    expect(n).toBe(3)
  })
})

describe('run / stop 契约', () => {
  it('前置条件不满足时 run 同步抛错，不静默无事发生，也不调用 VM', () => {
    const { adapter, port } = setup()
    expect(() => adapter.run(() => {})).toThrow('预测')
    ready(adapter, flag(repeat(99, move(500))))
    expect(() => adapter.run(() => {})).toThrow()
    ready(adapter)
    port.setReady(false, '加载失败')
    expect(() => adapter.run(() => {})).toThrow('加载失败')
    expect(port.runs).toHaveLength(0)
    expect(adapter.getLastRunError()).toBeNull()
  })

  it('运行：先逐帧 frame，再 finished；EngineState 分数只反映本次，接住记 1', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    const events: RunEvent[] = []
    adapter.run(e => events.push(e))
    expect(adapter.getState()).toMatchObject({ running: true, score: 0 })
    port.emitFrame(1, 50)
    port.emitFrame(2, 100)
    port.land(150, loopMoves(3, 50))
    await flush()
    expect(events.map(e => e.kind)).toEqual(['frame', 'frame', 'finished'])
    expect(events[1].state).toMatchObject({ x: 100, running: true, frames: 2, score: 0 })
    expect(events[2].state).toMatchObject({ x: 150, running: false, score: 1 })
    expect(adapter.getState()).toEqual(events[2].state)

    // 第二次没接住：分数回到 0，不叠加
    const events2: RunEvent[] = []
    adapter.run(e => events2.push(e))
    port.land(50, loopMoves(1, 50))
    await flush()
    expect(events2.at(-1)?.state).toMatchObject({ x: 50, score: 0, running: false })
  })

  it('运行中再 run 抛错；stop 之后给出 stopped 事件，脚本保留、不判定', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    const events: RunEvent[] = []
    adapter.run(e => events.push(e))
    expect(() => adapter.run(() => {})).toThrow('正在运行')
    const stopsBefore = port.stops
    adapter.stop()
    await flush()
    expect(events.at(-1)?.kind).toBe('stopped')
    expect(events.at(-1)?.state.score).toBe(0)
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(adapter.getLastRunError()).toBeNull() // 学生主动停止不是错误，壳不应把它显示成错误
    expect(adapter.getScript()).toEqual(adapter.session.draft())
    expect(port.stops).toBe(stopsBefore + 1)
  })

  it('运行出错：收到 stopped，getLastRunError 给出原因，不判定', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    const events: RunEvent[] = []
    adapter.run(e => events.push(e))
    port.fail('沙箱崩了')
    await flush()
    expect(events.at(-1)?.kind).toBe('stopped')
    expect(adapter.getLastRunError()).toBe('运行没有完成：沙箱崩了')
    expect(adapter.getJudgmentResult()).toBeNull()
  })

  it('运行中改脚本：旧运行的结果不进入判定；适配器不再对它发 finished', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    const events: RunEvent[] = []
    adapter.run(e => events.push(e))
    adapter.session.editProgram(flag(repeat(3, move(40))))
    await flush()
    expect(events.map(e => e.kind)).not.toContain('finished')
    expect(adapter.getJudgmentResult()).toBeNull()
    expect(port.stops).toBeGreaterThan(0)
  })
})

describe('getJudgmentResult：共享 JudgmentResult 形状', () => {
  it('三层 id/label 固定；壳只显示 detail 和 conclusion，所以 detail 带“舞台结果：”等前缀，conclusion 含固定的“理解情况”说明', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.land(150, loopMoves(3, 50))
    await flush()
    const r = adapter.getJudgmentResult()!
    expect(r.layers.map(l => [l.id, l.label])).toEqual([['stage', '舞台结果'], ['task', '任务结果'], ['knowledge', '知识证据']])
    for (const l of r.layers) {
      expect(l.detail.startsWith(`${l.label}：`), l.id).toBe(true)
      expect(typeof l.passed).toBe('boolean')
    }
    expect(r.passed).toBe(true)
    expect(r.conclusion).toContain('这只说明这一次运行的行为')
    expect(r.conclusion).toContain('理解情况：')
    expect(r.conclusion).toContain('需要进一步解释或练习')
    expect(r.methodEvidence).toBeUndefined() // 壳不显示它，说明并入 conclusion
    expect(JSON.stringify(r)).not.toContain('已掌握')
  })

  it('探索关结论是“观察”，不下“达标”结论', async () => {
    const { adapter, port } = setup()
    adapter.session.setPrediction({ x: '40', caught: '接不住' })
    adapter.run(() => {})
    port.land(40, loopMoves(2, 20))
    await flush()
    const r = adapter.getJudgmentResult()!
    expect(r.conclusion.startsWith('这一关是观察：对一对你的预测和真实结果。')).toBe(true)
    expect(r.conclusion).toContain('需要进一步解释或练习')
    expect(r.conclusion).not.toContain('达标')
  })

  it('改脚本后旧判定立刻消失', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.land(150, loopMoves(3, 50))
    await flush()
    expect(adapter.getJudgmentResult()).not.toBeNull()
    adapter.session.editProgram(flag(repeat(3, move(49))))
    expect(adapter.getJudgmentResult()).toBeNull()
  })

  it('不通过时每一层的 passed 如实反映', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.land(50, loopMoves(1, 50))
    await flush()
    const r = adapter.getJudgmentResult()!
    expect(r.passed).toBe(false)
    expect(r.layers.find(l => l.id === 'stage')?.passed).toBe(false)
    expect(r.layers.find(l => l.id === 'task')?.passed).toBe(false)
  })
})

describe('舞台字典（StageSlotProps.stageState）', () => {
  it('是扁平的 number/string/boolean 字典，且 parseStageState 能还原', () => {
    const { adapter } = setup()
    const dict = adapter.getStageState()
    for (const v of Object.values(dict)) expect(['number', 'string', 'boolean']).toContain(typeof v)
    expect(parseStageState(dict)).toEqual({ basketX: 0, basketY: -130, fruitX: 100, fruitY: 150, running: false, levelId: 'explore' })
  })

  it('随运行帧更新、随切关更新', () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.emitFrame(2, 100)
    expect(parseStageState(adapter.getStageState())).toMatchObject({ basketX: 100, running: true, levelId: 'solve', fruitX: 150 })
    adapter.stop()
    adapter.session.switchLevel('transferLeft')
    expect(parseStageState(adapter.getStageState())).toMatchObject({ basketX: 0, fruitX: -100, levelId: 'transferLeft' })
  })

  it('类型守卫拒绝缺字段、错类型、未知关卡、非有限数', () => {
    const good = stageStateOf(startPositions('solve'), false, 'solve')
    expect(parseStageState(good)).not.toBeNull()
    expect(parseStageState(undefined)).toBeNull()
    expect(parseStageState({})).toBeNull()
    expect(parseStageState({ ...good, basketX: '0' })).toBeNull()
    expect(parseStageState({ ...good, fruitY: Number.NaN })).toBeNull()
    expect(parseStageState({ ...good, running: 'no' })).toBeNull()
    expect(parseStageState({ ...good, levelId: 'nope' })).toBeNull()
    const { basketX: _omit, ...missing } = good
    void _omit
    expect(parseStageState(missing)).toBeNull()
  })

  it('共享核心的类型文件不含本课对象名（舞台状态由课程自己持有）', () => {
    const dir = join(__dirname, '..', 'workspace')
    for (const file of ['workspace-slots.ts', 'workspace-adapters.ts']) {
      const text = readFileSync(join(dir, file), 'utf8')
      for (const stray of ['basketX', 'fruitX', 'fruitY', 'basketY']) expect(text, `${file} 含 ${stray}`).not.toContain(stray)
    }
  })
})

// ---- 共享 RunTrace 互转与判定等价 ------------------------------------------------------

function courseTrace(levelId: keyof typeof L02_LEVELS, basketX: number, moves: BasketMove[], over: Partial<RunTrace> = {}): RunTrace {
  return { ...syntheticTrace(levelId, SOLVE, 7, { basketX, moves }), ...over }
}

describe('共享 RunTrace 互转', () => {
  it('每次移动是一帧：source basket、event move、有符号 dx、dy 为 0，inLoop 保留', () => {
    const t = courseTrace('solve', 130, [{ frame: 1, dx: -20, inLoop: false }, { frame: 2, dx: 50, inLoop: true }])
    const shared = toSharedRunTrace(t)
    expect(shared).toMatchObject({ runId: 7, lessonId: 'G2-U3-L02', levelId: 'solve', landingFrame: framesToLand(L02_LEVELS.solve) })
    expect(shared.frames).toEqual([
      { frame: 1, event: 'move', source: 'basket', inLoop: false, dx: -20, dy: 0 },
      { frame: 2, event: 'move', source: 'basket', inLoop: true, dx: 50, dy: 0 },
    ])
  })

  it('共享轨迹里没有本课对象字段（没有 basketX / fruitX / landing）', () => {
    const text = JSON.stringify(toSharedRunTrace(courseTrace('solve', 150, loopMoves(3, 50))))
    for (const stray of ['basketX', 'fruitX', '"landing"', 'fingerprint']) expect(text).not.toContain(stray)
  })

  it('没落地的轨迹没有 landingFrame', () => {
    const t = syntheticTrace('solve', SOLVE, 1, { endedBy: 'frameCap' })
    expect(toSharedRunTrace(t).landingFrame).toBeUndefined()
    expect(judgeSharedTrace(toSharedRunTrace(t))).toBeNull()
  })

  it('judgeSharedTrace 与直接 judgeRun 等价：各关 × 各种移动方式（含向左、不在循环里、落地后才移动、没动）', () => {
    const cases: Array<[keyof typeof L02_LEVELS, number, BasketMove[]]> = [
      ['solve', 150, loopMoves(3, 50)],
      ['solve', 150, [{ frame: 1, dx: 150, inLoop: false }]],
      ['solve', 0, []],
      ['solve', 100, [{ frame: 1, dx: 100, inLoop: true }, ...loopMoves(0, 0)]],
      ['solve', 120, [{ frame: 1, dx: 30, inLoop: false }, { frame: 2, dx: 30, inLoop: true }, { frame: 3, dx: 30, inLoop: true }, { frame: 4, dx: 30, inLoop: true }]],
      ['transferLeft', -100, loopMoves(5, -20)],
      ['transferLeft', 100, loopMoves(5, 20)],
      ['transferLeft', -90, [...loopMoves(3, -30), { frame: 4, dx: 0, inLoop: true }]],
      ['transferFast', 150, loopMoves(3, 50)],
      ['transferFast', 100, loopMoves(2, 50)],
      ['explore', 40, loopMoves(2, 20)],
      // 落地之后才执行的移动不应影响结果
      ['solve', 150, [...loopMoves(3, 50), { frame: framesToLand(L02_LEVELS.solve) + 5, dx: 90, inLoop: true }]],
    ]
    for (const [levelId, basketX, moves] of cases) {
      const level = L02_LEVELS[levelId]
      const direct = toJudgmentResult(judgeRun(courseTrace(levelId, basketX, moves), level), levelId)
      const shared = judgeSharedTrace(toSharedRunTrace(courseTrace(levelId, basketX, moves)))
      expect(shared, `${levelId} ${basketX}`).toEqual(direct)
    }
  })

  it('落地之后的移动在 Σdx 还原时同样被排除（落点用落地帧及之前的移动）', () => {
    const land = framesToLand(L02_LEVELS.solve)
    const t = courseTrace('solve', 150, [...loopMoves(3, 50), { frame: land + 1, dx: -150, inLoop: true }])
    expect(judgeSharedTrace(toSharedRunTrace(t))?.passed).toBe(true)
  })

  it('阈值仍在课程 params：改变容差边界的两个相邻落点结论相反', () => {
    const tol = L02_PARAMS.catchTolerance
    const near = judgeSharedTrace(toSharedRunTrace(courseTrace('solve', 150 - tol, loopMoves(1, 150 - tol))))
    const far = judgeSharedTrace(toSharedRunTrace(courseTrace('solve', 150 - tol - 1, loopMoves(1, 150 - tol - 1))))
    expect(near?.layers.find(l => l.id === 'stage')?.passed).toBe(true)
    expect(far?.layers.find(l => l.id === 'stage')?.passed).toBe(false)
  })

  it('不是本课 / 未知关卡的共享轨迹不判定', () => {
    const shared = toSharedRunTrace(courseTrace('solve', 150, loopMoves(3, 50)))
    expect(judgeSharedTrace({ ...shared, lessonId: 'A1-U1-L01' })).toBeNull()
    expect(judgeSharedTrace({ ...shared, levelId: 'nope' })).toBeNull()
    expect(judgeSharedTrace({ ...shared, levelId: undefined })).toBeNull()
  })

  it('JudgmentAdapter：可判定时给结果，不可判定时给“不判定”而不是编一个结论', () => {
    const ok = l02JudgmentAdapter.judge(toSharedRunTrace(courseTrace('solve', 150, loopMoves(3, 50))), SOLVE)
    expect(ok.passed).toBe(true)
    const none = l02JudgmentAdapter.judge({ runId: 1, lessonId: 'G2-U3-L02', levelId: 'solve', frames: [] }, SOLVE)
    expect(none.passed).toBe(false)
    expect(none.layers).toEqual([])
    expect(none.conclusion).toContain('不判定')
    expect(none.conclusion).toContain('需要进一步解释或练习')
    expect(stableFingerprint(SOLVE)).toBeTruthy()
  })
})
