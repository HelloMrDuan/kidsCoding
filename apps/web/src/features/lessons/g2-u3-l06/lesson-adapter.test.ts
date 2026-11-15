// 适配器单测（假 VM 端口）：草稿面、舞台字典、判定映射、setStageHost 委托。
// 只验证适配器形状与措辞搬运，不验证 VM 行为。

import { describe, expect, it } from 'vitest'
import { judgeRun } from './judge'
import { LessonL06Adapter, toJudgmentResult, toSharedRunTrace } from './lesson-adapter'
import { L06_LEVELS } from './params'
import { referenceProgram } from './reference'
import { FakeVmPort, syntheticTrace } from './testing/fake-vm-port'

describe('LessonL06Adapter', () => {
  it('getScript/loadScript 往返；validateDraft 区分合法与非法', () => {
    const adapter = new LessonL06Adapter({ port: new FakeVmPort() })
    const draft = adapter.getScript()
    expect(adapter.validateDraft(draft)).toBe(true)
    expect(adapter.validateDraft({ version: 3 })).toBe(false)
    expect(adapter.validateDraft(null)).toBe(false)
    adapter.session.switchLevel('solve')
    adapter.session.editProgram(referenceProgram(L06_LEVELS.solve))
    const draft2 = adapter.getScript()
    const other = new LessonL06Adapter({ port: new FakeVmPort() })
    other.loadScript(draft2)
    expect(other.session.view().program).toEqual(referenceProgram(L06_LEVELS.solve))
    expect(() => other.loadScript({ bad: true })).toThrow()
  })

  it('文件能力：一课一份作品，可保存/导出/导入/重开，不可新建', () => {
    const adapter = new LessonL06Adapter({ port: new FakeVmPort() })
    expect(adapter.getFileCapabilities()).toEqual({ canNew: false, canSave: true, canExport: true, canImport: true, canReset: true })
  })

  it('getStageState 是普通字典，含得分与时间', () => {
    const adapter = new LessonL06Adapter({ port: new FakeVmPort() })
    const dict = adapter.getStageState()
    expect(dict.score).toBe(0)
    expect(dict.timeLeft).toBe(20)
    expect(dict.levelId).toBe('explore')
  })

  it('setStageHost 委托给端口', () => {
    const port = new FakeVmPort()
    const adapter = new LessonL06Adapter({ port })
    adapter.setStageHost(null)
    expect(port.stageHosts).toBe(1)
  })

  it('判定映射：三层 detail 原样来自 judge，conclusion 带理解说明', () => {
    const trace = syntheticTrace('solve', referenceProgram(L06_LEVELS.solve), 1)
    const j = judgeRun(trace, L06_LEVELS.solve)
    const r = toJudgmentResult(j, 'solve')
    expect(r?.passed).toBe(true)
    expect(r?.layers.map(l => l.id)).toEqual(['stage', 'task', 'knowledge'])
    expect(r?.layers[2].detail).toContain('随机')
    expect(r?.conclusion).toContain('理解情况')
    expect(toJudgmentResult(null, 'solve')).toBeNull()
    expect(toJudgmentResult({ status: 'not-judged', reason: 'x' }, 'solve')).toBeNull()
  })

  it('共享轨迹映射：每次记分一帧，source 为水果', () => {
    const trace = syntheticTrace('solve', referenceProgram(L06_LEVELS.solve), 3)
    const shared = toSharedRunTrace(trace)
    expect(shared.lessonId).toBe('G2-U3-L06')
    expect(shared.frames).toHaveLength(5)
    expect(shared.frames[0]).toMatchObject({ event: 'score', source: '水果', dx: 1 })
  })

  it('run 前置条件不满足时同步抛错（没写预测）', () => {
    const adapter = new LessonL06Adapter({ port: new FakeVmPort() })
    expect(() => adapter.run(() => {})).toThrow()
  })
})
