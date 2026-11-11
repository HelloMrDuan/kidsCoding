// L05Session：本课的全部课堂状态与动作（纯 TypeScript，不含 React）。
//
// 为什么单独成层：共享 LessonWorkspace 的 EngineAdapter、编辑槽位、舞台槽位、角色槽位四个入口
// 都要读写同一份“当前关卡 / 各关脚本 / 预测 / 运行结果 / 舞台数值”。它们都通过这一个会话对象，
// 不各存一份，也就没有第二份脚本、第二个草稿。会话通过 VmPort 与真实 Scratch VM 对话，
// 单元测试用假端口验证状态机；真实 VM 的行为由 E2E 验证。

import { L05_CONTENT } from './contract'
import { isTraceCurrent, judgeRun, type RunJudgment, type RunTrace } from './judge'
import { L05_LEVELS, L05_LESSON_ID, type LevelId } from './params'
import { programFingerprint, validateProgram, type Program } from './program'
import { startDisplay, type StageDisplay } from './stage-state'
import {
  editProgram, fromDraft, initialState, isLevelPassed, loadDraft, programFor, recordRun, toDraft,
  type DraftScript, type LessonState, type StorageLike,
} from './state'
import type { FrameInfo, VmPort, VmStatus } from './vm-adapter'

export type Role = 'student' | 'fruit' | 'backdrop'

export type SessionSnapshot = {
  state: LessonState
  role: Role
  running: boolean
  trace: RunTrace | null
  notice: string | null
  display: StageDisplay
  engine: VmStatus
  hints: Record<LevelId, number>
  /** 递增时编辑器整体重载脚本（切关、导入、恢复初始）。 */
  editorKey: number
  paletteOpen: boolean
  /** 端口当前的运行序号：判定只对序号一致的轨迹生效。 */
  runId: number
}

export type SessionView = {
  levelId: LevelId
  level: (typeof L05_LEVELS)[LevelId]
  content: (typeof L05_CONTENT)[LevelId]
  program: Program
  fingerprint: string
  problems: string[]
  canRun: boolean
  predictionTime: string
  predictionAfter: string
  predictionReady: boolean
  runDisabled: boolean
  runReason: string
  judgment: RunJudgment | null
  passed: boolean
}

export type RunOutcome =
  | { kind: 'busy' | 'blocked' | 'discarded' }
  | { kind: 'error'; message: string }
  | { kind: 'stopped' | 'finished'; trace: RunTrace }

/** 课堂运行的帧间隔（真实时间）：虚拟时钟每帧走 1000/30 毫秒虚拟时间，16 毫秒一帧时 10 秒倒计时约 5 秒看完。 */
export const STAGE_FRAME_MS = 16
export const IMPORT_MAX_BYTES = 64 * 1024

export const PREDICTION_REQUIRED_REASON = '先在“任务”里写下你的预测，再运行'
export const ENGINE_NOT_READY_REASON = 'Scratch VM 还没准备好，请稍等几秒再试'

const NO_HINTS: Record<LevelId, number> = { explore: 0, solve: 0, transferShort: 0 }

export function deriveView(s: SessionSnapshot): SessionView {
  const levelId = s.state.levelId
  const level = L05_LEVELS[levelId]
  const content = L05_CONTENT[levelId]
  const program = programFor(s.state, levelId)
  const fingerprint = programFingerprint(program)
  const problems = validateProgram(program)
  const current = isTraceCurrent(s.trace, { fingerprint, levelId, runId: s.runId })
  const judgment = s.trace && current ? judgeRun(s.trace, level) : null
  const pred = s.state.predictions.explore
  const predictionTime = pred?.time ?? ''
  const predictionAfter = pred?.after ?? ''
  const canRun = problems.length === 0
  const predictionReady = levelId !== 'explore' || (predictionTime.trim() !== '' && predictionAfter !== '')
  const runDisabled = !s.running && (!canRun || !predictionReady)
  const runReason = !canRun ? problems[0] : !predictionReady ? PREDICTION_REQUIRED_REASON : ''
  return {
    levelId, level, content, program, fingerprint, problems, canRun, predictionTime, predictionAfter, predictionReady,
    runDisabled, runReason, judgment, passed: isLevelPassed(s.state, levelId),
  }
}

