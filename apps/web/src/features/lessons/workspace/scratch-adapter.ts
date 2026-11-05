/**
 * ScratchVMAdapter — EngineAdapter over the existing sandbox iframe protocol
 * (WORKSPACE-API.md §2), reusing `public/scratch-vm-sandbox.html`.
 *
 * Protocol facts (verified against main 754f7f43):
 * - The parent polls `{kind:'PING'}`; the sandbox answers `FRAME_READY`
 *   with `available` telling whether the Scratch VM script actually loaded.
 * - LOAD requires an integer id + an ArrayBuffer archive and sets the
 *   sandbox's current id; RUN / STOP / EXPORT / SAVE_DRAFT require
 *   `data.id === currentId`. Messages with a stale id are dropped, following
 *   the existing labs' `msg.id` pattern.
 * - The sandbox snapshots VM targets every 100ms (`SNAPSHOT` with x/y per target).
 * - RUN only calls `vm.greenFlag()` — it does NOT reset the stage. Reset is
 *   therefore implemented here by reloading the last loaded project before
 *   greenFlag, waiting for PROJECT_LOADED; if that wait times out, run()
 *   throws and reports the gap instead of faking a reset.
 *
 * HONEST LIMITS (do not hide these):
 * - This sandbox is a RESTRICTED meteor-model sandbox: LOAD only accepts
 *   projects structurally identical to its lesson sample (same opcodes and
 *   wiring). A generic .sb3 is rejected fail-closed and the last working
 *   project is kept. A general Scratch project host is NOT what this adapter
 *   provides; that is a chief-level scope decision.
 * - The sandbox carries no score: getState() reports score 0 unless a snapshot
 *   carries one (it does not). No score is ever invented.
 * - getScript() is synchronous per the interface, so it can only return the
 *   last exported bytes cached by exportProject(); it returns null before any
 *   export. Use exportProject() for a fresh export.
 * - Scratch VM itself loads from the jsDelivr CDN inside the sandbox page;
 *   offline classrooms get an honest engine-load failure, never a fake ready.
 */

import type { EngineAdapter, EngineState, RunEvent } from './workspace-adapters'
import type { FileCapabilities } from './workspace-slots'

export const SCRATCH_READY_TIMEOUT_MS = 15000
export const SCRATCH_PROJECT_TIMEOUT_MS = 15000

export type ScratchSnapshotTarget = {
  id?: string
  name?: string
  x?: number
  y?: number
  visible?: boolean
}

/** Pure mapping: sandbox SNAPSHOT payload -> EngineState. Score is never invented. */
export function mapSnapshotToState(payload: {
  targets?: ScratchSnapshotTarget[]
  score?: number
}): EngineState {
  const first = Array.isArray(payload.targets) ? payload.targets[0] : undefined
  const x = first && typeof first.x === 'number' && Number.isFinite(first.x) ? first.x : 0
  const score = typeof payload.score === 'number' && Number.isFinite(payload.score) ? payload.score : 0
  return { x, score, running: false, frames: 0 }
}

/** Pure freshness check following the labs' msg.id pattern: stale ids are dropped. */
export function isFreshScratchMessage(msgId: unknown, currentId: number | null): boolean {
  return typeof msgId === 'number' && currentId !== null && msgId === currentId
}

type Waiter = {
  kind: string
  resolve: (payload: Record<string, unknown>) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}

export class ScratchVMAdapter implements EngineAdapter {
  private iframe: HTMLIFrameElement | null = null
  private mountEl: HTMLElement | null = null
  private currentId: number | null = null
  private nextId = 1
  private ready = false
  private loadError: string | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private readyTimer: ReturnType<typeof setTimeout> | null = null
  private lastState: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  private running = false
  private lastRunError: string | null = null
  private lastArchive: ArrayBuffer | null = null
  private lastExport: ArrayBuffer | null = null
  private onEvent: ((e: RunEvent) => void) | null = null
  private waiters: Waiter[] = []
  private onMessage: ((event: MessageEvent) => void) | null = null

