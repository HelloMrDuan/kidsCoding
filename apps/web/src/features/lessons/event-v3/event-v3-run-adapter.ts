/**
 * OPS-053：G0-U2 事件课的运行适配器（SlotRunAdapter）+ 薄 EngineAdapter。
 *
 * 与 grid-v3 同一架构：本适配器是本课“运行检查”唯一的运行状态与判定来源；
 * 外壳的运行按钮是唯一运行入口，舞台插槽只渲染适配器的执行快照，不跑自己的
 * 播放器（旧的 useEventPlayback 有独立计时器，在 V3 里会让舞台出现第二个时钟，
 * 故不复用）。自由试玩（按开始旗 / 点角色）不产生判定：没有鼓的关由舞台插槽直接
 * 调用 runEventProgram 即时显示，与旧课堂一致；能敲鼓的关（G0-U3-L06）走本适配器的
 * playFree()，与运行检查同一个引擎、同一个 520ms 节拍计时器、同一个 EventDrumKit，
 * 逐拍揭示并逐拍出声，不写判定、不改草稿（不记通过、不加进度）。
 *
 * 执行语义与旧课堂真实一致：
 * - 脚本来自外壳交来的整份草稿（coerceEventDraft + 当前关每个可编辑角色的程序；
 *   不可编辑角色执行本关固定的初始脚本），与旧 event-lab 的 stepScripts 同一规则。
 * - 创意关未选角色（needsPick）时不运行、不产生判定，直接 finished。
 * - checkEventGoal(resolveEventGoal(step, target)) 是唯一判定：依次按开始旗、
 *   点目标要求的角色，再点探针角色，舞台每一步都必须与目标一致。
 * - 每步 520ms（与旧课堂 useEventPlayback 一致）；表演舞台（parallel）同一拍的
 *   动作一起出现（与旧课堂 beatSteps 一致）。
 * - 无动作运行（缺事件积木、触发了却没反应等）同步 finished，不伪造播放。
 * - 错误实验：本次运行若跑出预想的错误即视为“亲眼看到”；还没看到错误就跑通，
 *   判定为未通过（与旧课堂“先按原样运行检查一次”的规则一致），舞台显示原因。
 * - stop() 只取消播放、保留舞台现状；reset() 是关卡边界的完整清理。
 * - OPS-055（G0-U3-L06）：鼓声由 EventDrumKit 用 Web Audio 现场合成。AudioContext 在
 *   runProgram 内创建或恢复（外壳在运行按钮的点击回调里同步调用 runProgram，属用户手势）；
 *   每揭示一拍，对这一拍的 drum_beat 动作各敲一下，声音与动作同一个计时器；stop()、
 *   reset()、dispose() 与下一次 runProgram 都先释放全部鼓声节点，停止后不再出声。
 * - getJudgmentResult() 只在本次运行结束时赋值；每次 runProgram 开始时清空。
 *
 * 本模块不 import event-lab.tsx / event-stage.tsx（客户端组件，带 Blockly 与
 * 角色美术依赖），以免把它们拉进 SSR 与单元测试；stepScripts、
 * describeInteractions、beatSteps、失败短名在此按旧课堂原逻辑重写（各约十行）。
 */
import { resolveEventGoal, type EventLesson, type EventLessonStep } from '@/content/curriculum/g0-u2-event-lessons'
import type {
  EngineAdapter,
  EngineState,
  RunEvent,
  SlotRunAdapter,
} from '@/features/lessons/workspace/workspace-adapters'
import type { FileCapabilities, JudgmentResult } from '@/features/lessons/workspace/workspace-slots'

import {
  checkEventGoal,
  type EventActorId,
  type EventBlock,
  type EventCheck,
  type EventEffect,
  type EventFailure,
  type EventInteraction,
  type EventLevel,
  type EventScripts,
  runEventProgram,
} from '../event/event-engine'
import { EventDrumKit } from './event-v3-audio'
import { coerceEventDraft, emptyEventDraft, eventCurrentStep, isValidEventDraft, type EventSlotData } from './event-v3-draft'

