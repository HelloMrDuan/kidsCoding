/**
 * SYS-103: Blockly steps (lessons 01–09, single actor) are judged by what the program
 * observably does on stage — trigger, distance walked, scene, where the switch happened,
 * what was said and where — not by matching one exact block sequence.
 *
 * The goal of a step is the observed result of its reference program (requiredBlockTypes),
 * so equivalent programs pass (e.g. "move, move" == "move, repeat"), counter-examples fail,
 * and a program that cannot run never earns completion.
 */
import { resolveSayLine } from './say-line-presets'

/** `line` is the preset id chosen in a say block's dropdown (lesson-02 only; TQ-008). */
export type ProgramBlock = { type: string; disconnected?: boolean; line?: string }

export const MAX_PROGRAM_BLOCKS = 24
export const STEP_DISTANCE = 100

export type ObservedRun = {
  trigger: 'start' | 'click'
  position: number
  scene: 'forest' | 'meadow'
  /** Distance already walked when the story moved to the meadow; null = never switched. */
  sceneSwitchAt: number | null
  message: string | null
  /** Distance at which the (last) line was spoken; null = nothing said. */
  messageAt: number | null
}

/** TQ-008: machine-readable cause of a program that cannot run, mapped to kid copy in run-feedback.ts. */
export type SimulationFailureCode =
  | 'empty'
  | 'too-many-blocks'
  | 'disconnected'
  | 'missing-start'
  | 'extra-start'
  | 'repeat-without-move'
  | 'double-scene-switch'
  | 'unsupported-block'

/** TQ-008: machine-readable first observable difference between goal and actual run. */
export type DifferenceCode =
  | 'needs-click-trigger'
  | 'needs-start-trigger'
  | 'missing-scene-switch'
  | 'extra-scene-switch'
  | 'scene-switch-early'
  | 'scene-switch-late'
  | 'too-few-moves'
  | 'too-many-moves'
  | 'missing-say'
  | 'extra-say'
  | 'wrong-line'
  | 'say-too-early'
  | 'say-too-late'

export type RunFailureCode = SimulationFailureCode | DifferenceCode | 'goal-misconfigured'

export type SimulationResult =
  | { ok: true; observed: ObservedRun }
  | { ok: false; reason: string; code: SimulationFailureCode }

/** Default line a say block speaks when no preset was chosen (forest / meadow / garden). */
export function defaultSayMessage(scene: ObservedRun['scene'], trigger: ObservedRun['trigger']) {
  return scene === 'meadow' ? '我到草地啦！' : trigger === 'click' ? '蝴蝶收到你的点击啦！' : '你好！'
}

/** What a say block actually says: its chosen preset line, otherwise the scene default. */
export function sayMessageFor(block: ProgramBlock, scene: ObservedRun['scene'], trigger: ObservedRun['trigger']) {
  return resolveSayLine(block.line) ?? defaultSayMessage(scene, trigger)
}

export function simulateProgram(blocks: ProgramBlock[]): SimulationResult {
  if (blocks.length === 0) return { ok: false, code: 'empty', reason: '舞台上还没有积木，先放“开始时”。' }
  if (blocks.length > MAX_PROGRAM_BLOCKS) return { ok: false, code: 'too-many-blocks', reason: `一次最多运行 ${MAX_PROGRAM_BLOCKS} 块积木。` }
  if (blocks.some((block) => block.disconnected)) return { ok: false, code: 'disconnected', reason: '有积木没有接在“开始时”下面。请把动作连成一条程序再运行。' }
  const hat = blocks[0].type
  if (hat !== 'when_start' && hat !== 'when_clicked') return { ok: false, code: 'missing-start', reason: '请把“开始时”放在最前面，告诉朋友什么时候行动。' }

  const observed: ObservedRun = { trigger: hat === 'when_clicked' ? 'click' : 'start', position: 0, scene: 'forest', sceneSwitchAt: null, message: null, messageAt: null }
  let moved = false
  for (const block of blocks.slice(1)) {
    switch (block.type) {
      case 'move_right':
        observed.position += STEP_DISTANCE
        moved = true
        break
      case 'repeat_twice':
        if (!moved) return { ok: false, code: 'repeat-without-move', reason: '重复积木前面还没有移动可以重复，先接一块移动积木。' }
        observed.position += STEP_DISTANCE
        break
      case 'switch_scene':
        if (observed.scene === 'meadow') return { ok: false, code: 'double-scene-switch', reason: '已经在草地了，再切换一次不会有新场景。' }
        observed.scene = 'meadow'
        observed.sceneSwitchAt = observed.position
        break
      case 'say_line':
        observed.message = sayMessageFor(block, observed.scene, observed.trigger)
        observed.messageAt = observed.position
        break
      default:
        return block.type === 'when_start' || block.type === 'when_clicked'
          ? { ok: false, code: 'extra-start', reason: '一条程序只要一个开始积木，把多余的拿走吧。' }
          : { ok: false, code: 'unsupported-block', reason: '这块积木还不能在本课执行。' }
    }
  }
  return { ok: true, observed }
}

