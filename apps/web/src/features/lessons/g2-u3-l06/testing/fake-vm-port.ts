// 测试用假 VM 端口：只用来验证会话 / 适配器的状态机与时序（谁先谁后、过期结果丢弃、停止），
// 它产生的轨迹是人工构造的“合成轨迹”，不代表真实 VM 与渲染器的运行结果；真实行为见 tests/e2e。

import type { RunTrace } from '../judge'
import { L06_LEVELS, type LevelId } from '../params'
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
  spawns?: RunTrace['spawns']
  randoms?: RunTrace['randoms']
  checks?: RunTrace['checks']
  scores?: RunTrace['scores']
  hides?: RunTrace['hides']
  endReason?: RunTrace['endReason']
  finalScore?: number
  finalTimeLeft?: number
  endedBy?: RunTrace['endedBy']
}

const SPAWN_XS = [-120, 45, 190, -30, 88]

/** 一次标准通过的合成轨迹（5 次随机出生、篮子逐个接住、第五颗时获胜结束）。 */
export function syntheticTrace(levelId: LevelId, program: Program, runId: number, over: SyntheticOptions = {}): RunTrace {
  const level = L06_LEVELS[levelId]
  const spawns = over.spawns ?? SPAWN_XS.map((x, i) => ({ frame: 1 + i * 39, x }))
  const randoms = over.randoms ?? spawns.map(s => ({ frame: s.frame, value: s.x }))
  const scores = over.scores ?? spawns.map(s => ({ frame: s.frame + 25, by: level.winTarget > 0 ? 1 : 1 }))
  const checks = over.checks ?? [
    ...spawns.flatMap(s => [{ frame: s.frame + 10, result: false }]),
    ...scores.map(s => ({ frame: s.frame, result: true })),
  ]
  const hides = over.hides ?? scores.map(s => ({ frame: s.frame }))
  const finalScore = over.finalScore ?? scores.reduce((a, s) => a + s.by, 0)
  const endReason = over.endReason ?? (finalScore >= level.winTarget ? 'win' : 'timeup')
  const lastScore = scores.length ? scores[scores.length - 1].frame : 0
  return {
    levelId,
    runId,
    fingerprint: programFingerprint(program),
    endedBy: over.endedBy ?? 'finished',
    framesRun: lastScore + 5,
    endReason,
    winFrame: endReason === 'win' ? lastScore : null,
    timeupFrame: endReason === 'timeup' ? lastScore + 5 : null,
    randoms,
    spawns,
    checks,
    scores,
    hides,
    finalScore,
    finalTimeLeft: over.finalTimeLeft ?? (endReason === 'timeup' ? 0 : 9),
    fruitVisible: false,
    basketX: 0,
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
  stageHosts = 0
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
  setStageHost(): void { this.stageHosts += 1 }
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
    p.resolve(syntheticTrace(p.levelId, p.program, p.id, {
      endedBy: 'stopped', endReason: null, scores: [], checks: [], spawns: [], randoms: [], hides: [], finalScore: 0,
    }))
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
      fruit: { x: -120, y: 170 - frame * 5, visible: true },
      score: 0,
      timeLeft: 20,
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