/** 每步节拍：与旧课堂 useEventPlayback 默认 520ms 一致。 */
export const EVENT_FRAME_MS = 520

/** 失败短名（与旧课堂 event-lab 的 EVENT_MISTAKE_LABELS 逐字一致）。 */
export const EVENT_V3_MISTAKE_LABELS = {
  no_hat: '忘了事件积木',
  hat_not_on_top: '事件没放在最上面',
  disconnected: '有积木掉队',
  unknown_block: '用了这关没有的积木',
  cannot_do: '角色做不了这个动作',
  loop: '铃铛响个不停',
  too_early: '还没触发就先动了',
  nothing_happened: '触发了却没反应',
  wrong_actor: '动的不是要动的角色',
  wrong_order: '动作顺序反了',
  missing_effect: '少了一个动作',
  extra_effect: '多了不该有的动作',
  wrong_trigger: '点错角色也有反应',
  empty_repeat: '重复里面是空的',
  out_of_sync: '有角色没跟上节奏',
  left_glowing: '表演完灯还亮着',
} as const satisfies Record<EventFailure, string>

export type EventExecutionState = 'idle' | 'running' | 'success' | 'error'

/**
 * 舞台渲染用的执行快照（纯数据）。check 为 null 表示还没跑过检查或已 reset；
 * stepOf[i] 是第 i 个动作所在的播放步，shown 步之前的动作已揭示。
 */
export type EventExecutionSnapshot = {
  stepId: string | null
  stepIndex: number | null
  executionState: EventExecutionState
  needsPick: boolean
  playing: boolean
  check: EventCheck | null
  stepOf: number[]
  shown: number
  total: number
  level: EventLevel | null
  /** 本次检查依次做的交互（孩子看得懂的说明）。 */
  checkPlan: string
  /** 错误实验：本次运行跑出了预想的错误（亲眼看到）。 */
  observedNow: boolean
}

export function emptyEventExecutionSnapshot(): EventExecutionSnapshot {
  return {
    stepId: null,
    stepIndex: null,
    executionState: 'idle',
    needsPick: false,
    playing: false,
    check: null,
    stepOf: [],
    shown: 0,
    total: 0,
    level: null,
    checkPlan: '',
    observedNow: false,
  }
}

/**
 * 自由试玩快照（只用于能敲鼓的关）：不含判定。effects 是本次试玩全部交互的真实引擎动作，
 * 之前的交互已经演过，直接显示；只有最新一次交互的动作逐拍揭示、逐拍出声。
 */
export type EventFreePlaySnapshot = {
  stepId: string | null
  effects: EventEffect[]
  stepOf: number[]
  shown: number
  total: number
  playing: boolean
}

export function emptyEventFreePlaySnapshot(): EventFreePlaySnapshot {
  return { stepId: null, effects: [], stepOf: [], shown: 0, total: 0, playing: false }
}

/** 自由试玩已揭示的动作。 */
export function visibleFreeEffects(snapshot: EventFreePlaySnapshot): EventEffect[] {
  return snapshot.effects.filter((_, i) => (snapshot.stepOf[i] ?? 0) < snapshot.shown)
}

/** 这一关有没有能敲鼓的角色（只有这样的关才创建 AudioContext、才逐拍自由试玩）。 */
export function eventLevelCanDrum(level: EventLevel): boolean {
  return level.actors.some((actor) => actor.can.includes('drum_beat'))
}

/** 已揭示的动作（舞台按它渲染角色状态）。 */
export function visibleEffects(snapshot: EventExecutionSnapshot): EventEffect[] {
  if (!snapshot.check) return []
  return snapshot.check.run.effects.filter((_, i) => (snapshot.stepOf[i] ?? 0) < snapshot.shown)
}

export function eventActorName(step: EventLessonStep, id?: EventActorId): string {
  return step.level.actors.find((actor) => actor.id === id)?.name ?? ''
}