  /**
   * File operations the adapter actually supports (round 4 fix 3).
   * Scratch has no blank-project 新建 and no 初始恢复: both used to
   * render as buttons that only showed a notice. They are now hidden
   * by capability instead of rendered as empty shells. 保存 / 导出 /
   * 导入 stay shown: save writes the real draft, export attempts a
   * real VM export (honest failure when not ready), import runs the
   * real sandbox verdict path.
   */
  getFileCapabilities(): FileCapabilities {
    return { canNew: false, canReset: false }
  }

  /** Engine-load failure message, or null when the sandbox handshake succeeded. */
  getLoadError(): string | null {
    return this.loadError
  }

  /** Whether the FRAME_READY handshake completed with the VM available. */
  isReady(): boolean {
    return this.ready
  }

  /**
   * Last async run failure (e.g. reset reload timeout). run() cannot throw
   * asynchronously, so a failed reset reload is reported through the 'stopped'
   * event plus this accessor; the shell surfaces it as a run error.
   */
  getLastRunError(): string | null {
    return this.lastRunError
  }

  mount(el: HTMLElement) {
    if (this.iframe) this.unmount()
    this.mountEl = el
    this.currentId = null
    this.ready = false
    this.loadError = null
    this.onMessage = (event: MessageEvent) => {
      if (!this.iframe || event.source !== this.iframe.contentWindow) return
      const data = event.data as { kind?: string; id?: unknown } & Record<string, unknown>
      if (!data || typeof data.kind !== 'string') return
      if (data.kind === 'FRAME_READY') {
        if (data.available === true) {
          this.ready = true
          this.loadError = null
          this.stopPing()
        } else {
          this.loadError = 'Scratch VM 脚本未能加载（沙箱报告 VM 不可用），请检查网络后重试'
          this.stopPing()
        }
        return
      }
      // Expired message ids are dropped (labs' msg.id pattern).
      if (!isFreshScratchMessage(data.id, this.currentId)) return
      if (data.kind === 'SNAPSHOT') {
        const mapped = mapSnapshotToState(data as { targets?: ScratchSnapshotTarget[]; score?: number })
        this.lastState = { ...mapped, running: this.running, frames: this.lastState.frames }
        return
      }
      if (data.kind === 'STARTED') {
        this.running = true
        return
      }
      if (data.kind === 'STOPPED') {
        this.running = false
        this.onEvent?.({ kind: 'stopped', state: this.getState() })
        return
      }
      if (data.kind === 'ERROR') {
        const message = typeof data.error === 'string' ? data.error : 'Scratch 沙箱报告错误'
        this.failWaiters(message)
        if (this.running) {
          this.running = false
          this.onEvent?.({ kind: 'stopped', state: this.getState() })
        }
        return
      }
      this.resolveWaiter(data.kind, data)
    }
    window.addEventListener('message', this.onMessage)
    const iframe = document.createElement('iframe')
    iframe.src = '/scratch-vm-sandbox.html'
    iframe.setAttribute('sandbox', 'allow-scripts')
    iframe.setAttribute('title', 'Scratch VM 沙箱（演示）')
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = '0'
    el.appendChild(iframe)
    this.iframe = iframe
    // Poll PING until FRAME_READY, exactly like the existing trial lab.
    this.pingTimer = setInterval(() => {
      try {
        this.iframe?.contentWindow?.postMessage({ kind: 'PING' }, '*')
      } catch {
        // Iframe gone; the ready timeout below reports the failure.
      }
    }, 350)
    this.readyTimer = setTimeout(() => {
      if (!this.ready && !this.loadError) {
        this.loadError = 'Scratch 引擎加载超时：沙箱未在规定时间内就绪（可能为 CDN 不可达），未伪装为已就绪'
        this.stopPing()
      }
    }, SCRATCH_READY_TIMEOUT_MS)
  }

