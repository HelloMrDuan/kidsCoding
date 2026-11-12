// ScratchL05Adapter：把本课沙箱（真实 Scratch VM + 虚拟时钟，iframe + postMessage）包成
// WORKSPACE-API.md §2 的引擎适配器形状：mount/unmount/loadScript/getScript/run/stop/getState。
//
// 脚本由学生搭出来并编译为 Scratch 工程，由真实 VM 在虚拟时钟下逐帧执行：每一帧虚拟时间前进 1000/30 毫秒，
// “等待 1 秒”真的由 VM 的计时器判定，只是时钟是虚拟的，所以不用真等 10 秒，轨迹还逐帧可复现。
// 沙箱把每一帧的 timeLeft / score、每一次广播、每一次真实的“timeLeft < 1”求值如实记录下来，带回可判定的运行轨迹。
// 本模块不模拟任何积木、时间或得分。

import { compileProject } from './compile'
import { finalOf, type RunTrace } from './judge'
import type { LevelId } from './params'
import { programFingerprint, validateProgram, type Program } from './program'

export type EngineState = { x: number; score: number; running: boolean; frames: number }
export type RunEvent = { kind: 'frame' | 'stopped' | 'finished'; state: EngineState }

export type FrameInfo = {
  frame: number
  /** 这一帧结束时舞台上 timeLeft 的值（来自真实 VM，不是推断）。 */
  timeLeft: number
  /** 这一帧结束时舞台上 score 的值（来自真实 VM）。 */
  score: number
  /** 到这一帧为止，“游戏结束”是否已经广播过。 */
  over: boolean
}

export const SANDBOX_URL = '/scratch-g2-u3-l05-sandbox.html'
export const READY_TIMEOUT_MS = 15000

export type SandboxAssets = { backdrop: string; student: string; fruit: string }

export type VmStatus = { ready: boolean; error: string | null; assets: SandboxAssets | null }

/**
 * 课程会话（session.ts）依赖的虚拟机端口。生产实现是下面的 ScratchL05Adapter（iframe 里的真实 Scratch VM）；
 * 单元测试用假端口，只验证会话的状态机，不冒充 VM 的运行结果。
 */
export interface VmPort {
  mount(el: HTMLElement): void
  unmount(): void
  getStatus(): VmStatus
  subscribe(handlers: { ready?: () => void; frame?: (f: FrameInfo) => void }): void
  runLevel(levelId: LevelId, program: Program, frameMs?: number): Promise<RunTrace>
  stop(): void
  currentRunId(): number
}

export class ScratchL05Adapter implements VmPort {
  private iframe: HTMLIFrameElement | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private readyTimer: ReturnType<typeof setTimeout> | null = null
  private listener: ((e: MessageEvent) => void) | null = null
  private ready = false
  private loadError: string | null = null
  private assets: SandboxAssets | null = null
  private program: Program = { scripts: [] }
  private levelId: LevelId = 'solve'
  private runSeq = 0
  private activeRun: { id: number; resolve: (t: RunTrace) => void; reject: (e: Error) => void } | null = null
  private state: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  private onEvent: ((e: RunEvent) => void) | null = null
  private onFrame: ((f: FrameInfo) => void) | null = null
  private onReadyChange: (() => void) | null = null

  /** 沙箱握手情况：ready=true 才能运行；loadError 非空时界面必须如实显示。 */
  getStatus(): VmStatus {
    return { ready: this.ready, error: this.loadError, assets: this.assets }
  }

  subscribe(handlers: { ready?: () => void; frame?: (f: FrameInfo) => void }): void {
    this.onReadyChange = handlers.ready ?? null
    this.onFrame = handlers.frame ?? null
  }

  mount(el: HTMLElement): void {
    if (this.iframe) this.unmount()
    this.ready = false
    this.loadError = null
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('title', 'Scratch VM 沙箱')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.tabIndex = -1
    iframe.style.cssText = 'display:none;width:0;height:0;border:0'
    iframe.src = SANDBOX_URL
    this.iframe = iframe
    this.listener = (event: MessageEvent) => {
      if (!this.iframe || event.source !== this.iframe.contentWindow || event.origin !== 'null') return
      this.handle(event.data as Record<string, unknown>)
    }
    window.addEventListener('message', this.listener)
    el.appendChild(iframe)
    const ping = () => this.iframe?.contentWindow?.postMessage({ kind: 'PING' }, '*')
    this.pingTimer = setInterval(ping, 350)
    this.readyTimer = setTimeout(() => {
      if (!this.ready) {
        this.loadError = 'Scratch VM 没有在 15 秒内准备好（可能是网络问题），请检查网络后刷新页面'
        this.stopPing()
        this.onReadyChange?.()
      }
    }, READY_TIMEOUT_MS)
  }

