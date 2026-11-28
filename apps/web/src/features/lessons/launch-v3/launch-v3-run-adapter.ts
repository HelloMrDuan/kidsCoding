/**
 * OPS-056：启蒙课 V3 运行适配器（按课程 ID 参数化，语义同 OPS-041 ForestRunAdapter）。
 *
 * LaunchRunAdapter 是本课唯一的运行状态与判定来源：外壳运行按钮是唯一运行入口，
 * PlayableStage（external 模式）只渲染本适配器的执行快照。
 * - runProgram：先停旧 run；同步判定当前关（judgeLaunchStep）；不能运行 → 直接 error，
 *   不伪造播放；点击程序 → armed，等孩子点角色（clickCharacter）才开始播放，等待期间无计时器；
 *   其余每帧 330ms（与旧执行器同拍），播完才写判定。
 * - stop()：同步清计时器、取消等待点击，保留当前舞台状态，不发 finished。
 * - reset()：切关清理，快照、判定、帧全部回到初始值。
 * - 设计错误实验的“已观察”是会话内状态，由路由经构造参数传入读取函数。
 */
import type {
  EngineAdapter,
  EngineState,
  RunEvent,
  SlotRunAdapter,
} from '@/features/lessons/workspace/workspace-adapters'
import type { FileCapabilities, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'
import type { PlayableStageExternalState } from '@/features/lessons/playable-stage/playable-stage'

import {
  coerceLaunchDraft,
  emptyLaunchDraft,
  isValidLaunchDraft,
  type LaunchSlotData,
} from './launch-v3-draft'
import {
  buildLaunchJudgment,
  EMPTY_LAUNCH_FRAME,
  GIFT_FOUND_LOG,
  judgeLaunchStep,
  type LaunchJudgeResult,
  type LaunchStageFrame,
} from './launch-v3-judging'
import { launchV3StepIds } from './launch-v3-lessons'

/** 每块积木一帧的节拍（与旧课堂 useBlockExecutor 的 330ms 同拍）。 */
export const LAUNCH_FRAME_MS = 330

export type LaunchExecutionState = 'idle' | 'armed' | 'running' | 'success' | 'error'

export type LaunchExecutionSnapshot = {
  executionState: LaunchExecutionState
  frame: LaunchStageFrame
  actionLog: string[]
  frameIndex: number
  designedMistake: boolean
  giftFound: boolean
  trigger: 'start' | 'click'
  /**
   * 双角色课（L10～L12）判定失败时给孩子看的原因（judgeDuoProgram 的 reason，与旧课堂
   * DuoStage 结果条同一文案）；单角色课与未失败时为 null，舞台照旧自己解释。
   */
  failureReason: string | null
}

export function emptyLaunchExecutionSnapshot(): LaunchExecutionSnapshot {
  return {
    executionState: 'idle',
    frame: { ...EMPTY_LAUNCH_FRAME },
    actionLog: [],
    frameIndex: 0,
    designedMistake: false,
    giftFound: false,
    trigger: 'start',
    failureReason: null,
  }
}

/** 当前关的程序：只取 programs[当前关]，不得用别关的程序。 */
export function currentLaunchProgram(data: LaunchSlotData) {
  const ids = launchV3StepIds(data.lessonId)
  const stepId = ids[Math.min(Math.max(data.stepIndex, 0), Math.max(ids.length - 1, 0))]
  return stepId ? (data.programs[stepId] ?? []) : []
}

/** 执行快照 → PlayableStage external 模式的字段。 */
export function launchExternalState(snapshot: LaunchExecutionSnapshot): PlayableStageExternalState {
  const frame = snapshot.frame
  return {
    executionState: snapshot.executionState,
    characterPosition: frame.mainPosition,
    message: frame.mainMessage ?? '',
    actionLog: snapshot.actionLog,
    frameIndex: snapshot.frameIndex,
    designedMistake: snapshot.designedMistake,
    scene: frame.scene,
    partnerPosition: frame.partnerPosition,
    partnerMessage: frame.partnerMessage ?? '',
    activeActor: frame.activeActor,
    mainAction: snapshot.executionState === 'running' ? frame.mainAction : 'idle',
    partnerAction: snapshot.executionState === 'running' ? frame.partnerAction : 'idle',
    failureReason: snapshot.executionState === 'error' ? snapshot.failureReason : null,
  }
}

const IDLE_STATE: EngineState = { x: 0, score: 0, running: false, frames: 0 }

export class LaunchRunAdapter implements SlotRunAdapter {
  private timer: ReturnType<typeof setTimeout> | null = null
  private state: EngineState = { ...IDLE_STATE }
  private lastJudgment: JudgmentResult | null = null
  private snapshot: LaunchExecutionSnapshot = emptyLaunchExecutionSnapshot()
  private result: LaunchJudgeResult | null = null
  private pending: ((event: RunEvent) => void) | null = null
  private readonly listeners = new Set<() => void>()
  private readonly isStepObserved: (stepId: string) => boolean

  constructor(
    readonly lessonId: string,
    options?: { isStepObserved?: (stepId: string) => boolean },
  ) {
    this.isStepObserved = options?.isStepObserved ?? (() => false)
  }

  runProgram(program: unknown, onEvent: (event: RunEvent) => void): void {
    // 同一时刻至多一个 live run：新 run 先停旧 run（重复运行不叠加）。
    this.stop()
    const data = coerceLaunchDraft(this.lessonId, program)
    const stepId = launchV3StepIds(this.lessonId)[data.stepIndex] ?? ''
    const result = judgeLaunchStep(
      this.lessonId,
      currentLaunchProgram(data),
      data.stepIndex,
      this.isStepObserved(stepId),
    )
    this.result = result
    this.snapshot = {
      ...emptyLaunchExecutionSnapshot(),
      executionState: 'running',
      designedMistake: result.designedMistake,
      trigger: result.trigger,
    }
    if (!result.canRun) {
      this.finish(onEvent)
      return
    }
    if (result.trigger === 'click') {
      // 点击程序：只布防，不排计时器；孩子点角色才执行（与旧执行器 armed 同语义）。
      this.pending = onEvent
      this.snapshot = { ...this.snapshot, executionState: 'armed' }
      this.state = { ...IDLE_STATE, running: true }
      onEvent({ kind: 'frame', state: { ...this.state } })
      this.notify()
      return
    }
    this.startFrames(onEvent)
  }

  /** 舞台点角色：只在 armed 时生效，返回是否开始执行。 */
  clickCharacter(): boolean {
    if (this.snapshot.executionState !== 'armed' || !this.pending) return false
    const onEvent = this.pending
    this.pending = null
    this.snapshot = { ...this.snapshot, executionState: 'running' }
    this.startFrames(onEvent)
    return true
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.pending = null
    if (this.state.running) this.state = { ...this.state, running: false }
    if (this.snapshot.executionState === 'running' || this.snapshot.executionState === 'armed') {
      this.snapshot = { ...this.snapshot, executionState: 'idle' }
      this.notify()
    }
  }

  reset(): void {
    this.stop()
    this.state = { ...IDLE_STATE }
    this.lastJudgment = null
    this.snapshot = emptyLaunchExecutionSnapshot()
    this.result = null
    this.notify()
  }

  getState(): EngineState {
    return { ...this.state }
  }

  /**
   * 外壳以解绑方式调用（`const validator = runAdapter?.validateDraft ?? …; validator(data)`，
   * lesson-workspace.tsx loadEditorSlotData），普通方法里的 this 会是 undefined、抛错后被
   * 外壳按 fail-closed 判为无效，导致合法草稿永远恢复不了。用箭头属性绑定本课 lessonId。
   */
  readonly validateDraft = (data: unknown): boolean => isValidLaunchDraft(this.lessonId, data)

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getStageState(): Record<string, number | string | boolean> {
    return {
      mainX: this.snapshot.frame.mainPosition,
      partnerX: this.snapshot.frame.partnerPosition,
      scene: this.snapshot.frame.scene,
      executionState: this.snapshot.executionState,
      frameIndex: this.snapshot.frameIndex,
      actionLogLines: this.snapshot.actionLog.length,
      designedMistake: this.snapshot.designedMistake,
      giftFound: this.snapshot.giftFound,
    }
  }

  getExecutionSnapshot(): LaunchExecutionSnapshot {
    return {
      ...this.snapshot,
      frame: { ...this.snapshot.frame },
      actionLog: [...this.snapshot.actionLog],
    }
  }

  getLastRunError(): string | null {
    return null
  }

  /** 舞台订阅快照变化（点击开始执行等不经外壳的变化）。 */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener())
  }

  private startFrames(onEvent: (event: RunEvent) => void): void {
    const result = this.result
    if (!result || result.frames.length === 0) {
      this.finish(onEvent)
      return
    }
    this.state = { ...IDLE_STATE, running: true }
    this.notify()
    this.scheduleFrame(0, onEvent)
  }

  private scheduleFrame(index: number, onEvent: (event: RunEvent) => void): void {
    this.timer = setTimeout(() => {
      this.timer = null
      const frames = this.result?.frames ?? []
      if (index < frames.length) {
        this.emitFrame(index, onEvent)
        if (index + 1 < frames.length) {
          this.scheduleFrame(index + 1, onEvent)
          return
        }
      }
      this.finish(onEvent)
    }, LAUNCH_FRAME_MS)
  }

  private emitFrame(index: number, onEvent: (event: RunEvent) => void): void {
    const frame = this.result?.frames[index]
    if (!frame) return
    this.snapshot = {
      ...this.snapshot,
      frame,
      actionLog: frame.log ? [...this.snapshot.actionLog, frame.log] : this.snapshot.actionLog,
      frameIndex: index,
    }
    this.state = { x: frame.mainPosition, score: 0, running: true, frames: index + 1 }
    onEvent({ kind: 'frame', state: { ...this.state } })
    this.notify()
  }

  private finish(onEvent: (event: RunEvent) => void): void {
    const result = this.result
    if (!result) return
    // 判定只在播放结束（或不能运行直接结束）时赋值。
    this.lastJudgment = buildLaunchJudgment(result)
    const actionLog = result.giftFound
      ? [...this.snapshot.actionLog, GIFT_FOUND_LOG]
      : this.snapshot.actionLog
    this.snapshot = {
      ...this.snapshot,
      executionState: result.passed ? 'success' : 'error',
      frame: { ...result.final },
      actionLog,
      frameIndex: Math.max(result.frames.length - 1, 0),
      giftFound: result.giftFound,
      failureReason: result.duoVerdict && !result.passed ? (result.duoVerdict.reason ?? null) : null,
    }
    this.state = {
      x: result.final.mainPosition,
      score: result.passed ? 1 : 0,
      running: false,
      frames: result.frames.length,
    }
    onEvent({ kind: 'finished', state: { ...this.state } })
    this.notify()
  }
}

/** 路由必需的 adapter prop 载体（外壳对 slot 引擎不挂载、不调用其 run）。 */
export class LaunchAdapter implements EngineAdapter {
  private draft: LaunchSlotData

  constructor(
    readonly lessonId: string,
    initial?: unknown,
  ) {
    this.draft = initial === undefined ? emptyLaunchDraft(lessonId) : coerceLaunchDraft(lessonId, initial)
  }

  mount(): void {}

  unmount(): void {}

  loadScript(script: unknown): void {
    this.draft = coerceLaunchDraft(this.lessonId, script)
  }

  getScript(): unknown {
    return this.draft
  }

  getState(): EngineState {
    return { ...IDLE_STATE }
  }

  run(onEvent: (event: RunEvent) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {}

  /** 同 LaunchRunAdapter：外壳的后备校验也是解绑调用，必须绑定 this。 */
  readonly validateDraft = (script: unknown): boolean => isValidLaunchDraft(this.lessonId, script)

  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  getJudgmentResult(): JudgmentResult | null {
    return null
  }
}