/** 孩子看得懂的交互说明（与旧课堂 describeInteractions 同一措辞）。 */
export function describeEventInteractions(step: EventLessonStep, interactions: EventInteraction[]): string {
  return interactions
    .map((interaction) => (interaction.kind === 'start' ? '按开始旗' : `点${eventActorName(step, interaction.actor)}`))
    .join(' → ')
}

/** 一关真正运行的脚本：可编辑角色用孩子拼的（缺省为初始脚本），其余角色执行固定初始脚本。 */
export function eventStepScripts(step: EventLessonStep, data: Pick<EventSlotData, 'programs'>): EventScripts {
  const scripts: EventScripts = {}
  for (const [id, blocks] of Object.entries(step.starter ?? {}) as Array<[EventActorId, EventBlock[]]>) {
    if (!step.editable.includes(id) && blocks.length) scripts[id] = blocks
  }
  for (const id of step.editable) {
    const blocks = data.programs[step.id]?.[id] ?? step.starter?.[id]
    if (blocks?.length) scripts[id] = blocks
  }
  return scripts
}

/** 表演舞台：同一交互、同一拍的动作共享一个播放步（与旧课堂 beatSteps 一致）。 */
export function eventBeatSteps(effects: EventEffect[]): number[] {
  const keys = [...new Set(effects.map((e) => e.interaction * 1000 + e.beat))].sort((a, b) => a - b)
  return effects.map((e) => keys.indexOf(e.interaction * 1000 + e.beat))
}

/** 本关目标与检查计划（创意关用孩子选的角色 / 目标）。 */
export function eventStepGoal(step: EventLessonStep, target?: string) {
  const goal = resolveEventGoal(step, target)
  const checkPlan = describeEventInteractions(step, [...goal.expectations.map((e) => e.interaction), ...goal.probes])
  return { goal, checkPlan }
}

export function eventDiagnosis(lesson: EventLesson, failure: EventFailure): string {
  return lesson.diagnoses[failure] ?? EVENT_V3_MISTAKE_LABELS[failure]
}

/**
 * 判定三层（外壳原样展示；措辞属于本适配器）。
 * observed：错误实验关此前或本次已亲眼看到预想的错误（非错误实验恒为 true）。
 */
export function buildEventJudgment(
  lesson: EventLesson,
  step: EventLessonStep,
  check: EventCheck,
  checkPlan: string,
  observed: boolean,
): JudgmentResult {
  const passed = check.passed && observed
  const expectedError = !!step.errorLab && check.failure === step.errorLab.expect
  const diagnosis = check.failure ? eventDiagnosis(lesson, check.failure) : ''
  const who = check.actor ? `（看看${eventActorName(step, check.actor)}的积木）` : ''
  return {
    layers: [
      {
        id: 'stage',
        label: '舞台',
        passed: check.passed,
        detail: check.passed
          ? `检查依次${checkPlan}，每一步舞台都和目标一样。`
          : `检查依次${checkPlan}，舞台和目标不一样：${diagnosis}${who}`,
      },
      {
        id: 'task',
        label: '任务',
        passed,
        detail: passed
          ? '当前关每个角色的程序与真实运行结果一致。'
          : check.passed
            ? '这是错误实验：先按原样运行检查一次，亲眼看看错在哪，再来修。'
            : expectedError
              ? `这是本关预想的错误：${step.errorLab!.actual}`
              : '本次运行检查还没达到这一关的目标。',
      },
      {
        id: 'knowledge',
        label: '知识点',
        passed,
        detail: passed ? `${lesson.concept}：${step.hints[1]}` : check.passed ? lesson.concept : diagnosis,
      },
    ],
    passed,
    conclusion: passed
      ? '本次运行检查通过：舞台真的符合目标。'
      : check.passed
        ? '程序成功了，但这是错误实验：先按原样运行检查一次，看看错在哪。'
        : `本次运行检查未通过：${expectedError ? step.errorLab!.actual : diagnosis}`,
    methodEvidence: `本次运行检查共 ${check.run.effects.length} 个动作。`,
  }
}

