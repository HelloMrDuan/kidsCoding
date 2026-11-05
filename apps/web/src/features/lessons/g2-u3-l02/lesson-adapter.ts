// LessonL02Adapter：把本课会话（session.ts）包成共享 LessonWorkspace 的 EngineAdapter。
//
// 约定（与 workspace-adapters.ts / workspace-slots.ts 一致）：
// - 适配器不挂 React 内容、不 createRoot；编辑器、舞台、角色栏是 ui/slots.tsx 里的三个槽位组件，由壳渲染。
// - getScript() 就是草稿（关卡 + 各关脚本 + 预测），一课一键 kidscoding-draft:G2-U3-L02；运行结果不入草稿。
// - run() 的前置条件不满足（没写预测、脚本不合法、引擎没准备好）时同步抛错，不静默无事发生。
// - 舞台状态通过 getStageState() 以普通字典交给壳；判定通过 getJudgmentResult() 以共享 JudgmentResult 交给壳，
//   结论措辞全部来自本课 judge.ts，壳不替本课写“已掌握”。

import { judgeRun, UNDERSTANDING_NOTE, type RunJudgment, type RunTrace as CourseTrace } from './judge'
import { L02_LEVELS, L02_LESSON_ID, L02_PARAMS, type LevelId } from './params'
import { L02Session } from './session'
import { stageStateOf, type StageDict } from './stage-state'
import { ScratchL02Adapter, type VmPort } from './vm-adapter'
import type { EngineAdapter, EngineState, RunEvent } from '../workspace/workspace-adapters'
import type {
  FileCapabilities, JudgmentAdapter, JudgmentResult, RunFrame, RunTrace as SharedRunTrace,
} from '../workspace/workspace-slots'

const LABEL_PREFIX: Record<'stage' | 'task' | 'knowledge', string> = {
  stage: '舞台结果：',
  task: '任务结果：',
  knowledge: '知识证据：',
}

function stripLabel(line: string, id: keyof typeof LABEL_PREFIX): string {
  const prefix = LABEL_PREFIX[id]
  return line.startsWith(prefix) ? line.slice(prefix.length) : line
}

/** 课程判定 → 共享 JudgmentResult（只换形状，措辞原样来自 judge.ts）。未判定返回 null。 */
export function toJudgmentResult(judgment: RunJudgment | null, levelId: LevelId): JudgmentResult | null {
  if (!judgment || judgment.status !== 'judged') return null
  const row = (id: keyof typeof LABEL_PREFIX, label: string, layer: { passed: boolean; line: string }) =>
    ({ id, label, passed: layer.passed, detail: stripLabel(layer.line, id) })
  return {
    layers: [
      row('stage', '舞台结果', judgment.stage),
      row('task', '任务结果', judgment.task),
      row('knowledge', '知识证据', judgment.knowledge),
    ],
    passed: judgment.passed,
    conclusion: levelId === 'explore' ? '这一关是观察：对一对你的预测和真实结果。' : judgment.conclusion,
    methodEvidence: judgment.understanding,
  }
}

// ---- 共享 RunTrace 互转 -------------------------------------------------------------

/**
 * 课程轨迹 → 共享 RunTrace：每次真实执行的“将 x 坐标增加”是一帧（source 'basket'，带 inLoop 与有符号 dx）。
 * 共享轨迹不带起点和终点；judgeSharedTrace 用关卡参数和 Σdx 还原，阈值全部仍在本课 params.ts。
 */
export function toSharedRunTrace(trace: CourseTrace): SharedRunTrace {
  const frames: RunFrame[] = trace.basketMoves.map(m => ({
    frame: m.frame, event: 'move', source: 'basket', inLoop: m.inLoop, dx: m.dx, dy: 0,
  }))
  return {
    runId: trace.runId,
    lessonId: L02_LESSON_ID,
    levelId: trace.levelId,
    ...(trace.landing ? { landingFrame: trace.landing.frame } : {}),
    frames,
  }
}