export type ObservableVerdict = {
  passed: boolean
  goal: ObservedRun | null
  actual: ObservedRun | null
  /** Child-facing explanation of the first observable difference (empty when passed). */
  reason: string
  /** TQ-008: machine-readable cause (null when passed). */
  code: RunFailureCode | null
}

/**
 * TQ-008: per-step judging options. They widen what counts as "the same observable result"
 * when a step's instruction really offers a choice, so honest open choices are not vetoed.
 */
export type JudgeOptions = {
  /** Any of these lines counts as the goal line (lesson-02 preset dialogue). */
  acceptedLines?: readonly string[]
  /** The line may be spoken at any point after the first move, as long as the walk is complete. */
  sayAnyTimeAfterMove?: boolean
}

type Difference = { code: DifferenceCode; reason: string } | null

function describeDifference(goal: ObservedRun, actual: ObservedRun, options: JudgeOptions): Difference {
  if (goal.trigger !== actual.trigger) {
    return goal.trigger === 'click'
      ? { code: 'needs-click-trigger', reason: '这一关要等你点到角色才开始，用“被点击时”开头。' }
      : { code: 'needs-start-trigger', reason: '这一关按“运行”就要开始，用“开始时”开头。' }
  }
  if (goal.scene !== actual.scene) {
    return goal.scene === 'meadow'
      ? { code: 'missing-scene-switch', reason: '目标是来到草地，故事还停在森林里。' }
      : { code: 'extra-scene-switch', reason: '这一关还不用换场景，先留在森林。' }
  }
  if (goal.sceneSwitchAt !== actual.sceneSwitchAt) {
    return {
      code: (actual.sceneSwitchAt ?? 0) < (goal.sceneSwitchAt ?? 0) ? 'scene-switch-early' : 'scene-switch-late',
      reason: `先在森林走 ${goal.sceneSwitchAt} 步，再换到草地；实际走了 ${actual.sceneSwitchAt} 步才换。`,
    }
  }
  if (goal.position !== actual.position) {
    return {
      code: actual.position < goal.position ? 'too-few-moves' : 'too-many-moves',
      reason: `目标：一共移动 ${goal.position} 步；实际：移动了 ${actual.position} 步。检查移动积木和重复积木的数量。`,
    }
  }
  if (goal.message !== actual.message) {
    if (goal.message === null) return { code: 'extra-say', reason: '这一关还不用说话，先把说话积木拿走。' }
    if (actual.message === null) return { code: 'missing-say', reason: `角色要说出“${goal.message}”，现在还没有说话。` }
    const accepted = options.acceptedLines?.includes(goal.message) && options.acceptedLines.includes(actual.message)
    if (!accepted) return { code: 'wrong-line', reason: `角色要说出“${goal.message}”，现在说的是“${actual.message}”。` }
  }
  if (goal.messageAt !== actual.messageAt && goal.messageAt !== null && actual.messageAt !== null) {
    if (options.sayAnyTimeAfterMove && actual.messageAt > 0 && actual.messageAt <= actual.position) return null
    return {
      code: options.sayAnyTimeAfterMove
        ? 'say-too-early'
        : actual.messageAt < goal.messageAt ? 'say-too-early' : 'say-too-late',
      reason: options.sayAnyTimeAfterMove
        ? '说话的时机不对：要先动起来，再说话。'
        : `说话的时机不对：要在移动 ${goal.messageAt} 步时说，实际是在 ${actual.messageAt} 步时说。`,
    }
  }
  return null
}

export function evaluateObservable(
  referenceBlockTypes: string[],
  blocks: ProgramBlock[],
  options: JudgeOptions = {},
): ObservableVerdict {
  const reference = simulateProgram(referenceBlockTypes.map((type) => ({ type })))
  if (!reference.ok) return { passed: false, goal: null, actual: null, reason: '这一关的目标还没有配置好。', code: 'goal-misconfigured' }
  const actual = simulateProgram(blocks)
  if (!actual.ok) return { passed: false, goal: reference.observed, actual: null, reason: actual.reason, code: actual.code }
  const difference = describeDifference(reference.observed, actual.observed, options)
  return difference
    ? { passed: false, goal: reference.observed, actual: actual.observed, reason: difference.reason, code: difference.code }
    : { passed: true, goal: reference.observed, actual: actual.observed, reason: '', code: null }
}
