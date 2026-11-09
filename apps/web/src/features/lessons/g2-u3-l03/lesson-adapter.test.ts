// @vitest-environment node
// LessonL03Adapter：共享 EngineAdapter 形状、一课一键草稿、共享 RunTrace 映射、舞台字典。
// 运行时序用假 VM 端口（合成轨迹）；真实 VM 的等价验证见 tests/e2e/g2-u3-l03-vm.spec.ts。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { L03_CONTRACT } from './contract'
import { judgeRun } from './judge'
import * as lessonAdapterModule from './lesson-adapter'
import { LessonL03Adapter, toJudgmentResult, toSharedRunTrace } from './lesson-adapter'
import { L03_LEVEL_ORDER, L03_LEVELS } from './params'
import type { Block, Program } from './program'
import { MAX_TRAIL, parseStageState, parseTrail, stageStateOf, startPositions } from './stage-state'
import { loadDraft as l03LoadDraft, saveDraft as l03SaveDraft, type StorageLike } from './state'
import { defaultXs, FakeVmPort, flush, syntheticTrace } from './testing/fake-vm-port'
import type { EngineAdapter, RunEvent } from '../workspace/workspace-adapters'
import { draftKeyFor } from '../workspace/lesson-contract'
import { loadDraft as sharedLoadDraft, saveDraft as sharedSaveDraft } from '../workspace/workspace-draft'

const randomx = (from: number, to: number): Block => ({ t: 'randomx', from, to })
const repeat = (times: number, ...body: Block[]): Block => ({ t: 'repeat', times, body })
const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const SOLVE: Program = flag(repeat(10, randomx(-150, 150)))
const ESCAPING_XS = defaultXs('solve').map((x, i) => (i === 0 ? 250 : x))

function setup() {
  const port = new FakeVmPort()
  const adapter = new LessonL03Adapter({ port })
  return { port, adapter }
}
function ready(adapter: LessonL03Adapter, program: Program = SOLVE) {
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
    adapter.session.setPrediction({ count: '3', escapes: '会' })
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

  it('键与共享规范一致：kidscoding-draft:G2-U3-L03', () => {
    expect(draftKeyFor('G2-U3-L03')).toBe(L03_CONTRACT.draftKey)
    expect(L03_CONTRACT.draftKey).toBe('kidscoding-draft:G2-U3-L03')
  })

  it('共享 workspace-draft 写的草稿，课程自己的 loadDraft 能读；反过来共享 loadDraft 也能读课程写的', () => {
    const { adapter } = setup()
    ready(adapter)
    const store = memoryStorage()
    expect(sharedSaveDraft(store, 'G2-U3-L03', adapter.getScript())).toEqual({ ok: true })
    const own = l03LoadDraft(store)
    expect(own.reason).toBeNull()
    expect(own.state?.programs.solve).toEqual(SOLVE)

    const store2 = memoryStorage()
    expect(l03SaveDraft(store2, adapter.session.getSnapshot().state)).toEqual({ ok: true })
    const shared = sharedLoadDraft(store2, 'G2-U3-L03')
    expect(shared.reason).toBeNull()
    expect(adapter.validateDraft(shared.data)).toBe(true)
    expect(Object.keys(store2.data)).toEqual(['kidscoding-draft:G2-U3-L03'])
  })

  it('整个作品（四关）只落在一个键里，不拆成四个课节', () => {
    const { adapter } = setup()
    const store = memoryStorage()
    for (const id of L03_LEVEL_ORDER) {
      adapter.session.switchLevel(id)
      if (id !== 'explore') adapter.session.editProgram(flag(repeat(2, randomx(-10 - L03_LEVEL_ORDER.indexOf(id), 10 + L03_LEVEL_ORDER.indexOf(id)))))
      sharedSaveDraft(store, 'G2-U3-L03', adapter.getScript())
    }
    expect(Object.keys(store.data)).toEqual(['kidscoding-draft:G2-U3-L03'])
    const saved = (JSON.parse(store.data['kidscoding-draft:G2-U3-L03']).script as ReturnType<LessonL03Adapter['session']['draft']>)
    expect(Object.keys(saved.programs).sort()).toEqual(['solve', 'transferMiddle', 'transferRight'])
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
    port.emitFrame(1, [50])
    port.finish()
    await flush()
    expect(n).toBe(2)
    adapter.session.setPrediction({ count: '1' })
    expect(n).toBe(3)
    adapter.removeChangeListener(listener)
    adapter.session.setPrediction({ count: '2' })
    expect(n).toBe(3)
  })
})