  unmount() {
    try {
      if (this.iframe?.contentWindow && this.currentId !== null) {
        this.iframe.contentWindow.postMessage({ kind: 'STOP', id: this.currentId }, '*')
      }
    } catch {
      // Iframe already gone; nothing to stop.
    }
    this.stopPing()
    this.failWaiters('适配器已卸载')
    if (this.onMessage) {
      window.removeEventListener('message', this.onMessage)
      this.onMessage = null
    }
    if (this.iframe && this.mountEl) {
      try {
        this.mountEl.removeChild(this.iframe)
      } catch {
        // Already removed.
      }
    }
    this.iframe = null
    this.mountEl = null
    this.running = false
    this.onEvent = null
  }

  loadScript(script: unknown) {
    const archive =
      script instanceof ArrayBuffer
        ? script
        : (script as { sb3?: unknown } | null)?.sb3 instanceof ArrayBuffer
          ? (script as { sb3: ArrayBuffer }).sb3
          : null
    if (!archive) {
      throw new Error('Scratch 脚本无效：需要 { sb3: ArrayBuffer }')
    }
    if (archive.byteLength < 300 || archive.byteLength > 5_000_000) {
      throw new Error('Scratch 工程大小不符合要求（需 300B～5MB）')
    }
    const head = new Uint8Array(archive, 0, 2)
    if (head[0] !== 0x50 || head[1] !== 0x4b) {
      throw new Error('Scratch 工程不是 ZIP 格式（缺少 PK 头）')
    }
    // LOAD is async and validated inside the sandbox; fire-and-forget here is
    // deliberate: the sandbox answers PROJECT_LOADED or ERROR, and run()
    // waits for PROJECT_LOADED before greenFlag. A rejected project leaves
    // the last working project untouched (sandbox guarantee).
    this.lastArchive = archive.slice(0)
    this.postLoad(this.lastArchive, false)
  }

  getScript(): ArrayBuffer | null {
    return this.lastExport ? this.lastExport.slice(0) : null
  }