  unmount(): void {
    this.stopPing()
    if (this.readyTimer) clearTimeout(this.readyTimer)
    this.readyTimer = null
    if (this.listener) window.removeEventListener('message', this.listener)
    this.listener = null
    if (this.activeRun) {
      this.activeRun.reject(new Error('已卸载'))
      this.activeRun = null
    }
    this.iframe?.remove()
    this.iframe = null
    this.ready = false
  }

  private stopPing(): void {
    if (this.pingTimer) clearInterval(this.pingTimer)
    this.pingTimer = null
  }

  private handle(data: Record<string, unknown>): void {
    if (!data || typeof data.kind !== 'string') return
    if (data.kind === 'FRAME_READY') {
      if (data.available === true) {
        this.ready = true
        this.loadError = null
        this.assets = (data.assets as SandboxAssets | undefined) ?? null
        if (this.readyTimer) clearTimeout(this.readyTimer)
        this.stopPing()
      } else {
        this.loadError = 'Scratch VM 脚本没有加载（沙箱报告不可用），无法运行倒计时，请检查网络后刷新页面'
        this.stopPing()
      }
      this.onReadyChange?.()
      return
    }
    // 其余消息都带运行编号：不是当前这一次运行的一律丢弃，旧运行不能影响新状态。
    const run = this.activeRun
    if (!run || data.id !== run.id) return
    if (data.kind === 'FRAME') {
      const f = data as unknown as FrameInfo
      this.state = { x: 0, score: f.score, running: true, frames: f.frame }
      this.onFrame?.(f)
      this.onEvent?.({ kind: 'frame', state: this.state })
    } else if (data.kind === 'RUN_DONE') {
      const trace = data.trace as RunTrace
      this.activeRun = null
      // 分数就是真实 VM 里 score 变量的最终值（沙箱回报），每次运行前清零，只反映本次运行，不叠加。
      const last = finalOf(trace)
      this.state = { x: 0, score: last?.score ?? 0, running: false, frames: trace.frames.length }
      this.onEvent?.({ kind: trace.endedBy === 'stopped' ? 'stopped' : 'finished', state: this.state })
      run.resolve(trace)
    } else if (data.kind === 'REJECTED' || data.kind === 'ERROR') {
      this.activeRun = null
      this.state = { ...this.state, running: false }
      run.reject(new Error(String(data.error ?? '运行失败')))
    }
  }

  // ---- EngineAdapter 形状 -------------------------------------------------

  loadScript(script: unknown): void {
    const problems = validateProgram(script)
    if (problems.length > 0) throw new Error(`脚本不合法：${problems.join('；')}`)
    this.program = script as Program
  }

  getScript(): Program {
    return this.program
  }

  setLevel(levelId: LevelId): void {
    this.levelId = levelId
  }

  getState(): EngineState {
    return this.state
  }

  /** EngineAdapter.run：在事件回调里报告帧与结束；需要判定用的轨迹请用 runLevel。 */
  run(onEvent: (e: RunEvent) => void): void {
    this.onEvent = onEvent
    void this.runLevel(this.levelId, this.program).catch(() => {
      // 错误由 runLevel 的调用方处理；这里的无人等待调用不让它变成未处理的拒绝。
    })
  }

  /** 运行一次并返回真实 VM（虚拟时钟）产生的轨迹。每次运行舞台复位（沙箱重新载入工程、虚拟时钟归零）。 */
  runLevel(levelId: LevelId, program: Program, frameMs = 16): Promise<RunTrace> {
    if (!this.iframe?.contentWindow) return Promise.reject(new Error('沙箱还没有挂载'))
    if (!this.ready) return Promise.reject(new Error(this.loadError ?? 'Scratch VM 还没准备好，请稍等'))
    let project
    try {
      project = compileProject(program)
    } catch (error) {
      return Promise.reject(error instanceof Error ? error : new Error(String(error)))
    }
    // 新的一次运行直接取代没结束的旧运行：旧运行的消息因编号不同会被丢弃。
    if (this.activeRun) {
      const old = this.activeRun
      this.activeRun = null
      this.iframe.contentWindow.postMessage({ kind: 'STOP', id: old.id }, '*')
      old.reject(new Error('被新的运行取代'))
    }
    const id = ++this.runSeq
    this.state = { x: 0, score: 0, running: true, frames: 0 }
    return new Promise<RunTrace>((resolve, reject) => {
      this.activeRun = { id, resolve, reject }
      this.iframe?.contentWindow?.postMessage(
        { kind: 'RUN', id, levelId, fingerprint: programFingerprint(program), frameMs, project },
        '*',
      )
    })
  }

  /** 停止：沙箱取消待完成的判定，脚本与已得状态保留；被停止的运行返回 endedBy='stopped' 的轨迹。 */
  stop(): void {
    const run = this.activeRun
    if (!run) return
    this.iframe?.contentWindow?.postMessage({ kind: 'STOP', id: run.id }, '*')
  }

  /** 当前这一次运行的编号（界面用来对账：只有编号一致的结果才有效）。 */
  currentRunId(): number {
    return this.runSeq
  }
}
