/**
 * OPS-052：G0-U1 grid 课的运行适配器（SlotRunAdapter）+ 薄 EngineAdapter。
 *
 * 与 lesson-01-forest-hello 同一架构：本适配器是本课唯一的运行状态与
 * 判定来源；外壳的运行按钮是唯一运行入口，舞台插槽只渲染适配器的执行
 * 快照，不跑自己的播放器（旧的 useGridPlayback 有独立计时器，在 V3 里
 * 会让舞台出现第二个时钟，故不复用）。
 *
 * 执行语义与旧课堂真实一致：
 * - 程序与关卡来自外壳交来的整份草稿（coerceGridDraft + 当前关程序），
 *   创意关未选目标格（needsGoal）时不运行、不产生判定，直接 finished，
 *   并置 needsGoal 让舞台持续显示“先选一格”。
 * - 关卡用旧课堂同一个 stepLevel（创意关使用孩子选的目标格）。
 * - runGridProgram 是唯一判定；通过 = 真实走到目标格 + 本关正面约束。
 * - 每帧 420ms（与旧课堂 useGridPlayback 的节拍一致，一格一格演）。
 * - 无帧运行（缺“开始时”、积木掉队等）同步 finished，判定在 finished
 *   前赋值，不伪造播放。
 * - stop() 只取消播放、保留舞台现状；reset() 是关卡边界的完整清理
 *   （切关前与舞台重挂载时调用），避免上一关判定泄漏到新关。
 * - getJudgmentResult() 只在本次运行结束时赋值；每次 runProgram 开始时
 *   清空旧判定，needsGoal 的 finished 不会回放出上一次的成功/失败。
 * - 判定三层（stage/task/knowledge）只由本适配器构造，外壳原样展示。
 * - score 只是 EngineState 必填字段的当次通过位，不渲染为得分。
 */
