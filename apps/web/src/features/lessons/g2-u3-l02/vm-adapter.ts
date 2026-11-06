// ScratchL02Adapter：把本课沙箱（真实 Scratch VM，iframe + postMessage）包成
// WORKSPACE-API.md §2 的引擎适配器形状：mount/unmount/loadScript/getScript/run/stop/getState。
// 共享 EngineAdapter 类型在 PR #469（Draft，未合并）里，这里用结构相同的本地类型，
// 合并后可直接替换为共享类型，不需要改字段。
//
// 与 #469 的 ScratchVMAdapter 的区别（接入缺口见 PR 说明）：它连接的是受限“陨石模型”沙箱，
// 只读首个角色的 x，分数恒为 0，也没有脚本编辑器；本适配器连接本课沙箱，
// 脚本由学生搭出来并编译为 Scratch 工程，由真实 VM 逐帧执行，并带回可判定的运行轨迹。

import { compileProject } from './compile'
import type { RunTrace } from './judge'
import { L02_LEVELS, L02_PARAMS, type LevelId } from './params'
import { programFingerprint, validateProgram, type Program } from './program'

export type EngineState = { x: number; score: number; running: boolean; frames: number }
export type RunEvent = { kind: 'frame' | 'stopped' | 'finished'; state: EngineState }

export type FrameInfo = { frame: number; basket: { x: number; y: number }; fruit: { x: number; y: number } }

export const SANDBOX_URL = '/scratch-g2-u3-l02-sandbox.html'
export const READY_TIMEOUT_MS = 15000

export type SandboxAssets = { backdrop: string; basket: string; fruit: string }

export type VmStatus = { ready: boolean; error: string | null; assets: SandboxAssets | null }

/**
 * 课程会话（session.ts）依赖的虚拟机端口。生产实现是下面的 ScratchL02Adapter（iframe 里的真实 Scratch VM）；
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

export class ScratchL02Adapter implements VmPort {
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
        this.assets = data.assets as SandboxAssets
        if (this.readyTimer) clearTimeout(this.readyTimer)
        this.stopPing()
      } else {
        this.loadError = 'Scratch VM 脚本没有加载（沙箱报告 VM 不可用），请检查网络后刷新页面'
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
      this.state = { x: f.basket.x, score: 0, running: true, frames: f.frame }
      this.onFrame?.(f)
      this.onEvent?.({ kind: 'frame', state: this.state })
    } else if (data.kind === 'RUN_DONE') {
      const trace = data.trace as RunTrace
      this.activeRun = null
      const caught = !!trace.landing && Math.abs(trace.landing.basketX - trace.landing.fruitX) <= L02_PARAMS.catchTolerance
      // 分数每次运行前清零，只反映本次运行：接住记 1，其余 0，不叠加。
      this.state = { x: trace.landing?.basketX ?? this.state.x, score: trace.endedBy === 'landed' && caught ? 1 : 0, running: false, frames: trace.framesRun }
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

  /** 运行一次并返回真实 VM 产生的轨迹。每次运行舞台复位（沙箱重新载入工程）。 */
  runLevel(levelId: LevelId, program: Program, frameMs = 33): Promise<RunTrace> {
    if (!this.iframe?.contentWindow) return Promise.reject(new Error('沙箱还没有挂载'))
    if (!this.ready) return Promise.reject(new Error(this.loadError ?? 'Scratch VM 还没准备好，请稍等'))
    const level = L02_LEVELS[levelId]
    let project
    try {
      project = compileProject(program, level)
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
        { kind: 'RUN', id, levelId, level, fingerprint: programFingerprint(program), frameMs, project },
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
