// ScratchL06Adapter：把本课沙箱（真实 Scratch VM + 真实渲染器，iframe + postMessage）包成
// WORKSPACE-API.md §2 的引擎适配器形状：mount/unmount/loadScript/getScript/run/stop/getState。
//
// 与 L04 的关键区别：本课的舞台就是渲染器画的画布，孩子要看着它移动篮子接水果。
// 共享壳给 scratch 适配器的挂载点（ws-adapter-mount）在舞台框之外、没有尺寸，所以适配器先把 iframe
// 放在那里（不可见，仅保证引擎可用）；本课的舞台槽位挂载后通过 setStageHost() 把自己的舞台框交给适配器，
// 适配器随即把同一个 iframe 移进舞台框并放大到整框——画布从头到尾只有一份，引擎也只有一个。
// 脚本由学生搭出来并编译为 Scratch 工程，由真实 VM 逐帧执行：“碰到篮子？”由真实 scratch-render 判定，
// 出生点由真实 operator_random 求值，沙箱把每一次真实的随机、出生、检查、得分、隐藏如实记录，带回可判定的轨迹。
// 本模块不模拟任何积木、碰撞或随机数。

import { compileProject } from './compile'
import type { RunTrace } from './judge'
import { L06_LEVELS, type LevelId } from './params'
import { programFingerprint, validateProgram, type Program } from './program'

export type EngineState = { x: number; score: number; running: boolean; frames: number }
export type RunEvent = { kind: 'frame' | 'stopped' | 'finished'; state: EngineState }

export type FrameInfo = {
  frame: number
  basket: { x: number; y: number }
  fruit: { x: number; y: number; visible: boolean }
  /** 这一帧结束时舞台上“得分”与“时间”变量的值（来自真实 VM，不是推断）。 */
  score: number
  timeLeft: number
}

export const SANDBOX_URL = '/scratch-g2-u3-l06-sandbox.html'
export const READY_TIMEOUT_MS = 15000

export type SandboxAssets = { backdrop: string; basket: string; fruit: string }

export type VmStatus = { ready: boolean; error: string | null; assets: SandboxAssets | null }

/**
 * 课程会话（session.ts）依赖的虚拟机端口。生产实现是下面的 ScratchL06Adapter（iframe 里的真实 Scratch VM）；
 * 单元测试用假端口，只验证会话的状态机，不冒充 VM 的运行结果。
 */
export interface VmPort {
  mount(el: HTMLElement): void
  unmount(): void
  /** 舞台槽位把舞台框交给端口：沙箱 iframe 显示在这里面。传 null 表示舞台框已卸载。 */
  setStageHost(el: HTMLElement | null): void
  getStatus(): VmStatus
  subscribe(handlers: { ready?: () => void; frame?: (f: FrameInfo) => void }): void
  runLevel(levelId: LevelId, program: Program, frameMs?: number): Promise<RunTrace>
  stop(): void
  currentRunId(): number
}

const HIDDEN_STYLE = 'display:none;width:0;height:0;border:0'
const STAGE_STYLE = 'position:absolute;inset:0;width:100%;height:100%;border:0;display:block'