export class L05Session {
  private snap: SessionSnapshot
  private cachedView: { snap: SessionSnapshot; view: SessionView } | null = null
  private readonly listeners = new Set<() => void>()
  private frameTap: ((f: FrameInfo) => void) | null = null
  private runToken = 0
  private slotMounts = 0

  constructor(private readonly port: VmPort) {
    this.snap = {
      state: initialState(),
      role: 'student',
      running: false,
      trace: null,
      notice: null,
      display: startDisplay('explore'),
      engine: port.getStatus(),
      hints: { ...NO_HINTS },
      editorKey: 0,
      paletteOpen: false,
      runId: port.currentRunId(),
    }
    port.subscribe({
      ready: () => this.patch({ engine: this.port.getStatus() }),
      frame: (f: FrameInfo) => {
        this.frameTap?.(f)
        // 倒计时与得分直接用沙箱报告的真实值，不在这里推断。
        this.patch({ display: { timeLeft: f.timeLeft, score: f.score, over: f.over } })
      },
    })
  }

  // ---- 订阅（React useSyncExternalStore 形状）-----------------------------------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  readonly getSnapshot = (): SessionSnapshot => this.snap

  view(snap: SessionSnapshot = this.snap): SessionView {
    if (this.cachedView?.snap === snap) return this.cachedView.view
    const view = deriveView(snap)
    this.cachedView = { snap, view }
    return view
  }

  private patch(partial: Partial<SessionSnapshot>): void {
    this.snap = { ...this.snap, ...partial, runId: this.port.currentRunId() }
    for (const l of [...this.listeners]) l()
  }

  // ---- 草稿：只有学生作品（关卡、各关脚本、预测），不含运行结果 -------------------------

  /** 当前草稿；这是本课唯一的“脚本”表示，适配器 getScript、本地保存、导出都用它。 */
  draft(): DraftScript {
    return toDraft(this.snap.state)
  }

  /** 校验草稿是否可以载入（不改变会话）。 */
  static isValidDraft(raw: unknown): boolean {
    return fromDraft(raw) !== null
  }

  /** 载入草稿（导入、适配器 loadScript、壳恢复）；不合法抛错，会话保持原样。 */
  loadDraft(raw: unknown): void {
    const next = fromDraft(raw)
    if (!next) throw new Error('作品内容不合法')
    this.replaceState(next, true)
  }

  /** 从本机存储恢复（课堂页自己的草稿路径）。内容不合法时保持原样并给出原因。 */
  restoreFromStorage(storage: StorageLike | null): { restored: boolean; reason: string | null } {
    const r = loadDraft(storage)
    if (!r.state) return { restored: false, reason: r.reason }
    this.replaceState(r.state, false)
    return { restored: true, reason: null }
  }

  /** 编辑槽位每挂载一次调用一次；返回这是不是“再次挂载”（壳的恢复初始 / 导入 / 切换会让槽位重新挂载）。 */
  noteSlotMounted(): boolean {
    this.slotMounts += 1
    return this.slotMounts > 1
  }

  /** 还没有任何作品内容（刚打开、或刚重置）：关卡在探索关、没有脚本、没有预测。 */
  isPristine(): boolean {
    return JSON.stringify(this.draft()) === JSON.stringify(toDraft(initialState()))
  }

  /** 恢复到课程起点（共享壳的“恢复初始”）：所有关卡的脚本和预测都清空，回到探索关。 */
  resetAll(): void {
    this.replaceState(initialState(), true)
    this.patch({ role: 'student', hints: { ...NO_HINTS } })
  }

  /** 导出文件内容的校验与载入（调用方先检查文件大小）。 */
  importWork(parsed: { lessonId?: unknown; script?: unknown }): void {
    if (parsed.lessonId !== L05_LESSON_ID) throw new Error('这不是“倒计时游戏结束”的作品')
    this.loadDraft(parsed.script)
  }

  private replaceState(next: LessonState, bumpEditor: boolean): void {
    this.invalidateRun()
    this.patch({
      state: next,
      trace: null,
      notice: null,
      display: startDisplay(next.levelId),
      editorKey: bumpEditor ? this.snap.editorKey + 1 : this.snap.editorKey,
    })
  }

  // ---- 编辑 ------------------------------------------------------------------

