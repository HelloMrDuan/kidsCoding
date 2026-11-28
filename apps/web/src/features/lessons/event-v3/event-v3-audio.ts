/**
 * OPS-055（G0-U3-L06《森林节奏演出》）：V3 事件舞台的真实鼓声。
 *
 * - 声音全部由 Web Audio API 现场合成（原创：正弦振荡器 150Hz→50Hz 下扫 + 指数衰减包络），
 *   不加载任何第三方音频素材，无网络请求。
 * - AudioContext 只在用户手势内创建或恢复（`unlock()`，由运行按钮的点击回调同步调用），
 *   兼容 `window.AudioContext` 与 Safari / 旧版 iOS 的 `window.webkitAudioContext`；
 *   浏览器不支持时静默降级（动作照常播放、判定不变，`supported` 为 false）。
 * - 每一下鼓声的节点都登记在 `live` 中；`stopAll()` 对全部节点 stop() + disconnect()，
 *   停止、切关、重新运行、离开页面都会调用，因此停止后不会再有声音，重复运行不叠加旧声音。
 * - `hits` / `liveNodes` 计数只用于舞台的 data 属性与测试，供真实 Chrome E2E 读取。
 */

type Param = {
  setValueAtTime(value: number, time: number): unknown
  exponentialRampToValueAtTime(value: number, time: number): unknown
}

type OscLike = {
  frequency: Param
  connect(target: unknown): unknown
  disconnect(): void
  start(when?: number): void
  stop(when?: number): void
  onended: (() => void) | null
}

type GainLike = {
  gain: Param
  connect(target: unknown): unknown
  disconnect(): void
}

export type DrumAudioContext = {
  readonly currentTime: number
  readonly state: string
  readonly destination: unknown
  createOscillator(): OscLike
  createGain(): GainLike
  resume(): Promise<unknown>
  close(): Promise<unknown>
}

export type DrumContextFactory = () => DrumAudioContext | null

/** 浏览器里的 AudioContext 构造器（含 webkit 前缀）；服务端或不支持时返回 null。 */
export const browserDrumContext: DrumContextFactory = () => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { AudioContext?: new () => DrumAudioContext; webkitAudioContext?: new () => DrumAudioContext }
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  if (!Ctor) return null
  try {
    return new Ctor()
  } catch {
    return null
  }
}

/** 一下鼓声的时长（秒）：比一拍（520ms）短，不会拖到下一拍。 */
export const DRUM_HIT_SECONDS = 0.3

type Voice = { osc: OscLike; gain: GainLike }

export class EventDrumKit {
  private readonly factory: DrumContextFactory
  private ctx: DrumAudioContext | null = null
  private readonly live = new Set<Voice>()
  private hitCount = 0
  private unsupported = false

  constructor(factory: DrumContextFactory = browserDrumContext) {
    this.factory = factory
  }

  /** 在用户手势内调用：首次创建 AudioContext，被浏览器挂起时恢复。 */
  unlock(): void {
    if (!this.ctx && !this.unsupported) {
      this.ctx = this.factory()
      if (!this.ctx) this.unsupported = true
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => undefined)
    }
  }

  get supported(): boolean {
    return !this.unsupported
  }

  /** 本次运行敲过的鼓（无声降级时也计数，保证节拍与动作同一时间轴）。 */
  get hits(): number {
    return this.hitCount
  }

  /** 仍在发声的鼓声节点数（停止后必须为 0）。 */
  get liveNodes(): number {
    return this.live.size
  }

  /** 敲一下鼓。 */
  hit(): void {
    this.hitCount += 1
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.setValueAtTime(150, now)
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.12)
    gain.gain.setValueAtTime(0.7, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + DRUM_HIT_SECONDS)
    osc.connect(gain)
    gain.connect(ctx.destination)
    const voice: Voice = { osc, gain }
    this.live.add(voice)
    osc.onended = () => this.release(voice)
    osc.start(now)
    osc.stop(now + DRUM_HIT_SECONDS)
  }

  /** 新一次运行开始：先释放上一次的全部声音，再把计数归零（重复运行不叠加旧声音）。 */
  beginRun(): void {
    this.stopAll()
    this.hitCount = 0
  }

  /** 停止并断开全部鼓声节点（停止 / 切关 / 离开页面）。计数保留到下一次运行，供舞台与测试核对。 */
  stopAll(): void {
    for (const voice of [...this.live]) {
      try {
        voice.osc.stop()
      } catch {
        // 已经停止的振荡器再次 stop 会抛错，忽略即可。
      }
      this.release(voice)
    }
  }

  /** 离开页面：释放全部节点并关闭 AudioContext。 */
  dispose(): void {
    this.stopAll()
    const ctx = this.ctx
    this.ctx = null
    if (ctx) void ctx.close().catch(() => undefined)
  }

  private release(voice: Voice): void {
    if (!this.live.delete(voice)) return
    voice.osc.onended = null
    voice.osc.disconnect()
    voice.gain.disconnect()
  }
}