export class ScratchL06Adapter implements VmPort {
  private iframe: HTMLIFrameElement | null = null
  private shellEl: HTMLElement | null = null
  private stageHost: HTMLElement | null = null
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
    this.shellEl = el
    this.ensureIframe()
  }

  /** 舞台框就绪：把 iframe 移进舞台框显示；舞台框卸载（传 null）时移回壳的挂载点并隐藏。 */
  setStageHost(el: HTMLElement | null): void {
    this.stageHost = el
    this.ensureIframe()
  }

  private ensureIframe(): void {
    const host = this.stageHost ?? this.shellEl
    if (!host) return
    if (!this.iframe) {
      this.ready = false
      this.loadError = null
      const iframe = document.createElement('iframe')
      iframe.setAttribute('sandbox', 'allow-scripts')
      iframe.setAttribute('title', '水果接力挑战舞台（Scratch 渲染）')
      iframe.src = SANDBOX_URL
      this.iframe = iframe
      this.listener = (event: MessageEvent) => {
        if (!this.iframe || event.source !== this.iframe.contentWindow || event.origin !== 'null') return
        this.handle(event.data as Record<string, unknown>)
      }
      window.addEventListener('message', this.listener)
      host.appendChild(iframe)
      this.applyStyle()
      this.startPing()
      return
    }
    if (this.iframe.parentElement !== host) {
      // 移动 iframe 在个别浏览器里会让沙箱页重载：重载后它会重新应答 PING，握手自动恢复；
      // 移动发生在运行开始之前（舞台框先于第一次运行挂载），不会打断正在进行的运行。
      host.appendChild(this.iframe)
      this.applyStyle()
      this.startPing()
    } else {
      this.applyStyle()
    }
  }

  private applyStyle(): void {
    if (!this.iframe) return
    this.iframe.style.cssText = this.stageHost ? STAGE_STYLE : HIDDEN_STYLE
    this.iframe.tabIndex = this.stageHost ? 0 : -1
    if (this.stageHost) this.iframe.removeAttribute('aria-hidden')
    else this.iframe.setAttribute('aria-hidden', 'true')
  }

  private startPing(): void {
    this.stopPing()
    const ping = () => this.iframe?.contentWindow?.postMessage({ kind: 'PING' }, '*')
    ping()
    this.pingTimer = setInterval(ping, 350)
    if (this.readyTimer) clearTimeout(this.readyTimer)
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
    this.shellEl = null
    this.stageHost = null
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
        this.sendPreview()
      } else {
        this.loadError = 'Scratch VM 或渲染器脚本没有加载（沙箱报告不可用），无法判定碰撞，请检查网络后刷新页面'
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
      this.state = { x: f.basket.x, score: f.score, running: true, frames: f.frame }
      this.onFrame?.(f)
      this.onEvent?.({ kind: 'frame', state: this.state })
    } else if (data.kind === 'RUN_DONE') {
      const trace = data.trace as RunTrace
      this.activeRun = null
      // 分数就是真实 VM 里“得分”变量的最终值（沙箱回报），每次运行前清零，只反映本次运行，不叠加。
      this.state = { x: this.state.x, score: trace.finalScore, running: false, frames: trace.framesRun }
      this.onEvent?.({ kind: trace.endedBy === 'stopped' ? 'stopped' : 'finished', state: this.state })
      run.resolve(trace)
      this.sendPreview()
    } else if (data.kind === 'REJECTED' || data.kind === 'ERROR') {
      this.activeRun = null
      this.state = { ...this.state, running: false }
      run.reject(new Error(String(data.error ?? '运行失败')))
      this.sendPreview()
    }
  }

  /**
   * 让沙箱把当前关卡工程的初始场景画在舞台上（还没运行时、或运行结束后恢复场景）。
   * 场景只取决于工程本身（背景、篮子、水果的初始位置），与学生积木无关；预览失败不影响运行路径。
   */
  private sendPreview(): void {
    if (!this.ready || this.activeRun || !this.iframe?.contentWindow) return
    const level = L06_LEVELS[this.levelId]
    try {
      const project = compileProject(this.program, level)
      this.iframe.contentWindow.postMessage({
        kind: 'PREVIEW',
        fruitSpeed: level.fruitSpeed, timeLimitSeconds: level.timeLimitSeconds, winTarget: level.winTarget,
        project,
      }, '*')
    } catch {
      // 程序暂时不合法时不画预览；点运行时会正式报错给学生看。
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
    const level = L06_LEVELS[levelId]
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
        {
          kind: 'RUN', id, levelId,
          fruitSpeed: level.fruitSpeed, timeLimitSeconds: level.timeLimitSeconds, winTarget: level.winTarget,
          fingerprint: programFingerprint(program), frameMs, project,
        },
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
