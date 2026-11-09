// 测试用假 VM 端口：只用来验证会话 / 适配器的状态机与时序（谁先谁后、过期结果丢弃、停止），
// 它产生的轨迹是人工构造的“合成轨迹”，不代表真实 VM 的运行结果；真实 VM 的行为见 tests/e2e。

import type { Draw, RunTrace } from '../judge'
import { L03_LEVELS, L03_PARAMS, type LevelId } from '../params'
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
  /** 这一次依次放到的 x。缺省：本关要求范围内 10 个不同的位置。 */
  xs?: number[]
  /** 每次取随机数收到的上下界。缺省：本关要求范围。 */
  from?: number
  to?: number
  inLoop?: boolean
  endedBy?: RunTrace['endedBy']
}

/** 本关要求范围内的 10 个不同位置（合成数据，只给状态机测试用）。 */
export function defaultXs(levelId: LevelId): number[] {
  const { allowedMin, allowedMax } = L03_LEVELS[levelId]
  const n = L03_PARAMS.requiredDraws
  return Array.from({ length: n }, (_, i) => Math.round(allowedMin + ((allowedMax - allowedMin) * i) / (n - 1)))
}

export function syntheticTrace(levelId: LevelId, program: Program, runId: number, over: SyntheticOptions = {}): RunTrace {
  const level = L03_LEVELS[levelId]
  const xs = over.xs ?? defaultXs(levelId)
  const from = over.from ?? level.allowedMin
  const to = over.to ?? level.allowedMax
  const draws: Draw[] = xs.map((value, i) => ({ frame: i + 1, from, to, value, inLoop: over.inLoop ?? true }))
  return {
    levelId,
    runId,
    fingerprint: programFingerprint(program),
    endedBy: over.endedBy ?? 'finished',
    framesRun: xs.length + 1,
    seeded: level.seeded,
    draws,
    placements: xs.map((x, i) => ({ frame: i + 1, x })),
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
    p.resolve(syntheticTrace(p.levelId, p.program, p.id, { endedBy: 'stopped' }))
  }

  setReady(ready: boolean, error: string | null = null): void {
    this.ready = ready
    this.error = error
    this.handlers.ready?.()
  }

  emitFrame(frame: number, trail: number[]): void {
    const p = this.pending
    if (!p) return
    const x = trail.length > 0 ? trail[trail.length - 1] : 0
    this.handlers.frame?.({ frame, gift: { x, y: L03_PARAMS.giftY }, trail })
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