describe('run / stop 契约', () => {
  it('前置条件不满足时 run 同步抛错，不静默无事发生，也不调用 VM', () => {
    const { adapter, port } = setup()
    expect(() => adapter.run(() => {})).toThrow('预测')
    ready(adapter, flag(repeat(99, randomx(0, 0))))
    expect(() => adapter.run(() => {})).toThrow()
    ready(adapter)
    port.setReady(false, '加载失败')
    expect(() => adapter.run(() => {})).toThrow('加载失败')
    expect(port.runs).toHaveLength(0)
    expect(adapter.getLastRunError()).toBeNull()
  })

  it('运行：先逐帧 frame，再 finished；EngineState 分数只反映本次，全部在范围内记 1', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    const events: RunEvent[] = []
    adapter.run(e => events.push(e))
    expect(adapter.getState()).toMatchObject({ running: true, score: 0 })
    port.emitFrame(1, [50])
    port.emitFrame(2, [50, 100])
    port.finish({ xs: [50, 100, -30, 20, 0, 60, -70, 90, 10, 150] })
    await flush()
    expect(events.map(e => e.kind)).toEqual(['frame', 'frame', 'finished'])
    expect(events[1].state).toMatchObject({ x: 100, running: true, frames: 2, score: 0 })
    expect(events[2].state).toMatchObject({ x: 150, running: false, score: 1 })
    expect(adapter.getState()).toEqual(events[2].state)

    // 第二次有一次跑出范围：分数回到 0，不叠加
    const events2: RunEvent[] = []
    adapter.run(e => events2.push(e))
    port.finish({ xs: [...ESCAPING_XS] })
    await flush()
    expect(events2.at(-1)?.state).toMatchObject({ x: ESCAPING_XS[ESCAPING_XS.length - 1], score: 0, running: false })
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
    adapter.session.editProgram(flag(repeat(10, randomx(-100, 100))))
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
    adapter.session.setPrediction({ count: '3', escapes: '会' })
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
    adapter.session.editProgram(flag(repeat(10, randomx(-149, 150))))
    expect(adapter.getJudgmentResult()).toBeNull()
  })

  it('不通过时每一层的 passed 如实反映', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.finish({ xs: ESCAPING_XS })
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
    expect(parseStageState(dict)).toEqual({ giftX: 0, giftY: 0, placed: 0, trail: [], running: false, levelId: 'explore' })
  })

  it('随运行帧更新（礼物位置与已出现过的位置）、随切关复位', () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.emitFrame(2, [50, -120])
    expect(parseStageState(adapter.getStageState())).toMatchObject({ giftX: -120, placed: 2, trail: [50, -120], running: true, levelId: 'solve' })
    adapter.stop()
    adapter.session.switchLevel('transferRight')
    expect(parseStageState(adapter.getStageState())).toMatchObject({ giftX: 0, placed: 0, trail: [], levelId: 'transferRight' })
  })

  it('类型守卫拒绝缺字段、错类型、未知关卡、非有限数', () => {
    const good = stageStateOf(startPositions('solve'), false, 'solve')
    expect(parseStageState(good)).not.toBeNull()
    expect(parseStageState(undefined)).toBeNull()
    expect(parseStageState({})).toBeNull()
    expect(parseStageState({ ...good, giftX: '0' })).toBeNull()
    expect(parseStageState({ ...good, giftY: Number.NaN })).toBeNull()
    expect(parseStageState({ ...good, trail: 5 })).toBeNull()
    expect(parseStageState({ ...good, running: 'no' })).toBeNull()
    expect(parseStageState({ ...good, levelId: 'nope' })).toBeNull()
    const { giftX: _omit, ...missing } = good
    void _omit
    expect(parseStageState(missing)).toBeNull()
  })

  it('trail 文字里不是数字的片段被丢弃，不画出假位置；超长被截断', () => {
    expect(parseTrail('')).toEqual([])
    expect(parseTrail('10,abc,,-5, 7')).toEqual([10, -5, 7])
    expect(parseTrail(Array.from({ length: 200 }, (_, i) => i).join(',')).length).toBe(MAX_TRAIL)
  })

  it('共享核心的类型文件不含本课对象名（舞台状态由课程自己持有）', () => {
    const dir = join(__dirname, '..', 'workspace')
    for (const file of ['workspace-slots.ts', 'workspace-adapters.ts']) {
      const text = readFileSync(join(dir, file), 'utf8')
      for (const stray of ['giftX', 'giftY', 'randomx', 'operator_random']) expect(text, `${file} 含 ${stray}`).not.toContain(stray)
    }
  })
})

