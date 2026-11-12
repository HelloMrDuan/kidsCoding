// @vitest-environment node
// LessonL05Adapter：共享 EngineAdapter 形状、一课一键草稿、共享 RunTrace 映射、舞台字典。
// 运行时序用假 VM 端口（合成轨迹）；真实 VM 的等价验证见 tests/e2e/g2-u3-l05-vm.spec.ts。
import { describe, expect, it } from 'vitest'
import { LessonL05Adapter, toJudgmentResult, toSharedRunTrace } from './lesson-adapter'
import { L05_LEVELS } from './params'
import { judgeRun } from './judge'
import { PREDICTION_REQUIRED_REASON } from './session'
import { syntheticTrace, FakeVmPort, flush } from './testing/fake-vm-port'
import type { Block, Program } from './program'
import type { RunEvent } from '../workspace/workspace-adapters'

const flag = (...body: Block[]): Program => ({ scripts: [{ hat: 'flag', body }] })
const STANDARD: Program = flag(
  { t: 'setTime', value: 10 },
  { t: 'untilZero', body: [{ t: 'wait', secs: 1 }, { t: 'decrease', by: 1 }] },
  { t: 'broadcast' },
)

function makeAdapter() {
  const port = new FakeVmPort()
  const adapter = new LessonL05Adapter({ port })
  return { port, adapter }
}

describe('LessonL05Adapter', () => {
  it('mount / unmount 委托给 VM 端口', () => {
    const { port, adapter } = makeAdapter()
    adapter.mount({} as HTMLElement)
    adapter.unmount()
    expect(port.mounts).toBe(1)
    expect(port.unmounts).toBe(1)
  })

  it('getScript 是草稿；loadScript 不合法抛错且不变；validateDraft 与之同口径', () => {
    const { adapter } = makeAdapter()
    adapter.session.switchLevel('solve')
    adapter.session.editProgram(STANDARD)
    const draft = adapter.getScript() as { levelId: string }
    expect(draft.levelId).toBe('solve')
    expect(adapter.validateDraft(draft)).toBe(true)
    expect(adapter.validateDraft({ version: 1, levelId: 'solve', programs: { solve: flag({ t: 'wait', secs: 9 }) } })).toBe(false)
    expect(() => adapter.loadScript({ nope: true })).toThrow()
    expect((adapter.getScript() as { levelId: string }).levelId).toBe('solve')
  })

  it('文件能力：一课一份作品，可保存 / 导出 / 导入 / 重置，不能新建', () => {
    const { adapter } = makeAdapter()
    expect(adapter.getFileCapabilities()).toEqual({ canNew: false, canSave: true, canExport: true, canImport: true, canReset: true })
  })

  it('run 前置条件不满足时同步抛错：没写预测、引擎没准备好、正在运行', () => {
    const { port, adapter } = makeAdapter()
    expect(() => adapter.run(() => {})).toThrow(PREDICTION_REQUIRED_REASON)
    adapter.session.setPrediction({ time: '-5', after: '不会' })
    port.setReady(false, '引擎坏了')
    expect(() => adapter.run(() => {})).toThrow('引擎坏了')
  })

  it('完整运行：帧事件透传，结束事件带最终得分；判定经 getJudgmentResult 交给壳', async () => {
    const { port, adapter } = makeAdapter()
    adapter.session.setPrediction({ time: '0', after: '不会' })
    const events: RunEvent[] = []
    adapter.run(e => events.push(e))
    expect(() => adapter.run(() => {})).toThrow('正在运行')
    port.emitFrame(31, { timeLeft: 9, score: 1 })
    expect(events.some(e => e.kind === 'frame' && e.state.frames === 31)).toBe(true)
    expect(adapter.getStageState()).toMatchObject({ timeLeft: 9, score: 1, running: true, levelId: 'explore' })
    port.finish({ finalTime: -5 })
    await flush()
    const last = events[events.length - 1]
    expect(last.kind).toBe('finished')
    expect(adapter.getState().running).toBe(false)
    const jr = adapter.getJudgmentResult()
    expect(jr?.layers.map(l => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(jr?.conclusion).toContain('理解情况')
    expect(jr?.conclusion).toContain('这一关是观察')
  })

  it('第二关通过：getJudgmentResult 的 conclusion 用课程自己的结论句', async () => {
    const { port, adapter } = makeAdapter()
    adapter.session.switchLevel('solve')
    adapter.session.editProgram(STANDARD)
    adapter.run(() => {})
    port.finish()
    await flush()
    const jr = adapter.getJudgmentResult()
    expect(jr?.passed).toBe(true)
    expect(jr?.conclusion).toContain('任务达标，也满足了判断要求')
  })

  it('作品被编辑才通知 change listener；运行帧不通知', async () => {
    const { port, adapter } = makeAdapter()
    let calls = 0
    adapter.addChangeListener(() => { calls += 1 })
    adapter.session.setPrediction({ time: '-5', after: '不会' })
    expect(calls).toBe(1)
    adapter.run(() => {})
    port.emitFrame(31, { timeLeft: 9, score: 1 })
    expect(calls).toBe(1)
    port.finish({ finalTime: -5 })
    await flush()
    expect(calls).toBe(1)
  })

  it('toJudgmentResult：未判定返回 null；三层 detail 带课程前缀原文', () => {
    const trace = syntheticTrace('solve', STANDARD, 1)
    const j = judgeRun(trace, L05_LEVELS.solve)
    const jr = toJudgmentResult(j, 'solve')
    expect(jr?.layers[0].detail).toContain('舞台结果：')
    expect(jr?.layers[1].detail).toContain('任务结果：')
    expect(jr?.layers[2].detail).toContain('知识证据：')
    expect(toJudgmentResult(null, 'solve')).toBeNull()
    expect(toJudgmentResult({ status: 'not-judged', reason: 'x' }, 'solve')).toBeNull()
  })

  it('toSharedRunTrace：得分变化与广播各成一帧，按帧排序，带 runId 与课程标识', () => {
    const trace = syntheticTrace('solve', STANDARD, 7)
    const shared = toSharedRunTrace(trace)
    expect(shared.runId).toBe(7)
    expect(shared.lessonId).toBe('G2-U3-L05')
    expect(shared.levelId).toBe('solve')
    expect(shared.frames.some(f => f.event === 'broadcast' && f.source === '学生')).toBe(true)
    expect(shared.frames.filter(f => f.event === 'score').every(f => (f.dx ?? 0) > 0)).toBe(true)
    const sorted = [...shared.frames].sort((a, b) => a.frame - b.frame)
    expect(shared.frames).toEqual(sorted)
  })
})
