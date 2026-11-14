/**
 * G1-U1-L02 运行适配器：课程自有 SlotRunAdapter + 薄 EngineAdapter。
 *
 * 照抄 G1-U1-L01 的 StoryRunAdapter 结构（先停旧 run → 复位 → 同步判定 →
 * 逐帧 frame（450ms/帧）→ finished；空帧直接 finished；播放结束才赋值
 * lastJudgment），只改 L02 语义：
 * - 判定走 judgeTurnTakingProgram（期望对白由 contract 的 G1_EXPECTED_LINES
 *   注入：狐狸“你好” → 兔子“很高兴见到你”），三层呈现走
 *   buildTurnTakingJudgment。
 * - 本课无移动：帧的 foxPosition / rabbitPosition 恒为 0，EngineState.x
 *   恒为 0；舞台状态多一个 rabbitX（与 foxX 同为 0，固定左右并排站位）。
 * - stop()：同步清定时器，running=false，保留脚本与当前舞台状态，
 *   不发 finished；不得遗留定时器 / 待回调。
 * - getState() 永不抛错。validateDraft = isValidStoryDraft（数据所有者
 *   优先，OPS-028 3d）。getJudgmentResult() 返回 lastJudgment（只在播放
 *   结束——或空帧直接 finished——时赋值；播放中返回旧值/null，Q8）。
 * - getStageState() 返回 {foxX, rabbitX, speaker, bubble, frameIndex} 纯数据。
 * - getLastRunError() 返回 null（同步判定不抛错；未知积木是失败结果，
 *   不是运行错误）。
 * - score 只是 EngineState 必填字段的当次通过位（通过 1 / 失败 0），
 *   本课无累计分概念，不得在 UI 上渲染为“得分”或排行榜。
 *
 * TurnTakingAdapter implements EngineAdapter：路由必需的 adapter prop 载体。
 * 壳对 engine='slot' 不挂载它（mount/unmount 均为空实现）；其 run() 立即
 * finished 仅作接口完整，壳在 slot 路径下不调用它——外壳读的是
 * runAdapter 的 runProgram / getJudgmentResult。validateDraft 与
 * getFileCapabilities 作后备（runAdapter 已有 validateDraft 时外壳优先
 * 用 runAdapter 的）。
 */