/**
 * 用共享轨迹还原落点并复用本课 judgeRun。落地帧缺失（没落地）或关卡未知时返回 null（不判定）。
 * 说明：还原靠 Σdx，与 VM 里篮子的真实 x 一致的前提是舞台没有边缘限位；本课沙箱没有渲染器，不做边缘限位，
 * 且程序限制（±100 × 最多 20 次 × 3 个脚本）也不会超出 ±240 太多——这一点由等价测试覆盖。
 */
export function judgeSharedTrace(trace: SharedRunTrace): JudgmentResult | null {
  if (trace.lessonId !== L02_LESSON_ID) return null
  const levelId = trace.levelId as LevelId | undefined
  if (!levelId || !(levelId in L02_LEVELS) || trace.landingFrame === undefined) return null
  const level = L02_LEVELS[levelId]
  const moves = trace.frames.filter(f => f.source === 'basket' && f.event === 'move' && typeof f.dx === 'number')
  const basketX = L02_PARAMS.basketStartX + moves.filter(f => f.frame <= trace.landingFrame!).reduce((s, f) => s + (f.dx as number), 0)
  const reconstructed: CourseTrace = {
    levelId,
    runId: trace.runId,
    fingerprint: '',
    endedBy: 'landed',
    framesRun: trace.landingFrame,
    start: { basketX: L02_PARAMS.basketStartX, fruitX: level.fruitX },
    landing: { frame: trace.landingFrame, basketX, fruitX: level.fruitX, fruitY: L02_PARAMS.basketY },
    basketMoves: moves.map(f => ({ frame: f.frame, dx: f.dx as number, inLoop: !!f.inLoop })),
  }
  return toJudgmentResult(judgeRun(reconstructed, level), levelId)
}

export const l02JudgmentAdapter: JudgmentAdapter = {
  judge(trace) {
    return judgeSharedTrace(trace) ?? { layers: [], passed: false, conclusion: '这一次没有落地，不判定。', methodEvidence: UNDERSTANDING_NOTE }
  },
}

// ---- 适配器 -------------------------------------------------------------------------

function engineStateAfter(trace: CourseTrace): EngineState {
  const caught = !!trace.landing && Math.abs(trace.landing.basketX - trace.landing.fruitX) <= L02_PARAMS.catchTolerance
  return {
    x: trace.landing?.basketX ?? L02_PARAMS.basketStartX,
    // 分数只反映这一次运行：接住记 1，其余 0，不叠加。
    score: trace.endedBy === 'landed' && caught ? 1 : 0,
    running: false,
    frames: trace.framesRun,
  }
}

export class LessonL02Adapter implements EngineAdapter {
  readonly session: L02Session
  private readonly port: VmPort
  private engineState: EngineState = { x: L02_PARAMS.basketStartX, score: 0, running: false, frames: 0 }
  private readonly changeListeners = new Set<() => void>()
  private lastDraft: string
  private lastRunError: string | null = null

  constructor(options?: { port?: VmPort }) {
    this.port = options?.port ?? new ScratchL02Adapter()
    this.session = new L02Session(this.port)
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
   * 事件：每帧 'frame'；结束 'finished'（落地并可判定）或 'stopped'（被停止、出错、结果过期）。
   */
  run(onEvent: (e: RunEvent) => void): void {
    if (this.session.getSnapshot().running) throw new Error('正在运行，请先停止')
    const reason = this.session.runBlockReason()
    if (reason) throw new Error(reason)
    this.engineState = { x: L02_PARAMS.basketStartX, score: 0, running: true, frames: 0 }
    this.lastRunError = null
    void this.session
      .run({
        onFrame: f => {
          this.engineState = { x: f.basket.x, score: 0, running: true, frames: f.frame }
          onEvent({ kind: 'frame', state: this.engineState })
        },
      })
      .then(outcome => {
        if (outcome.kind === 'finished' || outcome.kind === 'stopped') {
          this.engineState = engineStateAfter(outcome.trace)
          onEvent({ kind: outcome.kind === 'finished' && outcome.trace.endedBy === 'landed' ? 'finished' : 'stopped', state: this.engineState })
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
    return L02Session.isValidDraft(script)
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