  /**
   * Import a .sb3 archive and wait for the sandbox verdict. Resolves only on
   * PROJECT_LOADED; a sandbox rejection (e.g. a non-meteor-structured project)
   * rejects with the sandbox message and leaves the last working project intact.
   */
  importProject(archive: ArrayBuffer): Promise<void> {
    if (!this.iframe?.contentWindow) {
      return Promise.reject(new Error('Scratch 沙箱未挂载'))
    }
    if (archive.byteLength < 300 || archive.byteLength > 5_000_000) {
      return Promise.reject(new Error('Scratch 工程大小不符合要求（需 300B～5MB）'))
    }
    const head = new Uint8Array(archive, 0, 2)
    if (head[0] !== 0x50 || head[1] !== 0x4b) {
      return Promise.reject(new Error('Scratch 工程不是 ZIP 格式（缺少 PK 头）'))
    }
    this.lastArchive = archive.slice(0)
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        kind: 'PROJECT_LOADED',
        resolve: () => resolve(),
        reject,
        timer: setTimeout(() => {
          this.removeWaiter(waiter)
          reject(new Error('Scratch 导入超时：沙箱未确认工程加载'))
        }, SCRATCH_PROJECT_TIMEOUT_MS),
      }
      this.waiters.push(waiter)
      this.postLoad(archive, true)
    })
  }

  /** Fresh .sb3 export from the real VM (with its reload check inside the sandbox). */
  exportProject(): Promise<ArrayBuffer> {
    if (!this.ready) {
      return Promise.reject(new Error(this.loadError ?? 'Scratch 引擎尚未就绪，无法导出'))
    }
    if (this.currentId === null || !this.iframe?.contentWindow) {
      return Promise.reject(new Error('Scratch 沙箱未挂载'))
    }
    return new Promise<ArrayBuffer>((resolve, reject) => {
      const waiter: Waiter = {
        kind: 'PROJECT_EXPORTED',
        resolve: (payload) => {
          const archive = payload.archive as ArrayBuffer | undefined
          if (archive instanceof ArrayBuffer) {
            this.lastExport = archive.slice(0)
            resolve(archive)
          } else {
            reject(new Error('Scratch 导出未返回工程字节'))
          }
        },
        reject,
        timer: setTimeout(() => {
          this.removeWaiter(waiter)
          reject(new Error('Scratch 导出超时'))
        }, SCRATCH_PROJECT_TIMEOUT_MS),
      }
      this.waiters.push(waiter)
      this.iframe?.contentWindow?.postMessage({ kind: 'EXPORT', id: this.currentId }, '*')
    })
  }

  run(onEvent: (e: RunEvent) => void) {
    if (!this.ready) {
      throw new Error(this.loadError ?? 'Scratch 引擎尚未就绪，无法运行')
    }
    if (this.currentId === null || !this.iframe?.contentWindow) {
      throw new Error('Scratch 沙箱未挂载')
    }
    this.onEvent = onEvent
    // Reset-before-run: the sandbox RUN does not itself reset the stage, so
    // reload the last loaded project and wait for PROJECT_LOADED first. If
    // there is no loaded project, or the reload wait times out, report the
    // gap instead of faking a reset.
    const reload = this.lastArchive
      ? this.postLoadAndWait(this.lastArchive)
      : Promise.reject(new Error('Scratch 演示尚未加载工程：请先导入一个 .sb3 工程再运行'))
    reload.then(
      () => {
        if (!this.iframe?.contentWindow || this.currentId === null) return
        this.lastRunError = null
        this.running = true
        this.iframe.contentWindow.postMessage({ kind: 'RUN', id: this.currentId }, '*')
        // The sandbox has no run-finished event for greenFlag programs; the
        // shell reports the live SNAPSHOT state, and stop() ends the run.
        // A finished event is therefore NOT fabricated here.
      },
      (error: unknown) => {
        this.running = false
        this.lastRunError =
          error instanceof Error ? error.message : 'Scratch 运行前复位失败：未能重新加载工程'
        this.onEvent?.({ kind: 'stopped', state: this.getState() })
      },
    )
  }

  stop() {
    if (!this.running) return
    if (this.iframe?.contentWindow && this.currentId !== null) {
      this.iframe.contentWindow.postMessage({ kind: 'STOP', id: this.currentId }, '*')
    }
    // The sandbox answers STOPPED; if it never does, the state below is the
    // honest local view (script kept, last snapshot kept).
    this.running = false
    this.onEvent?.({ kind: 'stopped', state: this.getState() })
  }

  getState(): EngineState {
    return { ...this.lastState, running: this.running }
  }

  private postLoad(archive: ArrayBuffer, imported: boolean) {
    const id = this.nextId
    this.nextId += 1
    this.currentId = id
    // Transfer one copy; the sandbox takes ownership of the posted buffer.
    const copy = archive.slice(0)
    this.iframe?.contentWindow?.postMessage(
      { kind: 'LOAD', id, archive: copy, imported, source: 'file' },
      '*',
      [copy],
    )
  }

  private postLoadAndWait(archive: ArrayBuffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const waiter: Waiter = {
        kind: 'PROJECT_LOADED',
        resolve: () => resolve(),
        reject,
        timer: setTimeout(() => {
          this.removeWaiter(waiter)
          reject(new Error('Scratch 运行前复位超时：工程未能重新加载，未伪装复位成功'))
        }, SCRATCH_PROJECT_TIMEOUT_MS),
      }
      this.waiters.push(waiter)
      this.postLoad(archive, false)
    })
  }

  private resolveWaiter(kind: string, payload: Record<string, unknown>) {
    const index = this.waiters.findIndex((w) => w.kind === kind)
    if (index < 0) return
    const [waiter] = this.waiters.splice(index, 1)
    clearTimeout(waiter.timer)
    waiter.resolve(payload)
  }

  private removeWaiter(waiter: Waiter) {
    const index = this.waiters.indexOf(waiter)
    if (index >= 0) this.waiters.splice(index, 1)
  }

  private failWaiters(message: string) {
    const pending = this.waiters.splice(0)
    for (const waiter of pending) {
      clearTimeout(waiter.timer)
      waiter.reject(new Error(message))
    }
  }

  private stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
    if (this.readyTimer) {
      clearTimeout(this.readyTimer)
      this.readyTimer = null
    }
  }
}
