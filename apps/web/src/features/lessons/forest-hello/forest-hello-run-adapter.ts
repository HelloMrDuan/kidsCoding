/**
 * lesson-01-forest-hello 运行适配器：课程自有 SlotRunAdapter + 薄 EngineAdapter。
 *
 * ForestRunAdapter implements SlotRunAdapter，是本课唯一的运行状态与
 * 判定来源（裁定 3）：外壳的运行按钮（ws-run-toggle / shell.run()）
 * 是唯一运行入口；PlayableStage 在 external 模式下只渲染本适配器的
 * 执行快照，不跑自己的执行器、不产生第二份运行状态与判定。
 *
 * 执行语义复用旧课堂的既有纯函数（与 useBlockExecutor 同一套）：
 * - 能否运行、走几步：judgeForestStep（内含 simulateProgram 与
 *   evaluateObservable）；每块移动积木一帧，330ms/帧（与执行器同拍）。
 * - runProgram(program, onEvent)：先停旧 run；同步判定当前关程序；
 *   无帧直接 finished（不伪造播放，判定在 finished 前赋值）；有帧按
 *   330ms/帧发 frame 事件，播完发 finished。
 * - stop()：同步清定时器，running=false，保留脚本与当前舞台状态，
 *   不发 finished；不得遗留定时器 / 待回调。
 * - reset()（OPS-045）：切关清理——快照与判定归属于跑过它的那
 *   一关，进入新关时必须回到 idle；否则上一关的 'success'/'error'
 *   快照泄漏到新关，PlayableStage 在 predict 模式下以 executionState
 *   非 idle/非 error 锁住预测按钮（practiceLocked），且完成门控因缺
 *   少 practiceAnswer 而阻塞。与 stop() 不同：stop() 只取消正在播放
 *   的 run 并保留舞台状态（F2/F3 要求）；reset() 是关卡边界的完整
 *   清理，由插槽在 goToStep 与舞台挂载时调用。
 * - getState() 永不抛错。validateDraft = isValidForestDraft（数据所有者
 *   优先，OPS-028 3d）。getJudgmentResult() 返回 lastJudgment（只在播放
 *   结束——或无帧直接 finished——时赋值；播放中返回旧值/null）。
 * - getExecutionSnapshot() 返回舞台渲染用的完整快照（含逐块动作日志）；
 *   getStageState() 是同一快照的标量镜像（供外壳 stageState 直通）。
 * - getLastRunError() 返回 null（同步判定不抛错；未知积木是失败结果，
 *   不是运行错误）。
 * - 设计错误实验的“已观察”状态是会话内状态（与旧课堂一致，不持久化），
 *   由路由经构造参数传入读取函数；不传时一律视为未观察。
 * - F2/F3（停止绑定真正正在运行的旧目标、切换/卸载 best-effort 停止旧
 *   目标）是外壳的职责；适配器的 stop() 必须是同步取消，单测覆盖
 *   运行/停止/重跑（停止后脚本原样、重跑结论一致）。
 * - score 只是 EngineState 必填字段的当次通过位（通过 1 / 失败 0），
 *   本课无累计分概念，不得在 UI 上渲染为“得分”或排行榜。
 *
 * ForestAdapter implements EngineAdapter：路由必需的 adapter prop 载体。
 * 壳对 engine='slot' 不挂载它（mount/unmount 均为空实现）；其 run() 立即
 * finished 仅作接口完整，壳在 slot 路径下不调用它——外壳读的是
 * runAdapter 的 runProgram / getJudgmentResult。validateDraft 与
 * getFileCapabilities 作后备（runAdapter 已有 validateDraft 时外壳优先
 * 用 runAdapter 的）。
 */