export class EventRunAdapter implements SlotRunAdapter {
  private readonly lesson: EventLesson
  private timer: ReturnType<typeof setTimeout> | null = null
  private state: EngineState = { x: 0, score: 0, running: false, frames: 0 }
  private lastJudgment: JudgmentResult | null = null
  private snapshot: EventExecutionSnapshot = emptyEventExecutionSnapshot()
  private step: EventLessonStep | null = null
  private observed = false
  private readonly drums: EventDrumKit
  private freeTimer: ReturnType<typeof setTimeout> | null = null
  private free: EventFreePlaySnapshot = emptyEventFreePlaySnapshot()

  constructor(lesson: EventLesson, drums: EventDrumKit = new EventDrumKit()) {
    this.lesson = lesson
    this.drums = drums
  }

  runProgram(program: unknown, onEvent: (event: RunEvent) => void): void {
    // 同一时刻至多一个 live run：新 run 替换并停止旧 run。
    this.stop()
    // 旧判定不得被本次 finished 回放（needsPick 不产生判定）。
    this.lastJudgment = null
    // 运行检查接管舞台：自由试玩的计时器已在 stop() 里清掉，快照一并清空。
    this.free = emptyEventFreePlaySnapshot()
    // 重复运行不叠加旧声音：上一次的鼓声节点全部释放、计数归零。
    this.drums.beginRun()
    const data = coerceEventDraft(this.lesson, program)
    const step = eventCurrentStep(this.lesson, data)
    const stepIndex = this.lesson.steps.indexOf(step)
    const target = data.creative?.[step.id]?.target
    this.step = step
    // 只有能敲鼓的关才创建 AudioContext；这里仍在运行按钮的点击回调内（用户手势）。
    if (eventLevelCanDrum(step.level)) this.drums.unlock()
    if (step.creative && !target) {
      // 未选角色：不运行、不判定；舞台按关卡初始状态渲染并提示先选好朋友。
      this.observed = false
      this.snapshot = {
        ...emptyEventExecutionSnapshot(),
        stepId: step.id,
        stepIndex,
        needsPick: true,
        level: step.level,
      }
      this.state = { x: 0, score: 0, running: false, frames: 0 }
      onEvent({ kind: 'finished', state: { ...this.state } })
      return
    }
    const { goal, checkPlan } = eventStepGoal(step, target)
    const check = checkEventGoal(step.level, eventStepScripts(step, data), goal.expectations, goal.probes)
    const observedNow = !!step.errorLab && check.failure === step.errorLab.expect
    this.observed = !step.errorLab || observedNow || !!data.observed?.includes(step.id)
    const stepOf = step.level.parallel ? eventBeatSteps(check.run.effects) : check.run.effects.map((_, i) => i)
    const total = stepOf.length ? Math.max(...stepOf) + 1 : 0
    this.snapshot = {
      stepId: step.id,
      stepIndex,
      executionState: 'running',
      needsPick: false,
      playing: true,
      check,
      stepOf,
      shown: 0,
      total,
      level: step.level,
      checkPlan,
      observedNow,
    }
    if (total === 0) {
      // 无动作直接 finished，不伪造播放；判定在 finished 事件前赋值。
      this.finishRun(onEvent)
      return
    }
    this.state = { x: 0, score: 0, running: true, frames: 0 }
    this.scheduleStep(onEvent)
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer)
      this.timer = null
    }
    // 自由试玩的节拍计时器同样取消（停止 / 编辑 / 切关 / 重新运行 / 离开页面都经过这里）。
    if (this.freeTimer !== null) {
      clearTimeout(this.freeTimer)
      this.freeTimer = null
    }
    if (this.free.playing) this.free = { ...this.free, playing: false }
    // 停止后声音与动作一起停：已排好的鼓声节点全部 stop + disconnect。
    this.drums.stopAll()
    if (this.state.running) {
      this.state = { ...this.state, running: false }
    }
    if (this.snapshot.executionState === 'running') {
      this.snapshot = { ...this.snapshot, executionState: 'idle', playing: false }
    }
  }

  /** 关卡边界的完整清理（切关前 / 编辑后 / 舞台按关重挂载）。不得用 stop() 代替。 */
  reset(): void {
    this.stop()
    this.state = { x: 0, score: 0, running: false, frames: 0 }
    this.lastJudgment = null
    this.snapshot = emptyEventExecutionSnapshot()
    this.step = null
    this.observed = false
    this.free = emptyEventFreePlaySnapshot()
    this.drums.beginRun()
  }

  /**
   * 自由试玩（只用于能敲鼓的关，舞台在开始旗 / 角色的点击回调里同步调用，属用户手势）：
   * 真实引擎按 interactions 跑一遍；之前的交互已演过，直接显示；最新一次交互的动作按
   * EVENT_FRAME_MS 逐拍揭示，这一拍的 drum_beat 在揭示时敲响。不产生判定、不改草稿。
   * 每次调用都是一次新的试玩：先释放上一次的计时器与鼓声节点，计数归零（不叠加）。
   * onFrame 每揭示一拍调用一次，结束后再调用一次（让舞台读到发声节点已归零）。
   */
  playFree(step: EventLessonStep, scripts: EventScripts, interactions: EventInteraction[], onFrame: () => void): void {
    this.stop()
    this.drums.beginRun()
    if (!eventLevelCanDrum(step.level) || !interactions.length) {
      this.free = emptyEventFreePlaySnapshot()
      return
    }
    this.drums.unlock()
    const effects = runEventProgram(step.level, scripts, interactions).effects
    const stepOf = step.level.parallel ? eventBeatSteps(effects) : effects.map((_, i) => i)
    const total = stepOf.length ? Math.max(...stepOf) + 1 : 0
    const last = interactions.length - 1
    const fresh = stepOf.filter((_, i) => effects[i].interaction === last)
    const start = fresh.length ? Math.min(...fresh) : total
    this.free = { stepId: step.id, effects, stepOf, shown: start, total, playing: start < total }
    if (start < total) this.scheduleFree(onFrame)
  }

  /** 舞台插槽读取的自由试玩快照（不含判定）。 */
  getFreePlaySnapshot(): EventFreePlaySnapshot {
    return this.free
  }

  /** 离开页面：释放全部鼓声节点并关闭 AudioContext。 */
  dispose(): void {
    this.reset()
    this.drums.dispose()
  }

  getState(): EngineState {
    return { ...this.state }
  }

  /** 外壳恢复 / 导入时脱离实例调用：用箭头函数字段固定实例（同 grid-v3）。 */
  readonly validateDraft = (data: unknown): boolean => isValidEventDraft(this.lesson, data)

  getJudgmentResult(): JudgmentResult | null {
    return this.lastJudgment
  }

  getStageState(): Record<string, number | string | boolean> {
    return {
      executionState: this.snapshot.executionState,
      shown: this.snapshot.shown,
      total: this.snapshot.total,
      playing: this.snapshot.playing,
      needsPick: this.snapshot.needsPick,
      stepIndex: this.snapshot.stepIndex ?? -1,
      drumHits: this.drums.hits,
      drumLiveNodes: this.drums.liveNodes,
      audioSupported: this.drums.supported,
    }
  }

  /** 舞台 data 属性与测试读取：本次运行敲过的鼓、仍在发声的节点数。 */
  getDrumStats(): { hits: number; liveNodes: number; supported: boolean } {
    return { hits: this.drums.hits, liveNodes: this.drums.liveNodes, supported: this.drums.supported }
  }

  /** 舞台插槽经路由 context 读取的完整快照（含真实检查结果）。 */
  getExecutionSnapshot(): EventExecutionSnapshot {
    return this.snapshot
  }

  getLastRunError(): string | null {
    return null
  }

  private scheduleStep(onEvent: (event: RunEvent) => void): void {
    this.timer = setTimeout(() => {
      this.timer = null
      const shown = this.snapshot.shown + 1
      this.snapshot = { ...this.snapshot, shown }
      // 这一拍揭示的鼓点现在敲响：声音与动作同一个计时器、同一拍。
      const effects = this.snapshot.check?.run.effects ?? []
      effects.forEach((effect, i) => {
        if (effect.action === 'drum_beat' && this.snapshot.stepOf[i] === shown - 1) this.drums.hit()
      })
      this.state = { x: shown, score: 0, running: true, frames: shown }
      onEvent({ kind: 'frame', state: { ...this.state } })
      if (shown < this.snapshot.total) this.scheduleStep(onEvent)
      else this.finishRun(onEvent)
    }, EVENT_FRAME_MS)
  }

  private scheduleFree(onFrame: () => void): void {
    this.freeTimer = setTimeout(() => {
      this.freeTimer = null
      const shown = this.free.shown + 1
      const playing = shown < this.free.total
      this.free = { ...this.free, shown, playing }
      // 与运行检查同一规则：这一拍揭示的鼓点现在敲响。
      this.free.effects.forEach((effect, i) => {
        if (effect.action === 'drum_beat' && this.free.stepOf[i] === shown - 1) this.drums.hit()
      })
      onFrame()
      if (playing) {
        this.scheduleFree(onFrame)
        return
      }
      // 演完后再通知一次：最后一下鼓声（0.3 秒）已结束，舞台读到发声节点归零。
      this.freeTimer = setTimeout(() => {
        this.freeTimer = null
        onFrame()
      }, EVENT_FRAME_MS)
    }, EVENT_FRAME_MS)
  }

  private finishRun(onEvent: (event: RunEvent) => void): void {
    const check = this.snapshot.check
    const step = this.step
    if (!check || !step) return
    // 判定只在播放结束时赋值：播放中 getJudgmentResult() 为 null。
    this.lastJudgment = buildEventJudgment(this.lesson, step, check, this.snapshot.checkPlan, this.observed)
    const passed = this.lastJudgment.passed
    this.snapshot = {
      ...this.snapshot,
      executionState: passed ? 'success' : 'error',
      playing: false,
      shown: this.snapshot.total,
    }
    this.state = { x: this.snapshot.total, score: passed ? 1 : 0, running: false, frames: this.snapshot.total }
    onEvent({ kind: 'finished', state: { ...this.state } })
  }
}