import type { GridLesson, GridLessonStep } from '@/content/curriculum/g0-u1-grid-lessons'
import { runGridProgram, type GridLevel, type GridRun } from '../grid/grid-engine'
import { stepLevel } from '../grid/grid-lab'
import type {
  EngineAdapter,
  EngineState,
  RunEvent,
  SlotRunAdapter,
} from '@/features/lessons/workspace/workspace-adapters'
import type { FileCapabilities, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import {
  coerceGridDraft,
  gridCurrentProgram,
  gridCurrentStep,
  gridStarterProgram,
  isValidGridDraft,
  type GridSlotData,
} from './grid-v3-draft'

/** 每帧节拍：与旧课堂 useGridPlayback 默认 420ms 一致。 */
export const GRID_FRAME_MS = 420

export type GridExecutionState = 'idle' | 'running' | 'success' | 'error'

/**
 * 舞台渲染用的执行快照（纯数据）。level 是这次运行真实使用的关卡
 * （创意关可能已换目标格）；run 为 null 表示还没跑过或已 reset。
 */
export type GridExecutionSnapshot = {
  stepId: string | null
  stepIndex: number | null
  executionState: GridExecutionState
  needsGoal: boolean
  playing: boolean
  run: GridRun | null
  /** -1 = 还没开始播放；否则为当前显示到第几帧。 */
  frameIndex: number
  level: GridLevel | null
}

export function emptyGridExecutionSnapshot(): GridExecutionSnapshot {
  return {
    stepId: null,
    stepIndex: null,
    executionState: 'idle',
    needsGoal: false,
    playing: false,
    run: null,
    frameIndex: -1,
    level: null,
  }
}

/** 判定三层（外壳原样展示；措辞属于本适配器）。 */
export function buildGridJudgment(
  lesson: GridLesson,
  step: GridLessonStep,
  run: GridRun,
): JudgmentResult {
  const diagnosis = run.failure ? lesson.diagnoses[run.failure] ?? run.message : run.message
  return {
    layers: [
      {
        id: 'stage',
        label: '舞台',
        passed: run.passed,
        detail: run.passed ? '小狐狸真的按积木走到了目标格。' : run.message,
      },
      {
        id: 'task',
        label: '任务',
        passed: run.passed,
        detail: run.passed
          ? '当前关的程序与真实运行结果一致。'
          : step.errorLab && run.failure === step.errorLab.expect
            ? `这是本关预想的错误：${step.errorLab.actual}`
            : '本次运行还没达到这一关的目标。',
      },
      {
        id: 'knowledge',
        label: '知识点',
        passed: run.passed,
        detail: run.passed ? `${lesson.concept}：${step.hints[1]}` : diagnosis,
      },
    ],
    passed: run.passed,
    conclusion: run.passed
      ? '本次运行通过：小狐狸真的走到了目标格。'
      : `本次运行未通过：${diagnosis}`,
    methodEvidence: `本次运行共 ${run.frames.length} 个动作。`,
  }
}

export class GridRunAdapter implements SlotRunAdapter {
  private readonly lesson: GridLesson
  private timer: ReturnType<typeof setTimeout> | null = null
  private state: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  private lastJudgment: JudgmentResult | null = null
  private snapshot: GridExecutionSnapshot = emptyGridExecutionSnapshot()
  /** 本次运行真正使用的关卡（判定与播放都用它）。 */
  private level: GridLevel | null = null
  private step: GridLessonStep | null = null
  private stepIndex: number | null = null
  private result: GridRun | null = null

  constructor(lesson: GridLesson) {
    this.lesson = lesson
  }

  runProgram(program: unknown, onEvent: (event: RunEvent) => void): void {
    // 同一时刻至多一个 live run：新 run 替换并停止旧 run。
    this.stop()
    // 旧判定不得被本次 finished 回放（needsGoal 不产生判定）。
    this.lastJudgment = null
    const data = coerceGridDraft(this.lesson, program as GridSlotData)
    const step = gridCurrentStep(this.lesson, data)
    const blocks = gridCurrentProgram(this.lesson, data)
    const needsGoal = !!step.creative && !data.creative?.[step.id]
    this.step = step
    this.stepIndex = data.stepIndex
    this.result = null
    if (needsGoal) {
      // 未选目标格：不运行、不判定；舞台按关卡初始状态渲染并提示先选格。
      this.level = step.level
      this.snapshot = {
        stepId: step.id,
        stepIndex: data.stepIndex,
        executionState: 'idle',
        needsGoal: true,
        playing: false,
        run: null,
        frameIndex: -1,
        level: step.level,
      }
      this.state = { x: step.level.start.x, score: 0, running: false, frames: 0 }
      onEvent({ kind: 'finished', state: { ...this.state } })
      return
    }
    const level = stepLevel(step, data)
    const run = runGridProgram(level, blocks)
    this.level = level
    this.result = run
    this.snapshot = {
      stepId: step.id,
      stepIndex: data.stepIndex,
      executionState: 'running',
      needsGoal: false,
      playing: true,
      run,
      frameIndex: -1,
      level,
    }
    if (run.frames.length === 0) {
      // 无帧直接 finished，不伪造播放；判定在 finished 事件前赋值。
      this.finishImmediately(onEvent)
      return
    }
    this.state = {
      x: level.start.x,
      score: 0,
      running: true,
      frames: 0,
    }
    this.scheduleFrame(0, onEvent)
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.state.running) {
      this.state = { ...this.state, running: false }
    }
    if (this.snapshot.executionState === 'running') {
      this.snapshot = { ...this.snapshot, executionState: 'idle', playing: false }
    }
  }

  /**
   * 关卡边界的完整清理（切关前 / 舞台按关重挂载）：同步清定时器，快照
   * 与判定全部回到初始值。不得用 stop() 代替——stop() 必须保留舞台现状。
   */
  reset(): void {
    this.stop()
    this.state = { x: 0, score: 0, running: false, frames: 0 }
    this.lastJudgment = null
    this.snapshot = emptyGridExecutionSnapshot()
    this.level = null
    this.step = null
    this.stepIndex = null
    this.result = null
  }

  getState(): EngineState {
    return { ...this.state }
  }

  /**
   * 恢复草稿 / 导入作品时外壳脱离实例调用本方法
   * （lesson-workspace.tsx: `const validator = runAdapter?.validateDraft ?? …`
   * 后直接 `validator(data)`），普通类方法会丢 this，校验会抛错并被外壳
   * 按 fail-closed 判为无效草稿。用箭头函数字段固定实例，任何时候都按
   * 本课把关；forest-hello 的 validateDraft 不读 this，恰好掩盖了这一点。
   */
  readonly validateDraft = (data: unknown): boolean => isValidGridDraft(this.lesson, data)

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getStageState(): Record<string, number | string | boolean> {
    return {
      executionState: this.snapshot.executionState,
      frameIndex: this.snapshot.frameIndex,
      playing: this.snapshot.playing,
      needsGoal: this.snapshot.needsGoal,
      stepIndex: this.snapshot.stepIndex ?? -1,
    }
  }

  /** 舞台插槽经路由 context 读取的完整快照（含真实运行帧）。 */
  getExecutionSnapshot(): GridExecutionSnapshot {
    return this.snapshot
  }

  getLastRunError(): string | null {
    return null
  }

  private assignJudgment(): void {
    if (!this.result || !this.step) {
      this.lastJudgment = null
      return
    }
    this.lastJudgment = buildGridJudgment(this.lesson, this.step, this.result)
  }

  private finishImmediately(onEvent: (event: RunEvent) => void): void {
    const run = this.result
    const level = this.level
    if (!run || !level) return
    this.assignJudgment()
    this.snapshot = {
      ...this.snapshot,
      executionState: run.passed ? 'success' : 'error',
      playing: false,
      frameIndex: 0,
    }
    this.state = {
      x: level.start.x,
      score: run.passed ? 1 : 0,
      running: false,
      frames: 0,
    }
    onEvent({ kind: 'finished', state: { ...this.state } })
  }

  private scheduleFrame(index: number, onEvent: (event: RunEvent) => void): void {
    this.timer = setTimeout(() => {
      this.timer = null
      const frames = this.snapshot.run?.frames ?? []
      if (index < frames.length) {
        this.emitFrame(index, onEvent)
        if (index + 1 < frames.length) {
          this.scheduleFrame(index + 1, onEvent)
        } else {
          this.finishRun(onEvent)
        }
      } else {
        this.finishRun(onEvent)
      }
    }, GRID_FRAME_MS)
  }

  private emitFrame(index: number, onEvent: (event: RunEvent) => void): void {
    const frame = this.snapshot.run?.frames[index]
    if (!frame) return
    this.snapshot = { ...this.snapshot, frameIndex: index }
    this.state = { x: frame.x, score: 0, running: true, frames: index + 1 }
    onEvent({ kind: 'frame', state: { ...this.state } })
  }

  private finishRun(onEvent: (event: RunEvent) => void): void {
    const run = this.result
    if (!run) return
    // 判定只在播放结束时赋值：播放中 getJudgmentResult() 为 null/旧值。
    this.assignJudgment()
    this.snapshot = {
      ...this.snapshot,
      executionState: run.passed ? 'success' : 'error',
      playing: false,
      frameIndex: Math.max(run.frames.length - 1, 0),
    }
    this.state = {
      x: run.final.x,
      score: run.passed ? 1 : 0,
      running: false,
      frames: run.frames.length,
    }
    onEvent({ kind: 'finished', state: { ...this.state } })
  }
}

