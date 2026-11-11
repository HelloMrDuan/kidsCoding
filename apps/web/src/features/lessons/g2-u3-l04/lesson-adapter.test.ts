// @vitest-environment node
// LessonL04Adapter：共享 EngineAdapter 形状、一课一键草稿、共享 RunTrace 映射、舞台字典。
// 运行时序用假 VM 端口（合成轨迹）；真实 VM 的等价验证见 tests/e2e/g2-u3-l03-vm.spec.ts。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { L04_CONTRACT } from './contract'
import { judgeRun } from './judge'
import * as lessonAdapterModule from './lesson-adapter'
import { LessonL04Adapter, toJudgmentResult, toSharedRunTrace } from './lesson-adapter'
import { L04_LEVEL_ORDER, L04_LEVELS } from './params'
import type { Block, Program } from './program'
import { parseStageState, stageStateOf, startPositions } from './stage-state'
import { loadDraft as l03LoadDraft, saveDraft as l03SaveDraft, type StorageLike } from './state'
import { FakeVmPort, flush, syntheticTrace } from './testing/fake-vm-port'
import type { EngineAdapter, RunEvent } from '../workspace/workspace-adapters'
import { draftKeyFor } from '../workspace/lesson-contract'
import { loadDraft as sharedLoadDraft, saveDraft as sharedSaveDraft } from '../workspace/workspace-draft'

const score = (by: number) => ({ t: 'score' as const, by })
const hide = { t: 'hide' as const }
const iftouch = (...body: Array<{ t: 'score'; by: number } | { t: 'hide' }>): Block => ({ t: 'iftouch', body })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body: body as never })
const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const SOLVE: Program = flag(repeat(30, iftouch(score(1), hide)))
const BLUE_SCORED = { scores: [{ ball: '红球' as const, by: 1, frame: 21 }, { ball: '蓝球' as const, by: 1, frame: 21 }] }

function setup() {
  const port = new FakeVmPort()
  const adapter = new LessonL04Adapter({ port })
  return { port, adapter }
}
function ready(adapter: LessonL04Adapter, program: Program = SOLVE) {
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
    adapter.session.setPrediction({ score: '1', blue: '不会' })
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

  it('键与共享规范一致：kidscoding-draft:G2-U3-L04', () => {
    expect(draftKeyFor('G2-U3-L04')).toBe(L04_CONTRACT.draftKey)
    expect(L04_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L04')
  })

  it('共享 workspace-draft 写的草稿，课程自己的 loadDraft 能读；反过来共享 loadDraft 也能读课程写的', () => {
    const { adapter } = setup()
    ready(adapter)
    const store = memoryStorage()
    expect(sharedSaveDraft(store, 'G2-U3-L04', adapter.getScript())).toEqual({ ok: true })
    const own = l03LoadDraft(store)
    expect(own.reason).toBeNull()
    expect(own.state?.programs.solve).toEqual(SOLVE)

    const store2 = memoryStorage()
    expect(l03SaveDraft(store2, adapter.session.getSnapshot().state)).toEqual({ ok: true })
    const shared = sharedLoadDraft(store2, 'G2-U3-L04')
    expect(shared.reason).toBeNull()
    expect(adapter.validateDraft(shared.data)).toBe(true)
    expect(Object.keys(store2.data)).toEqual(['kidscoding-draft:G2-U3-L04'])
  })

  it('整个作品（四关）只落在一个键里，不拆成四个课节', () => {
    const { adapter } = setup()
    const store = memoryStorage()
    for (const id of L04_LEVEL_ORDER) {
      adapter.session.switchLevel(id)
      if (id !== 'explore') adapter.session.editProgram(flag(repeat(2 + L04_LEVEL_ORDER.indexOf(id), iftouch(score(1), hide))))
      sharedSaveDraft(store, 'G2-U3-L04', adapter.getScript())
    }
    expect(Object.keys(store.data)).toEqual(['kidscoding-draft:G2-U3-L04'])
    const saved = (JSON.parse(store.data['kidscoding-draft:G2-U3-L04']).script as ReturnType<LessonL04Adapter['session']['draft']>)
    expect(Object.keys(saved.programs).sort()).toEqual(['solve', 'transferPoints', 'transferSlow'])
  })

  it('变化监听：脚本、预测、关卡的编辑通知；帧、运行结果、提示、角色不通知', async () => {
    const { adapter, port } = setup()
    let n = 0
    const listener = () => { n += 1 }
    adapter.addChangeListener(listener)
    ready(adapter) // 切关 + 改脚本：2 次
    expect(n).toBe(2)
    adapter.session.revealHint()
    adapter.session.setRole('backdrop')
    adapter.session.setPaletteOpen(true)
    expect(n).toBe(2)
    adapter.run(() => {})
    port.emitFrame(1)
    port.finish()
    await flush()
    expect(n).toBe(2)
    adapter.session.setPrediction({ score: '1' })
    expect(n).toBe(3)
    adapter.removeChangeListener(listener)
    adapter.session.setPrediction({ score: '2' })
    expect(n).toBe(3)
  })
})

