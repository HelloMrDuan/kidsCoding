// 测试用假 VM 端口：只用来验证会话 / 适配器的状态机与时序（谁先谁后、过期结果丢弃、停止），
// 它产生的轨迹是人工构造的“合成轨迹”，不代表真实 VM 的运行结果；真实 VM 的行为见 tests/e2e。

import type { BasketMove, RunTrace } from '../judge'
import { framesToLand, L02_LEVELS, L02_PARAMS, type LevelId } from '../params'
import { programFingerprint, type Program } from '../program'
import type { FrameInfo, SandboxAssets, VmPort, VmStatus } from '../vm-adapter'

type Pending = {
  id: number
  levelId: LevelId
  program: Program
  resolve: (t: RunTrace) => void
  reject: (e: Error) => void
}

export function syntheticTrace(
  levelId: LevelId,
  program: Program,
  runId: number,
  over: { basketX?: number; moves?: BasketMove[]; endedBy?: RunTrace['endedBy'] } = {},
): RunTrace {
  const level = L02_LEVELS[levelId]
  const frame = framesToLand(level)
  const endedBy = over.endedBy ?? 'landed'
  const basketX = over.basketX ?? L02_PARAMS.basketStartX
  return {
    levelId,
    runId,
    fingerprint: programFingerprint(program),
    endedBy,
    framesRun: frame,
    start: { basketX: L02_PARAMS.basketStartX, fruitX: level.fruitX },
    landing: endedBy === 'landed' ? { frame, basketX, fruitX: level.fruitX, fruitY: L02_PARAMS.basketY - 10 } : null,
    basketMoves: over.moves ?? [],
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

  emitFrame(frame: number, basketX: number): void {
    const p = this.pending
    if (!p) return
    this.handlers.frame?.({
      frame,
      basket: { x: basketX, y: L02_PARAMS.basketY },
      fruit: { x: L02_LEVELS[p.levelId].fruitX, y: L02_PARAMS.fruitStartY - frame * L02_LEVELS[p.levelId].fallSpeed },
    })
  }

  /** 用给定的移动记录结束当前运行（落地）。 */
  land(basketX: number, moves: BasketMove[]): void {
    const p = this.pending
    if (!p) throw new Error('没有正在进行的运行')
    this.pending = null
    p.resolve(syntheticTrace(p.levelId, p.program, p.id, { basketX, moves }))
  }

  fail(message: string): void {
    const p = this.pending
    if (!p) throw new Error('没有正在进行的运行')
    this.pending = null
    p.reject(new Error(message))
  }
}

export const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0))
