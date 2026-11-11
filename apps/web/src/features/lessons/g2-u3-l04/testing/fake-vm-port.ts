// 测试用假 VM 端口：只用来验证会话 / 适配器的状态机与时序（谁先谁后、过期结果丢弃、停止），
// 它产生的轨迹是人工构造的“合成轨迹”，不代表真实 VM 与渲染器的运行结果；真实行为见 tests/e2e。

import type { BallName, RunTrace } from '../judge'
import { L04_LEVELS, type LevelId } from '../params'
import { programFingerprint, type Program } from '../program'
import type { FrameInfo, SandboxAssets, VmPort, VmStatus } from '../vm-adapter'

type Pending = {
  id: number
  levelId: LevelId
  program: Program
  resolve: (t: RunTrace) => void
  reject: (e: Error) => void
}

export type SyntheticOptions = {
  /** 每次加分：哪个球、加多少、哪一帧。缺省：红球在第 21 帧加本关分数，一次。 */
  scores?: Array<{ ball: BallName; by: number; frame: number }>
  /** 每次检查。缺省：由 scores 推出——每次加分的同一帧有一次 true 检查，另外两个球各有一次 false 检查。 */
  checks?: RunTrace['checks']
  hides?: RunTrace['hides']
  finalScore?: number
  endedBy?: RunTrace['endedBy']
}

/** 一次标准通过的合成轨迹（红球在第 21 帧碰到篮子、加本关分数并隐藏；蓝球检查全是 false）。 */
export function syntheticTrace(levelId: LevelId, program: Program, runId: number, over: SyntheticOptions = {}): RunTrace {
  const level = L04_LEVELS[levelId]
  const scores = over.scores ?? [{ ball: '红球' as BallName, by: level.points, frame: 21 }]
  const checks = over.checks ?? [
    { frame: 1, ball: '蓝球' as BallName, result: false },
    { frame: 1, ball: '红球' as BallName, result: false },
    ...scores.map(s => ({ frame: s.frame, ball: s.ball, result: true })),
  ]
  const hides = over.hides ?? scores.map(s => ({ frame: s.frame, ball: s.ball }))
  const finalScore = over.finalScore ?? scores.reduce((a, s) => a + s.by, 0)
  return {
    levelId,
    runId,
    fingerprint: programFingerprint(program),
    endedBy: over.endedBy ?? 'finished',
    framesRun: 32,
    checks,
    scores,
    hides,
    finalScore,
    visible: { 红球: !hides.some(h => h.ball === '红球'), 蓝球: !hides.some(h => h.ball === '蓝球') },
  }
}

export class FakeVmPort implements VmPort {
  ready = true
  error: string | null = null
  assets: SandboxAssets | null = null
  runSeq = 0
  stops = 0
  mounts = 0
  unmounts = 0
  runs: Array<{ levelId: LevelId; program: Program }> = []
  pending: Pending | null = null
  private handlers: { ready?: () => void; frame?: (f: FrameInfo) => void } = {}

  mount(): void { this.mounts += 1 }
  unmount(): void {
    this.unmounts += 1
    if (this.pending) {
      this.pending.reject(new Error('已卸载'))
      this.pending = null
    }
  }
  getStatus(): VmStatus { return { ready: this.ready, error: this.error, assets: this.assets } }
  subscribe(h: { ready?: () => void; frame?: (f: FrameInfo) => void }): void { this.handlers = h }
  currentRunId(): number { return this.runSeq }

  runLevel(levelId: LevelId, program: Program): Promise<RunTrace> {
    if (this.pending) {
      this.pending.reject(new Error('被新的运行取代'))
      this.pending = null
    }
    const id = ++this.runSeq
    this.runs.push({ levelId, program })
    return new Promise<RunTrace>((resolve, reject) => {
      this.pending = { id, levelId, program, resolve, reject }
    })
  }

  stop(): void {
    this.stops += 1
    const p = this.pending
    if (!p) return
    this.pending = null
    p.resolve(syntheticTrace(p.levelId, p.program, p.id, { endedBy: 'stopped', scores: [], checks: [], hides: [], finalScore: 0 }))
  }

  setReady(ready: boolean, error: string | null = null): void {
    this.ready = ready
    this.error = error
    this.handlers.ready?.()
  }

  emitFrame(frame: number, info: Partial<Omit<FrameInfo, 'frame'>> = {}): void {
    if (!this.pending) return
    this.handlers.frame?.({
      frame,
      basket: { x: 0, y: -90 },
      hitBall: { x: 0, y: 150 - frame * 10, visible: true },
      groundBall: { x: -150, y: 150 - frame * 10, visible: true },
      score: 0,
      ...info,
    })
  }

  /** 用给定的合成轨迹选项结束当前运行（自然跑完）。 */
  finish(over: SyntheticOptions = {}): void {
    const p = this.pending
    if (!p) throw new Error('没有正在进行的运行')
    this.pending = null
    p.resolve(syntheticTrace(p.levelId, p.program, p.id, over))
  }

  fail(message: string): void {
    const p = this.pending
    if (!p) throw new Error('没有正在进行的运行')
    this.pending = null
    p.reject(new Error(message))
  }
}

export const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))