  /** 编辑器报告脚本变了：停止运行、旧结果作废；探索关只读、脚本没变都不处理。 */
  editProgram(next: Program): void {
    const lvl = this.snap.state.levelId
    if (lvl === 'explore') return
    if (programFingerprint(next) === programFingerprint(programFor(this.snap.state, lvl))) return
    this.invalidateRun()
    this.patch({ state: editProgram(this.snap.state, lvl, next), trace: null, notice: null, display: startDisplay(lvl) })
  }

  switchLevel(next: LevelId): void {
    if (next === this.snap.state.levelId) return
    this.invalidateRun()
    this.patch({
      state: { ...this.snap.state, levelId: next },
      trace: null,
      notice: null,
      display: startDisplay(next),
      editorKey: this.snap.editorKey + 1,
      role: 'student',
    })
  }

  setPrediction(patch: { time?: string; after?: string }): void {
    const lvl = this.snap.state.levelId
    this.patch({
      state: { ...this.snap.state, predictions: { explore: { ...this.snap.state.predictions.explore, ...patch } } },
      trace: null,
      notice: null,
      display: startDisplay(lvl),
    })
  }

  resetLevel(): void {
    const lvl = this.snap.state.levelId
    if (lvl === 'explore') return
    this.invalidateRun()
    this.patch({
      state: editProgram(this.snap.state, lvl, { scripts: [] }),
      trace: null,
      notice: null,
      display: startDisplay(lvl),
      editorKey: this.snap.editorKey + 1,
    })
  }

  setRole(role: Role): void {
    if (role !== this.snap.role) this.patch({ role })
  }

  setPaletteOpen(open: boolean): void {
    if (open !== this.snap.paletteOpen) this.patch({ paletteOpen: open })
  }

  revealHint(): void {
    const lvl = this.snap.state.levelId
    if (this.snap.hints[lvl] >= 3) return
    this.patch({ hints: { ...this.snap.hints, [lvl]: this.snap.hints[lvl] + 1 } })
  }

  /** 运行被拦下（引擎没准备好等）：如实给出原因，旧结果清掉。 */
  reportBlocked(message: string): void {
    this.patch({ notice: message, trace: null, display: startDisplay(this.snap.state.levelId) })
  }

  // ---- 运行 ------------------------------------------------------------------

  /** 现在为什么不能运行；可以运行返回 null。 */
  runBlockReason(): string | null {
    const v = this.view()
    if (!v.canRun) return v.problems[0]
    if (!v.predictionReady) return PREDICTION_REQUIRED_REASON
    if (!this.snap.engine.ready) return this.snap.engine.error ?? ENGINE_NOT_READY_REASON
    return null
  }

  stop(): void {
    this.port.stop()
  }

  /** 停掉正在跑的运行，并让它回来的结果被丢弃（编辑 / 切关 / 载入都先走这里）。 */
  private invalidateRun(): void {
    this.port.stop()
  }

  async run(opts?: { onFrame?: (f: FrameInfo) => void }): Promise<RunOutcome> {
    if (this.snap.running) return { kind: 'busy' }
    const lvl = this.snap.state.levelId
    const prog = programFor(this.snap.state, lvl)
    const token = ++this.runToken
    this.patch({ notice: null, trace: null, running: true, display: startDisplay(lvl) })
    if (!this.snap.engine.ready) {
      this.patch({ running: false, notice: this.snap.engine.error ?? ENGINE_NOT_READY_REASON })
      return { kind: 'blocked' }
    }
    this.frameTap = opts?.onFrame ?? null
    try {
      const t = await this.port.runLevel(lvl, prog, STAGE_FRAME_MS)
      // 结果回来时，如果孩子已经换了关卡或改了脚本，这个结果就是过期的，直接丢弃。
      const now = this.snap.state
      if (now.levelId !== lvl || programFingerprint(programFor(now, lvl)) !== t.fingerprint) return { kind: 'discarded' }
      this.patch({
        trace: t,
        notice: t.endedBy === 'stopped' ? '已停止。这次不判定，脚本保留。' : this.snap.notice,
        state: recordRun(this.snap.state, t),
      })
      return { kind: t.endedBy === 'stopped' ? 'stopped' : 'finished', trace: t }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      // 被新运行取代或页面卸载不是学生要看的错误。
      if (message.includes('取代') || message.includes('卸载')) return { kind: 'discarded' }
      this.patch({ notice: `运行没有完成：${message}` })
      return { kind: 'error', message }
    } finally {
      if (token === this.runToken) {
        this.frameTap = null
        this.patch({ running: false })
      }
    }
  }
}

export { startDisplay }