describe('run / stop 契约', () => {
  it('前置条件不满足时 run 同步抛错，不静默无事发生，也不调用 VM', () => {
    const { adapter, port } = setup()
    expect(() => adapter.run(() => {})).toThrow('预测')
    ready(adapter, flag(repeat(101, iftouch(score(1), hide))))
    expect(() => adapter.run(() => {})).toThrow()
    ready(adapter)
    port.setReady(false, '加载失败')
    expect(() => adapter.run(() => {})).toThrow('加载失败')
    expect(port.runs).toHaveLength(0)
    expect(adapter.getLastRunError()).toBeNull()
  })

  it('运行：先逐帧 frame，再 finished；EngineState.score 就是本次真实 VM 里的得分，只反映本次，不叠加', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    const events: RunEvent[] = []
    adapter.run(e => events.push(e))
    expect(adapter.getState()).toMatchObject({ running: true, score: 0 })
    port.emitFrame(1)
    port.emitFrame(2, { score: 1, hitBall: { x: 0, y: -60, visible: false } })
    port.finish()
    await flush()
    expect(events.map(e => e.kind)).toEqual(['frame', 'frame', 'finished'])
    expect(events[1].state).toMatchObject({ running: true, frames: 2, score: 1 })
    expect(events[2].state).toMatchObject({ running: false, score: 1 })
    expect(adapter.getState()).toEqual(events[2].state)

    // 第二次蓝球也被加了分：分数是这一次的 2，不是 1 + 2，也不是 0
    const events2: RunEvent[] = []
    adapter.run(e => events2.push(e))
    port.finish(BLUE_SCORED)
    await flush()
    expect(events2.at(-1)?.state).toMatchObject({ score: 2, running: false })
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
    adapter.session.editProgram(flag(repeat(31, iftouch(score(1), hide))))
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
    port.finish()
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
    adapter.session.setPrediction({ score: '1', blue: '不会' })
    adapter.run(() => {})
    port.finish()
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
    port.finish()
    await flush()
    expect(adapter.getJudgmentResult()).not.toBeNull()
    adapter.session.editProgram(flag(repeat(33, iftouch(score(1), hide))))
    expect(adapter.getJudgmentResult()).toBeNull()
  })

  it('不通过时每一层的 passed 如实反映', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.finish(BLUE_SCORED)
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
    expect(parseStageState(dict)).toEqual({
      positions: { basket: { x: 0, y: -90 }, hitBall: { x: 0, y: 150, visible: true }, groundBall: { x: -150, y: 150, visible: true }, score: 0 },
      running: false,
      levelId: 'explore',
    })
  })

  it('随运行帧更新（两个球的位置、可见性与得分）、随切关复位', () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.emitFrame(2, { score: 1, hitBall: { x: 0, y: -60, visible: false }, groundBall: { x: -150, y: -20, visible: true } })
    expect(parseStageState(adapter.getStageState())).toMatchObject({
      running: true, levelId: 'solve',
      positions: { score: 1, hitBall: { visible: false, y: -60 }, groundBall: { visible: true, y: -20 } },
    })
    adapter.stop()
    adapter.session.switchLevel('transferPoints')
    expect(parseStageState(adapter.getStageState())).toMatchObject({ levelId: 'transferPoints', positions: { score: 0, hitBall: { visible: true, y: 150 } } })
  })

  it('类型守卫拒绝缺字段、错类型、未知关卡、非有限数', () => {
    const good = stageStateOf(startPositions('solve'), false, 'solve')
    expect(parseStageState(good)).not.toBeNull()
    expect(parseStageState(undefined)).toBeNull()
    expect(parseStageState({})).toBeNull()
    expect(parseStageState({ ...good, hitX: '0' })).toBeNull()
    expect(parseStageState({ ...good, groundY: Number.NaN })).toBeNull()
    expect(parseStageState({ ...good, score: Number.POSITIVE_INFINITY })).toBeNull()
    expect(parseStageState({ ...good, hitVisible: 'yes' })).toBeNull()
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
      for (const stray of ['hitBall', 'groundBall', 'sensing_touchingobject', 'scratch-render']) expect(text, `${file} 含 ${stray}`).not.toContain(stray)
    }
  })
})

