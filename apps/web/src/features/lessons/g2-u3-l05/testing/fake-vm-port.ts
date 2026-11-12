// 测试用假 VM 端口：只用来验证会话 / 适配器的状态机与时序（谁先谁后、过期结果丢弃、停止），
// 它产生的轨迹是人工构造的“合成轨迹”，不代表真实 VM 的运行结果；真实行为见 tests/e2e 与 judge.vm.test.ts。

import type { Frame, RunTrace } from '../judge'
import { L05_LEVELS, type LevelId } from '../params'
import { programFingerprint, type Program } from '../program'
import type { FrameInfo, VmPort, VmStatus } from '../vm-adapter'

type Pending = {
  id: number
  levelId: LevelId
  program: Program
  resolve: (t: RunTrace) => void
  reject: (e: Error) => void
}

export type SyntheticOptions = {
  /** 广播发生的帧（每项一次）。缺省：归零后 1 帧广播一次。传空数组表示从不广播。 */
  broadcasts?: number[]
  /** “timeLeft < 1”的真实求值记录。缺省：广播前一帧有一次为真的检查，此前有若干为假的检查。 */
  checks?: RunTrace['checks']
  /** 最后一帧的 timeLeft。缺省 0；传负数模拟没有判断数过头。 */
  finalTime?: number
  /** 最后一帧的 score。缺省：倒计时期间每半秒 1 分的近似值（只满足“大于 0 且广播后不变”）。 */
  finalScore?: number
  endedBy?: RunTrace['endedBy']
}

/**
 * 一次标准通过的合成轨迹：从本关起点每 31 帧减 1（真实 VM 里每次“等待 1 秒”约 31 帧），
 * 归零后广播一次，之后多看 90 帧得分不变。帧数形状与真实轨迹同口径，但数值是构造的。
 */
export function syntheticTrace(levelId: LevelId, program: Program, runId: number, over: SyntheticOptions = {}): RunTrace {
  const start = L05_LEVELS[levelId].startSeconds
  const finalTime = over.finalTime ?? 0
  // 数到 finalTime 的那一帧：每减 1 约 31 帧。finalTime 为负（没有判断数过头）时，广播在这之后才发生。
  const zeroFrame = 31 * (start - finalTime) + 1
  const broadcasts = over.broadcasts ?? [zeroFrame + 1]
  const firstBroadcast = broadcasts[0]
  const totalFrames = (firstBroadcast ?? zeroFrame) + 90
  const finalScore = over.finalScore ?? Math.max(1, 2 * start - 1)
  const frames: Frame[] = []
  for (let f = 1; f <= totalFrames; f++) {
    const timeLeft = Math.max(finalTime, start - Math.floor((f - 1) / 31))
    const scoreAt = firstBroadcast !== undefined && f > firstBroadcast ? finalScore : Math.min(finalScore, Math.floor(f / 16))
    frames.push({ frame: f, timeLeft, score: scoreAt })
  }
  const checks = over.checks ?? [
    ...Array.from({ length: start }, (_, i) => ({ frame: 31 * i + 1, value: start - i, result: false })),
    { frame: zeroFrame, value: 0, result: true },
  ]
  return {
    levelId,
    runId,
    fingerprint: programFingerprint(program),
    endedBy: over.endedBy ?? 'finished',
    frames,
    broadcasts,
    checks,
  }
}

export class FakeVmPort implements VmPort {
  ready = true
  error: string | null = null
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
  getStatus(): VmStatus { return { ready: this.ready, error: this.error, assets: null } }
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
    p.resolve(syntheticTrace(p.levelId, p.program, p.id, { endedBy: 'stopped', broadcasts: [], checks: [] }))
  }

  setReady(ready: boolean, error: string | null = null): void {
    this.ready = ready
    this.error = error
    this.handlers.ready?.()
  }

  emitFrame(frame: number, info: Partial<Omit<FrameInfo, 'frame'>> = {}): void {
    if (!this.pending) return
    this.handlers.frame?.({ frame, timeLeft: 10, score: 0, over: false, ...info })
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
