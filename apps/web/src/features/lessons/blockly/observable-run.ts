/**
 * SYS-103: Blockly steps (lessons 01–09, single actor) are judged by what the program
 * observably does on stage — trigger, distance walked, scene, where the switch happened,
 * what was said and where — not by matching one exact block sequence.
 *
 * The goal of a step is the observed result of its reference program (requiredBlockTypes),
 * so equivalent programs pass (e.g. "move, move" == "move, repeat"), counter-examples fail,
 * and a program that cannot run never earns completion.
 */
export type ProgramBlock = { type: string; disconnected?: boolean }

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

export type SimulationResult = { ok: true; observed: ObservedRun } | { ok: false; reason: string }

export function simulateProgram(blocks: ProgramBlock[]): SimulationResult {
  if (blocks.length === 0) return { ok: false, reason: '舞台上还没有积木，先放“开始时”。' }
  if (blocks.length > MAX_PROGRAM_BLOCKS) return { ok: false, reason: `一次最多运行 ${MAX_PROGRAM_BLOCKS} 块积木。` }
  if (blocks.some((block) => block.disconnected)) return { ok: false, reason: '有积木没有接在“开始时”下面。请把动作连成一条程序再运行。' }
  const hat = blocks[0].type
  if (hat !== 'when_start' && hat !== 'when_clicked') return { ok: false, reason: '请把“开始时”放在最前面，告诉朋友什么时候行动。' }

  const observed: ObservedRun = { trigger: hat === 'when_clicked' ? 'click' : 'start', position: 0, scene: 'forest', sceneSwitchAt: null, message: null, messageAt: null }
  let moved = false
  for (const block of blocks.slice(1)) {
    switch (block.type) {
      case 'move_right':
        observed.position += STEP_DISTANCE
        moved = true
        break
      case 'repeat_twice':
        if (!moved) return { ok: false, reason: '“再做一次”前面还没有动作可以重复，先接一个移动积木。' }
        observed.position += STEP_DISTANCE
        break
      case 'switch_scene':
        if (observed.scene === 'meadow') return { ok: false, reason: '已经在草地了，再切换一次不会有新场景。' }
        observed.scene = 'meadow'
        observed.sceneSwitchAt = observed.position
        break
      case 'say_line':
        observed.message = observed.scene === 'meadow' ? '我到草地啦！' : observed.trigger === 'click' ? '蝴蝶收到你的点击啦！' : '你好！'
        observed.messageAt = observed.position
        break
      default:
        return { ok: false, reason: block.type === 'when_start' || block.type === 'when_clicked' ? '一条程序只要一个开始积木，把多余的拿走吧。' : '这块积木还不能在本课执行。' }
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
}

function describeDifference(goal: ObservedRun, actual: ObservedRun): string {
  if (goal.trigger !== actual.trigger) {
    return goal.trigger === 'click' ? '这一步要等你点到角色才开始，用“被点击时”开头。' : '这一步按“运行”就要开始，用“开始时”开头。'
  }
  if (goal.scene !== actual.scene) {
    return goal.scene === 'meadow' ? '目标是来到草地，故事还停在森林里。' : '这一步还不用换场景，先留在森林。'
  }
  if (goal.sceneSwitchAt !== actual.sceneSwitchAt) {
    return `先在森林走 ${goal.sceneSwitchAt} 步，再换到草地；实际走了 ${actual.sceneSwitchAt} 步才换。`
  }
  if (goal.position !== actual.position) {
    return `目标：一共走 ${goal.position} 步；实际：走了 ${actual.position} 步。检查移动和“再做一次”的数量。`
  }
  if (goal.message !== actual.message) {
    return goal.message === null ? '这一步还不用说话，先把说话积木拿走。' : `角色要说出“${goal.message}”，现在${actual.message ? `说的是“${actual.message}”` : '还没有说话'}。`
  }
  if (goal.messageAt !== actual.messageAt) {
    return `说话的时机不对：要在走完 ${goal.messageAt} 步时说，实际是在 ${actual.messageAt} 步时说。`
  }
  return ''
}

export function evaluateObservable(referenceBlockTypes: string[], blocks: ProgramBlock[]): ObservableVerdict {
  const reference = simulateProgram(referenceBlockTypes.map((type) => ({ type })))
  if (!reference.ok) return { passed: false, goal: null, actual: null, reason: '这一步的目标还没有配置好。' }
  const actual = simulateProgram(blocks)
  if (!actual.ok) return { passed: false, goal: reference.observed, actual: null, reason: actual.reason }
  const reason = describeDifference(reference.observed, actual.observed)
  return { passed: reason === '', goal: reference.observed, actual: actual.observed, reason }
}