/**
 * 路由必需的 adapter prop 载体：壳对 engine='slot' 不挂载它
 * （mount/unmount 均为空实现），run() 立即 finished 仅作接口完整。
 */
export class EventAdapter implements EngineAdapter {
  private readonly lesson: EventLesson
  private draft: EventSlotData

  constructor(lesson: EventLesson, initial?: unknown) {
    this.lesson = lesson
    this.draft = initial === undefined ? emptyEventDraft(lesson) : coerceEventDraft(lesson, initial)
  }

  mount(): void {
    // 插槽课不挂载命令式适配器；实例仅作路由必需的 adapter prop 与测试载体。
  }

  unmount(): void {
    // 无挂载副作用，无需清理。
  }

  loadScript(script: unknown): void {
    this.draft = coerceEventDraft(this.lesson, script)
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

  /** 与 EventRunAdapter.validateDraft 同理：箭头函数字段固定实例。 */
  readonly validateDraft = (script: unknown): boolean => isValidEventDraft(this.lesson, script)

  getFileCapabilities(): FileCapabilities {
    return { canNew: true, canSave: true, canExport: true, canImport: true, canReset: true }
  }

  getJudgmentResult(): JudgmentResult | null {
    // slot 路径下外壳永不读取本方法（读 runAdapter 的），不得冒充。
    return null
  }
}