// ---- 共享 RunTrace 映射 ------------------------------------------------------------------

describe('共享 RunTrace 映射', () => {
  it('每次真实加分是一帧：event score、source 为球的名字、dx 是加的分数、dy 为 0', () => {
    const t = syntheticTrace('solve', SOLVE, 7, { scores: [{ ball: '红球', by: 1, frame: 21 }, { ball: '蓝球', by: 2, frame: 25 }] })
    const shared = toSharedRunTrace(t)
    expect(shared).toMatchObject({ runId: 7, lessonId: 'G2-U3-L04', levelId: 'solve' })
    expect(shared.frames).toEqual([
      { frame: 21, event: 'score', source: '红球', dx: 1, dy: 0 },
      { frame: 25, event: 'score', source: '蓝球', dx: 2, dy: 0 },
    ])
  })

  it('共享轨迹里没有本课对象字段，也没有“检查”的结果（检查只在课程判定里）', () => {
    const text = JSON.stringify(toSharedRunTrace(syntheticTrace('solve', SOLVE, 1)))
    for (const stray of ['fingerprint', 'checks', 'result', 'hides', 'finalScore', 'visible']) expect(text).not.toContain(stray)
  })

  it('没有加分的运行：没有帧', () => {
    expect(toSharedRunTrace(syntheticTrace('solve', SOLVE, 1, { scores: [], hides: [], finalScore: 0 })).frames).toEqual([])
  })

  it('本课故意不提供共享轨迹判定器：共享 RunFrame 装不下检查结果，只看加分序列会得出和课程判定不同的结论', () => {
    // 同样的加分序列（红球在第 21 帧加 1 分），但一个有“碰到 篮子？”为真的检查，一个根本没有检查：
    // 课程判定的知识证据结论相反，而共享轨迹（只含加分）完全一样。
    const withCheck = syntheticTrace('solve', SOLVE, 1)
    const withoutCheck = syntheticTrace('solve', SOLVE, 1, { checks: [] })
    const a = judgeRun(withCheck, L04_LEVELS.solve)
    const b = judgeRun(withoutCheck, L04_LEVELS.solve)
    expect(a.status === 'judged' && a.knowledge.passed).toBe(true)
    expect(b.status === 'judged' && b.knowledge.passed).toBe(false)
    expect(toSharedRunTrace(withCheck).frames).toEqual(toSharedRunTrace(withoutCheck).frames)
    const exported = lessonAdapterModule as Record<string, unknown>
    expect(exported.judgeSharedTrace).toBeUndefined()
    expect(exported.l04JudgmentAdapter).toBeUndefined()
  })

  it('适配器的 getJudgmentResult 与直接 judgeRun → toJudgmentResult 一致', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.finish(BLUE_SCORED)
    await flush()
    const trace = adapter.session.getSnapshot().trace!
    expect(adapter.getJudgmentResult()).toEqual(toJudgmentResult(judgeRun(trace, L04_LEVELS.solve), 'solve'))
  })
})