// ---- 共享 RunTrace 映射 ------------------------------------------------------------------

describe('共享 RunTrace 映射', () => {
  it('每次放置是一帧：source gift、event place、有符号 dx（相对上一个位置）、dy 为 0，inLoop 来自对应那次取随机数', () => {
    const t = syntheticTrace('solve', SOLVE, 7, { xs: [30, -20, 100] })
    t.draws[0].inLoop = false
    const shared = toSharedRunTrace(t)
    expect(shared).toMatchObject({ runId: 7, lessonId: 'G2-U3-L03', levelId: 'solve' })
    expect(shared.frames).toEqual([
      { frame: 1, event: 'place', source: 'gift', inLoop: false, dx: 30, dy: 0 },
      { frame: 2, event: 'place', source: 'gift', inLoop: true, dx: -50, dy: 0 },
      { frame: 3, event: 'place', source: 'gift', inLoop: true, dx: 120, dy: 0 },
    ])
    expect(shared.landingFrame).toBeUndefined()
  })

  it('共享轨迹里没有本课对象字段，也没有上下界（上下界只在课程判定里）', () => {
    const text = JSON.stringify(toSharedRunTrace(syntheticTrace('solve', SOLVE, 1, { from: -150, to: 150 })))
    for (const stray of ['giftX', 'fingerprint', 'from', 'to"', 'bound', 'draws']) expect(text).not.toContain(stray)
  })

  it('没有放置的运行：没有帧', () => {
    expect(toSharedRunTrace(syntheticTrace('solve', SOLVE, 1, { xs: [] })).frames).toEqual([])
  })

  it('本课故意不提供共享轨迹判定器：共享 RunFrame 装不下上下界，只看位移会得出和课程判定不同的结论', () => {
    // 同样的 10 个位置，上下界不同 → 课程判定的“知识证据”结论相反；位移序列完全相同，所以位移序列判定不出区别。
    const xs = defaultXs('solve').map(x => Math.round(x * 0.5))
    const inside = judgeRun(syntheticTrace('solve', SOLVE, 1, { xs, from: -150, to: 150 }), L03_LEVELS.solve)
    const wide = judgeRun(syntheticTrace('solve', SOLVE, 1, { xs, from: -300, to: 300 }), L03_LEVELS.solve)
    expect(inside.status === 'judged' && inside.knowledge.passed).toBe(true)
    expect(wide.status === 'judged' && wide.knowledge.passed).toBe(false)
    expect(toSharedRunTrace(syntheticTrace('solve', SOLVE, 1, { xs, from: -150, to: 150 })).frames)
      .toEqual(toSharedRunTrace(syntheticTrace('solve', SOLVE, 1, { xs, from: -300, to: 300 })).frames)
    const exported = lessonAdapterModule as Record<string, unknown>
    expect(exported.judgeSharedTrace).toBeUndefined()
    expect(exported.l03JudgmentAdapter).toBeUndefined()
  })

  it('适配器的 getJudgmentResult 与直接 judgeRun → toJudgmentResult 一致', async () => {
    const { adapter, port } = setup()
    ready(adapter)
    adapter.run(() => {})
    port.finish({ xs: ESCAPING_XS })
    await flush()
    const trace = adapter.session.getSnapshot().trace!
    expect(adapter.getJudgmentResult()).toEqual(toJudgmentResult(judgeRun(trace, L03_LEVELS.solve), 'solve'))
  })
})