/**
 * 路由必需的 adapter prop 载体：壳对 engine='slot' 不挂载它
 * （mount/unmount 均为空实现），run() 立即 finished 仅作接口完整。
 */
export class GridAdapter implements EngineAdapter {
  private readonly lesson: GridLesson
  private draft: GridSlotData

  constructor(lesson: GridLesson, initial?: unknown) {
    this.lesson = lesson
    this.draft =
      initial === undefined ? { ...emptyDraftOf(lesson) } : coerceGridDraft(lesson, initial)
  }

  mount(): void {
    // 插槽课不挂载命令式适配器；实例仅作路由必需的 adapter prop 与测试载体。
  }

  unmount(): void {
    // 无挂载副作用，无需清理。
  }

  loadScript(script: unknown): void {
    this.draft = coerceGridDraft(this.lesson, script)
  }

  getScript(): unknown {
    return this.draft
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }

  run(onEvent: (event: RunEvent) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: nothing is playing to cancel.
  }

  /**
   * 与 GridRunAdapter.validateDraft 同理：外壳恢复 / 导入时脱离实例调用，
   * 用箭头函数字段固定实例，绝不因为丢了 this 把好草稿判成无效。
   */
  readonly validateDraft = (script: unknown): boolean => isValidGridDraft(this.lesson, script)

  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  getJudgmentResult(): JudgmentResult | null {
    // slot 路径下外壳永不读取本方法（读 runAdapter 的），不得冒充。
    return null
  }
}

/** 空草稿（避免与 draft 模块循环依赖时的轻量构造：与 emptyGridDraft 同形）。 */
function emptyDraftOf(lesson: GridLesson): GridSlotData {
  return {
    version: 1,
    lessonId: lesson.id,
    stepIndex: 0,
    programs: Object.fromEntries(lesson.steps.map((step) => [step.id, gridStarterProgram(step)])),
    passed: [],
    failures: 0,
  }
}