import { G1_U1_L02_STORY_LESSON } from '@/content/curriculum/g1-u1-story-lessons'
import type {
  EngineAdapter,
  EngineState,
  RunEvent,
  SlotRunAdapter,
} from '@/features/lessons/workspace/workspace-adapters'
import type { FileCapabilities, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import type { ProgramBlock } from '@/features/lessons/blockly/program-tree'

import { G1_EXPECTED_LINES } from './g1-u1-l02-contract'
import { coerceStoryDraft, emptyStoryDraft, isValidStoryDraft, type StorySlotData } from './g1-u1-l02-draft'
import {
  buildTurnTakingJudgment,
  judgeTurnTakingProgram,
  type TurnTakingFrame,
  type TurnTakingJudgeResult,
} from './g1-u1-l02-judging'

export const TURN_TAKING_FRAME_MS = 450

/** 当前关的程序：只取 programs[stepIndex]，不得用别关的程序。 */
export function currentTurnTakingProgram(data: StorySlotData): ProgramBlock[] {
  const step = G1_U1_L02_STORY_LESSON.steps[data.stepIndex]
  return data.programs[step.id] ?? []
}

export class TurnTakingRunAdapter implements SlotRunAdapter {
  private timer: ReturnType<typeof setTimeout> | null = null
  private state: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  private lastJudgment: JudgmentResult | null = null
  private lastStageState: Record<string, number | string | boolean> = {
    foxX: 0,
    rabbitX: 0,
    speaker: '',
    bubble: '',
    frameIndex: 0,
  }
  private frames: TurnTakingFrame[] = []
  private result: TurnTakingJudgeResult | null = null
  private lastSpeaker: 'fox' | 'rabbit' | '' = ''
  private lastBubble = ''

  runProgram(program: unknown, onEvent: (event: RunEvent) => void): void {
    // 先停掉旧 run：同一时刻至多一个 live run，新 run 替换并停止旧 run。
    this.stop()
    const data = coerceStoryDraft(program)
    const result = judgeTurnTakingProgram(currentTurnTakingProgram(data), G1_EXPECTED_LINES)
    this.result = result
    this.frames = result.frames
    this.lastSpeaker = ''
    this.lastBubble = ''
    this.lastStageState = { foxX: 0, rabbitX: 0, speaker: '', bubble: '', frameIndex: 0 }
    if (result.frames.length === 0) {
      // 空帧直接 finished，不伪造播放；判定在 finished 事件发出前赋值。
      this.state = { x: 0, score: result.passed ? 1 : 0, running: false, frames: 0 }
      this.lastJudgment = buildTurnTakingJudgment(result)
      onEvent({ kind: 'finished', state: { ...this.state } })
      return
    }
    this.state = { x: 0, score: 0, running: true, frames: 0 }
    this.emitFrame(0, onEvent)
    this.scheduleStep(1, onEvent)
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    if (this.state.running) {
      this.state = { ...this.state, running: false }
    }
  }

  getState(): EngineState {
    return { ...this.state }
  }

  validateDraft(data: unknown): boolean {
    return isValidStoryDraft(data)
  }

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getStageState(): Record<string, number | string | boolean> {
    return { ...this.lastStageState }
  }

  getLastRunError(): string | null {
    return null
  }

  private emitFrame(index: number, onEvent: (event: RunEvent) => void): void {
    const frame = this.frames[index]
    if (!frame) return
    if (frame.kind === 'say') {
      this.lastSpeaker = frame.actor
      this.lastBubble = frame.text ?? ''
    }
    this.lastStageState = {
      foxX: frame.foxPosition,
      rabbitX: frame.rabbitPosition,
      speaker: this.lastSpeaker,
      bubble: this.lastBubble,
      frameIndex: index,
    }
    this.state = { x: 0, score: 0, running: true, frames: index + 1 }
    onEvent({ kind: 'frame', state: { ...this.state } })
  }

  private scheduleStep(nextIndex: number, onEvent: (event: RunEvent) => void): void {
    this.timer = setTimeout(() => {
      this.timer = null
      if (nextIndex < this.frames.length) {
        this.emitFrame(nextIndex, onEvent)
        this.scheduleStep(nextIndex + 1, onEvent)
      } else {
        this.finishRun(onEvent)
      }
    }, TURN_TAKING_FRAME_MS)
  }

  private finishRun(onEvent: (event: RunEvent) => void): void {
    const result = this.result
    if (!result) return
    // 判定只在播放结束时赋值（Q8）：播放中 getJudgmentResult() 为旧值/null。
    this.lastJudgment = buildTurnTakingJudgment(result)
    this.state = {
      x: 0,
      score: result.passed ? 1 : 0,
      running: false,
      frames: this.frames.length,
    }
    this.lastStageState = {
      ...this.lastStageState,
      foxX: 0,
      rabbitX: 0,
      frameIndex: Math.max(this.frames.length - 1, 0),
    }
    onEvent({ kind: 'finished', state: { ...this.state } })
  }
}

export class TurnTakingAdapter implements EngineAdapter {
  private draft: StorySlotData

  constructor(initial?: unknown) {
    this.draft = initial === undefined ? emptyStoryDraft() : coerceStoryDraft(initial)
  }

  mount(): void {
    // 插槽课不挂载命令式适配器（外壳对 engine='slot' 同样跳过挂载）；
    // 实例仅作路由必需的 adapter prop 与测试载体。
  }

  unmount(): void {
    // 无挂载副作用，无需清理。
  }

  loadScript(script: unknown): void {
    this.draft = coerceStoryDraft(script)
  }

  getScript(): unknown {
    return this.draft
  }

  getState(): EngineState {
    return { x: 0, score: 0, running: false, frames: 0 }
  }

  /**
   * 仅作接口完整：壳对 slot 引擎不调用它（外壳读 runAdapter 的
   * runProgram）。真正的运行走 TurnTakingRunAdapter。
   */
  run(onEvent: (event: RunEvent) => void): void {
    onEvent({ kind: 'finished', state: this.getState() })
  }

  stop(): void {
    // Intentionally empty: nothing is playing to cancel.
  }

  validateDraft(script: unknown): boolean {
    return isValidStoryDraft(script)
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
