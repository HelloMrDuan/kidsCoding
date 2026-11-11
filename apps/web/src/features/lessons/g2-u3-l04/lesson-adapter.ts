// LessonL04Adapter：把本课会话（session.ts）包成共享 LessonWorkspace 的 EngineAdapter。
//
// 约定（与 workspace-adapters.ts / workspace-slots.ts 一致）：
// - 适配器不挂 React 内容、不 createRoot；编辑器、舞台、角色栏是 ui/slots.tsx 里的三个槽位组件，由壳渲染。
// - getScript() 就是草稿（关卡 + 各关脚本 + 预测），一课一键 kidscoding-draft:G2-U3-L04；运行结果不入草稿。
// - run() 的前置条件不满足（没写预测、脚本不合法、引擎没准备好）时同步抛错，不静默无事发生。
// - 舞台状态通过 getStageState() 以普通字典交给壳；判定通过 getJudgmentResult() 以共享 JudgmentResult 交给壳，
//   结论措辞全部来自本课 judge.ts，壳不替本课写“已掌握”。

import { type RunJudgment, type RunTrace as CourseTrace } from './judge'
import { L04_LESSON_ID, type LevelId } from './params'
import { L04Session } from './session'
import { stageStateOf, type StageDict } from './stage-state'
import { ScratchL04Adapter, type VmPort } from './vm-adapter'
import type { EngineAdapter, EngineState, RunEvent } from '../workspace/workspace-adapters'
import type { FileCapabilities, JudgmentResult, RunFrame, RunTrace as SharedRunTrace } from '../workspace/workspace-slots'

/**
 * 课程判定 → 共享 JudgmentResult。措辞原样来自 judge.ts，只换形状。未判定返回 null。
 *
 * 共享壳只显示每层的 `detail` 和 `conclusion`（不显示 `label`，也不显示 `methodEvidence`），
 * 而首席统一的措辞要求学生看到“舞台结果：/任务结果：/知识证据：”前缀和固定的“理解情况…需要进一步解释或练习”。
 * 所以这里：`detail` 是带前缀的完整一行；“理解情况”说明并入 `conclusion`，不再单独放 `methodEvidence`（避免壳以后显示它时重复）。
 */
export function toJudgmentResult(judgment: RunJudgment | null, levelId: LevelId): JudgmentResult | null {
  if (!judgment || judgment.status !== 'judged') return null
  const row = (id: 'stage' | 'task' | 'knowledge', label: string, layer: { passed: boolean; line: string }) =>
    ({ id, label, passed: layer.passed, detail: layer.line })
  const verdict = levelId === 'explore' ? '这一关是观察：对一对你的预测和真实结果。' : judgment.conclusion
  return {
    layers: [
      row('stage', '舞台结果', judgment.stage),
      row('task', '任务结果', judgment.task),
      row('knowledge', '知识证据', judgment.knowledge),
    ],
    passed: judgment.passed,
    conclusion: `${verdict}\n${judgment.understanding}`,
  }
}

// ---- 共享 RunTrace 映射 -------------------------------------------------------------

/**
 * 课程轨迹 → 共享 RunTrace：每一次真实的“将 得分 增加”是一帧（event 'score'，source 为球的名字），
 * `dx` 放得分增量（共享 RunFrame 里没有专门的“得分”字段，这里不借用别的含义，只用 dx 承载这个有符号数并在文档里写明）。
 *
 * 这里**没有**对应的“共享轨迹判定器”：本课的知识证据取决于“每次加分的那一帧里同一个球的检查是否为真”，
 * 而共享 RunFrame 没有检查结果的字段（共享层刻意不含课程字段，也不应该靠解析文字取值）。
 * 只靠得分序列判定会丢掉检查，得出和课程判定不同的结论，比不提供更糟。壳在本课的路径上读的是适配器的 getJudgmentResult()，
 * 不会调用 JudgmentAdapter。
 */
export function toSharedRunTrace(trace: CourseTrace): SharedRunTrace {
  const frames: RunFrame[] = trace.scores.map(s => ({
    frame: s.frame, event: 'score', source: s.ball, dx: s.by, dy: 0,
  }))
  return { runId: trace.runId, lessonId: L04_LESSON_ID, levelId: trace.levelId, frames }
}

// ---- 适配器 -------------------------------------------------------------------------