import type {
  BlockCategory,
  BlockInventoryItem,
  EngineAdapter,
  EngineState,
  RunEvent,
  SlotRunAdapter,
} from '@/features/lessons/workspace/workspace-adapters'
import type { FileCapabilities, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'
import { getKidsBlockLabel } from '@/features/lessons/blockly/block-labels'
import {
  buildKidsToolboxCategories,
  SCRATCH_CATEGORY_COLOURS,
} from '@/features/lessons/blockly/register-kids-blocks'

import {
  findForestWorkspace,
  insertForestBlock,
  selectForestCategory,
} from './forest-hello-blockly-ops'

import {
  coerceForestDraft,
  emptyForestDraft,
  FOREST_STEP_IDS,
  isValidForestDraft,
  type ForestSlotData,
} from './forest-hello-draft'
import {
  buildForestJudgment,
  judgeForestStep,
  type ForestFrame,
  type ForestJudgeResult,
} from './forest-hello-judging'

/** 每块积木一帧的节拍（与旧课堂 useBlockExecutor 的每块 330ms 同拍）。 */
export const FOREST_FRAME_MS = 330

export type ForestExecutionState = 'idle' | 'running' | 'success' | 'error'

/** 舞台渲染用的执行快照（纯数据；本课狐狸从不说话，message 恒为 null）。 */
export type ForestExecutionSnapshot = {
  executionState: ForestExecutionState
  foxPosition: number
  message: string | null
  actionLog: string[]
  frameIndex: number
  designedMistake: boolean
}

export function emptyForestExecutionSnapshot(): ForestExecutionSnapshot {
  return {
    executionState: 'idle',
    foxPosition: 0,
    message: null,
    actionLog: [],
    frameIndex: 0,
    designedMistake: false,
  }
}

/** 当前关的程序：只取 programs[stepIndex]，不得用别关的程序。 */
export function currentForestProgram(data: ForestSlotData) {
  const stepId = FOREST_STEP_IDS[Math.min(Math.max(data.stepIndex, 0), FOREST_STEP_IDS.length - 1)]
  return data.programs[stepId] ?? []
}

export class ForestRunAdapter implements SlotRunAdapter {
  private timer: ReturnType<typeof setTimeout> | null = null
  private state: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  private lastJudgment: JudgmentResult | null = null
  private snapshot: ForestExecutionSnapshot = emptyForestExecutionSnapshot()
  private frames: ForestFrame[] = []
  private result: ForestJudgeResult | null = null
  private isStepObserved: (stepId: string) => boolean

  constructor(options?: { isStepObserved?: (stepId: string) => boolean }) {
    this.isStepObserved = options?.isStepObserved ?? (() => false)
  }

  runProgram(program: unknown, onEvent: (event: RunEvent) => void): void {
    // 先停掉旧 run：同一时刻至多一个 live run，新 run 替换并停止旧 run。
    this.stop()
    const data = coerceForestDraft(program)
    const stepIndex = data.stepIndex
    this.lastStepIndex = stepIndex
    const stepId = FOREST_STEP_IDS[stepIndex]
    const result = judgeForestStep(currentForestProgram(data), stepIndex, this.isStepObserved(stepId))
    this.result = result
    this.frames = result.frames
    this.snapshot = {
      executionState: 'running',
      foxPosition: 0,
      message: null,
      actionLog: [],
      frameIndex: 0,
      designedMistake: result.designedMistake,
    }
    if (result.frames.length === 0) {
      // 无帧直接 finished，不伪造播放；判定在 finished 事件发出前赋值。
      this.finishImmediately(onEvent)
      return
    }
    this.state = { x: 0, score: 0, running: true, frames: 0 }
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
      this.snapshot = { ...this.snapshot, executionState: 'idle' }
    }
  }

  /**
   * 切关清理（OPS-045）：同步停定时器，快照、判定、帧与状态全
   * 部回到初始值。调用点：插槽 goToStep（切关前）与舞台按关重挂载
   * 时。不得用 stop() 代替——stop() 必须保留舞台状态（F2/F3）。
   */
  reset(): void {
    this.stop()
    this.state = { x: 0, score: 0, running: false, frames: 0 }
    this.lastJudgment = null
    this.snapshot = emptyForestExecutionSnapshot()
    this.frames = []
    this.result = null
  }

  getState(): EngineState {
    return { ...this.state }
  }

  validateDraft(data: unknown): boolean {
    return isValidForestDraft(data)
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getStageState(): Record<string, number | string | boolean> {
    return {
      foxX: this.snapshot.foxPosition,
      executionState: this.snapshot.executionState,
      frameIndex: this.snapshot.frameIndex,
      actionLogLines: this.snapshot.actionLog.length,
      designedMistake: this.snapshot.designedMistake,
    }
  }

  /** 舞台插槽经路由 context 读取的完整快照（含逐块动作日志数组）。 */
  getExecutionSnapshot(): ForestExecutionSnapshot {
    return { ...this.snapshot, actionLog: [...this.snapshot.actionLog] }
  }

  getLastRunError(): string | null {
    return null
  }

  private finishImmediately(onEvent: (event: RunEvent) => void): void {
    const result = this.result
    if (!result) return
    this.lastJudgment = buildForestJudgment(result, this.lastStepIndex)
    this.snapshot = {
      executionState: result.passed ? 'success' : 'error',
      foxPosition: result.foxPosition,
      message: null,
      actionLog: result.frames.map(() => '向右走 100 步'),
      frameIndex: 0,
      designedMistake: result.designedMistake,
    }
    this.state = { x: result.foxPosition, score: result.passed ? 1 : 0, running: false, frames: 0 }
    onEvent({ kind: 'finished', state: { ...this.state } })
  }

  /** 最近一次 runProgram 的关号（判定分层用；finish 时读取）。 */
  private lastStepIndex = 0

  private scheduleFrame(index: number, onEvent: (event: RunEvent) => void): void {
    this.timer = setTimeout(() => {
      this.timer = null
      if (index < this.frames.length) {
        this.emitFrame(index, onEvent)
        if (index + 1 < this.frames.length) {
          this.scheduleFrame(index + 1, onEvent)
        } else {
          this.finishRun(onEvent)
        }
      } else {
        this.finishRun(onEvent)
      }
    }, FOREST_FRAME_MS)
  }

  private emitFrame(index: number, onEvent: (event: RunEvent) => void): void {
    const frame = this.frames[index]
    if (!frame) return
    this.snapshot = {
      ...this.snapshot,
      foxPosition: frame.foxPosition,
      actionLog: [...this.snapshot.actionLog, '向右走 100 步'],
      frameIndex: index,
    }
    this.state = { x: frame.foxPosition, score: 0, running: true, frames: index + 1 }
    onEvent({ kind: 'frame', state: { ...this.state } })
  }

  private finishRun(onEvent: (event: RunEvent) => void): void {
    const result = this.result
    if (!result) return
    // 判定只在播放结束时赋值：播放中 getJudgmentResult() 为旧值/null。
    this.lastJudgment = buildForestJudgment(result, this.lastStepIndex)
    this.snapshot = {
      ...this.snapshot,
      executionState: result.passed ? 'success' : 'error',
      foxPosition: result.foxPosition,
      frameIndex: Math.max(this.frames.length - 1, 0),
    }
    this.state = {
      x: result.foxPosition,
      score: result.passed ? 1 : 0,
      running: false,
      frames: this.frames.length,
    }
    onEvent({ kind: 'finished', state: { ...this.state } })
  }
}

/**
 * V3：外壳分类栏 / 素材清单的能力桥。由路由按会话状态提供“当前关允许
 * 的积木”；适配器据此从与真实工具箱同一构建器（buildKidsToolboxCategories）
 * 派生分类，分类与 flyout 永不矛盾。没有桥（如单测直接构造）时能力
 * 方法一律返回空/false，外壳不显示分类栏——绝不凭空造分类。
 */
export interface ForestWorkspaceBridge {
  getAllowedBlocks: () => string[]
}

export class ForestAdapter implements EngineAdapter {
  private draft: ForestSlotData
  private readonly bridge?: ForestWorkspaceBridge

  constructor(initial?: unknown, bridge?: ForestWorkspaceBridge) {
    this.draft = initial === undefined ? emptyForestDraft() : coerceForestDraft(initial)
    this.bridge = bridge
  }

  private allowedBlocks(): string[] {
    return this.bridge?.getAllowedBlocks() ?? []
  }

  /** 插槽内嵌的真实 Blockly 工作区（页面上唯一的非 flyout 工作区）。 */
  private liveWorkspace() {
    if (typeof document === 'undefined') return null
    return findForestWorkspace(document.body)
  }

  /**
   * V3：外壳分类栏的数据来源——与 BlocklyAdapter 同款派生（同一工具箱
   * 构建器），分类 id 即分类名，与工具箱项一一对应。
   */
  getBlockCategories(): BlockCategory[] {
    // 与插槽内 BlocklyWorkspace 的 Scratch 主题变体同色（开始 #FFBF00、
    // 移动 #4C97FF），分类栏圆点与 flyout 分类色一致。
    return buildKidsToolboxCategories(this.allowedBlocks(), SCRATCH_CATEGORY_COLOURS).map((category) => ({
      id: category.name,
      label: category.name,
      color: category.colour,
    }))
  }

  /** V3：分类栏点击落到插槽真实工作区的工具箱选中态（flyout 随之打开）。 */
  selectCategory(id: string): string | null {
    const workspace = this.liveWorkspace()
    if (!workspace) return null
    return selectForestCategory(workspace, id)
  }

  /** V3：素材清单（搜索用）：每个允许积木一条，标签取积木自身文案。 */
  getBlockInventory(): BlockInventoryItem[] {
    const categories = buildKidsToolboxCategories(this.allowedBlocks())
    const categoryOf = new Map<string, string>()
    for (const category of categories) {
      for (const type of category.types) categoryOf.set(type, category.name)
    }
    return this.allowedBlocks().map((type) => ({
      type,
      label: getKidsBlockLabel(type),
      categoryId: categoryOf.get(type) ?? '更多',
    }))
  }

  /** V3：经真实工作区 API 插入一块积木；不允许或无工作区时如实返回 false。 */
  insertBlock(type: string): boolean {
    if (!this.allowedBlocks().includes(type)) return false
    const workspace = this.liveWorkspace()
    if (!workspace) return false
    return insertForestBlock(workspace, type)
  }

  mount(): void {
    // 插槽课不挂载命令式适配器（外壳对 engine='slot' 同样跳过挂载）；
    // 实例仅作路由必需的 adapter prop 与测试载体。
  }

  unmount(): void {
    // 无挂载副作用，无需清理。
  }

  loadScript(script: unknown): void {
    this.draft = coerceForestDraft(script)
  }

  getScript(): unknown {
    return this.draft
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }

  /**
   * 仅作接口完整：壳对 slot 引擎不调用它（外壳读 runAdapter 的
   * runProgram）。真正的运行走 ForestRunAdapter。
   */
  run(onEvent: (event: RunEvent) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: nothing is playing to cancel.
  }

  validateDraft(script: unknown): boolean {
    return isValidForestDraft(script)
  }

  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  getJudgmentResult(): JudgmentResult | null {
    // slot 路径下外壳永不读取本方法（读 runAdapter 的）；返回 null 表示
    // 本适配器不产生判定，不得冒充。
    return null
  }
}