function engineStateAfter(trace: CourseTrace): EngineState {
  return {
    x: 0,
    // 分数就是这一次运行里真实 VM 的“得分”变量最终值，只反映本次运行，不叠加。
    score: trace.endedBy === 'finished' ? trace.finalScore : 0,
    running: false,
    frames: trace.framesRun,
  }
}

export class LessonL04Adapter implements EngineAdapter {
  readonly session: L04Session
  private readonly port: VmPort
  private engineState: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  private readonly changeListeners = new Set<() => void>()
  private lastDraft: string
  private lastRunError: string | null = null

  constructor(options?: { port?: VmPort }) {
    this.port = options?.port ?? new ScratchL04Adapter()
    this.session = new L04Session(this.port)
    this.lastDraft = JSON.stringify(this.session.draft())
    this.session.subscribe(() => {
      const now = JSON.stringify(this.session.draft())
      if (now === this.lastDraft) return // 帧、运行结果、提示这些不是作品的编辑
      this.lastDraft = now
      for (const l of [...this.changeListeners]) l()
    })
  }

  // ---- EngineAdapter 必需面 ---------------------------------------------------------

  /** 把真实 Scratch VM 沙箱挂到壳给的元素里（不渲染任何 React 内容）。 */
  mount(el: HTMLElement): void {
    this.port.mount(el)
  }

  unmount(): void {
    this.port.unmount()
  }

  /** 载入草稿；不合法抛错且会话不变。 */
  loadScript(script: unknown): void {
    this.session.loadDraft(script)
  }

  getScript(): unknown {
    return this.session.draft()
  }

  /**
   * 运行当前关卡。前置条件不满足同步抛错；已有运行未结束时抛错（先 stop）。
   * 事件：每帧 'frame'；结束 'finished'（脚本自然跑完并可判定）或 'stopped'（被停止、出错、结果过期）。
   */
  run(onEvent: (e: RunEvent) => void): void {
    if (this.session.getSnapshot().running) throw new Error('正在运行，请先停止')
    const reason = this.session.runBlockReason()
    if (reason) throw new Error(reason)
    this.engineState = { x: 0, score: 0, running: true, frames: 0 }
    this.lastRunError = null
    void this.session
      .run({
        onFrame: f => {
          this.engineState = { x: f.hitBall.x, score: f.score, running: true, frames: f.frame }
          onEvent({ kind: 'frame', state: this.engineState })
        },
      })
      .then(outcome => {
        if (outcome.kind === 'finished' || outcome.kind === 'stopped') {
          this.engineState = engineStateAfter(outcome.trace)
          onEvent({ kind: outcome.kind === 'finished' && outcome.trace.endedBy === 'finished' ? 'finished' : 'stopped', state: this.engineState })
        } else if (outcome.kind !== 'busy') {
          if (outcome.kind === 'error') this.lastRunError = `运行没有完成：${outcome.message}`
          this.engineState = { ...this.engineState, running: false }
          onEvent({ kind: 'stopped', state: this.engineState })
        }
      })
  }

  stop(): void {
    this.session.stop()
  }

  getState(): EngineState {
    return this.engineState
  }

  // ---- 可选扩展 ---------------------------------------------------------------------

  validateDraft(script: unknown): boolean {
    return L04Session.isValidDraft(script)
  }

  getFileCapabilities(): FileCapabilities {
    // 一课一份作品：不能“新建”；可保存、导出、导入、重新开始本关。
    return { canNew: false, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  getStageState(): StageDict {
    const s = this.session.getSnapshot()
    return stageStateOf(s.positions, s.running, s.state.levelId)
  }

  getJudgmentResult(): JudgmentResult | null {
    const s = this.session.getSnapshot()
    return toJudgmentResult(this.session.view(s).judgment, s.state.levelId)
  }

  // ---- 本课扩展 ---------------------------------------------------------------------

  /** 只在作品被编辑时通知（脚本、预测、关卡），不在运行帧、结果、提示变化时通知。 */
  addChangeListener(listener: () => void): void {
    this.changeListeners.add(listener)
  }

  removeChangeListener(listener: () => void): void {
    this.changeListeners.delete(listener)
  }

  /** 最近一次运行没有完成的原因（引擎出错）；正常结束、被学生停止都不是错误，返回 null。壳在收到 'stopped' 时读取它。 */
  getLastRunError(): string | null {
    return this.lastRunError
  }

  isReady(): boolean {
    return this.session.getSnapshot().engine.ready
  }

  getLoadError(): string | null {
    return this.session.getSnapshot().engine.error
  }
}
